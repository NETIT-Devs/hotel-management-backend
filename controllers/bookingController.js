const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { evaluatePromoCode } = require('./promoController');
const { evaluateChildPolicy, normalizeChildAges } = require('../utils/childPolicy');

// Helper to normalize any date string to YYYY-MM-DD
const normalizeDate = (val) => {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Create a new booking
exports.createBooking = async (req, res) => {
  let connection;

  try {
    const rawRoomId = req.body.roomId || req.body.room_id || req.body.room?.id;
    const rawCheckIn = req.body.checkIn || req.body.check_in || req.body.checkInDate;
    const rawCheckOut = req.body.checkOut || req.body.check_out || req.body.checkOutDate;
    
    const adults = Number(req.body.adults ?? 1);
    const children = Number(req.body.children ?? 0);
    const rawChildAges = req.body.child_ages || req.body.childAges || [];
    const normalizedChildAges = normalizeChildAges(rawChildAges);
    const guests = Number(req.body.guests ?? (adults + children));
    const roomsCount = Number(req.body.roomsCount ?? req.body.rooms_count ?? 1);

    const guestFirstName = (req.body.guest_first_name || req.body.guest?.firstName || req.body.firstName || '').trim();
    const guestLastName = (req.body.guest_last_name || req.body.guest?.lastName || req.body.lastName || '').trim();
    const guestEmail = (req.body.guest_email || req.body.guest?.email || req.body.email || '').trim().toLowerCase();
    const guestPhone = (req.body.guest_phone || req.body.guest?.phone || req.body.phone || '').trim();
    const specialRequests = req.body.special_requests || req.body.specialRequests || null;
    const residency = req.body.residency === 'Resident' ? 'Resident' : 'Non-Resident';
    const guestIdNumber = (req.body.guest_id_number || req.body.guestIdNumber || '').trim() || null;
    const rawPromoCode = (req.body.promo_code || req.body.promoCode || '').trim().toUpperCase() || null;
    let paymentMethod = (req.body.payment_method || req.body.paymentMethod || 'PAY_AT_HOTEL').toUpperCase();
    if (paymentMethod === 'HOTEL') paymentMethod = 'PAY_AT_HOTEL';

    const checkIn = normalizeDate(rawCheckIn);
    const checkOut = normalizeDate(rawCheckOut);

    // Required fields
    if (!rawRoomId || !checkIn || !checkOut || guests < 1) {
      return res.status(400).json({
        message: 'Valid Room, check-in, check-out and guests are required.',
      });
    }

    const roomId = Number(rawRoomId);
    if (!Number.isInteger(roomId) || roomId < 1 || roomsCount < 1) {
      return res.status(400).json({
        message: 'Invalid room ID or room count.',
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    if (checkIn < today) {
      return res.status(400).json({
        message: 'Check-in date cannot be in the past.',
      });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({
        message: 'Check-out date must be after check-in date.',
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Determine user_id: either from JWT or find/create from guest info
    let userId = req.user?.id;
    if (!userId) {
      const emailToUse = guestEmail || `guest_${Date.now()}@serenitybay.local`;
      const [existingUsers] = await connection.execute(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [emailToUse]
      );

      if (existingUsers.length > 0) {
        userId = existingUsers[0].id;
      } else {
        const guestFullName = `${guestFirstName} ${guestLastName}`.trim() || 'Guest Customer';
        const defaultPasswordHash = await bcrypt.hash('GuestPass123!', 10);
        const [userResult] = await connection.execute(
          `INSERT INTO users (full_name, email, phone, password_hash, role, is_active)
           VALUES (?, ?, ?, ?, 'CUSTOMER', 1)`,
          [guestFullName, emailToUse, guestPhone || null, defaultPasswordHash]
        );
        userId = userResult.insertId;
      }
    }

    /*
      Lock the room category row.
      This prevents simultaneous booking requests from exceeding inventory.
    */
    const [rooms] = await connection.execute(
      `SELECT id, price_per_night, resident_price_per_night, child_extra_bed_price, resident_child_extra_bed_price, capacity, status, total_units
       FROM rooms
       WHERE id = ?
       FOR UPDATE`,
      [roomId]
    );

    if (rooms.length === 0 || rooms[0].status !== 'ACTIVE') {
      await connection.rollback();

      return res.status(404).json({
        message: 'Room not found or currently unavailable.',
      });
    }

    const room = rooms[0];
    const totalUnits = Number(room.total_units || 10);

    if (roomsCount > totalUnits) {
      await connection.rollback();

      return res.status(400).json({
        message: `Only ${totalUnits} rooms are available in this category.`,
      });
    }

    // Validate guest occupancy using real luxury hotel Child Bedding Policy:
    // - Infants (Under 1 - 2 yrs) stay free in a complimentary baby cot and do not consume adult bed capacity.
    // - Up to 1 child (aged 3 - 11) per room can share existing bedding or use an extra rollaway bed.
    const totalCapacity = Number(room.capacity || 2) * roomsCount;
    const prePolicy = evaluateChildPolicy({
      childAges: normalizedChildAges,
      nights: 1,
      residency,
    });
    const nonInfantGuests = Math.max(adults, guests - prePolicy.infantCount);
    const maxOccupancyWithChildBedding =
      children > 0 ? totalCapacity + roomsCount : totalCapacity;

    if (adults > totalCapacity || nonInfantGuests > maxOccupancyWithChildBedding) {
      await connection.rollback();

      return res.status(400).json({
        message: `The selected ${roomsCount} room(s) can accommodate up to ${totalCapacity} adult guests (plus complimentary infants / up to ${roomsCount} child extra bed).`,
      });
    }

    /*
      Count rooms already requested/booked for overlapping dates.
    */
    const [bookingRows] = await connection.execute(
      `SELECT COALESCE(SUM(rooms_count), 0) AS booked_units
       FROM bookings
       WHERE room_id = ?
         AND status IN ('PENDING', 'APPROVED')
         AND check_in < ?
         AND check_out > ?`,
      [roomId, checkOut, checkIn]
    );

    const bookedUnits = Number(bookingRows[0].booked_units);
    const availableUnits = totalUnits - bookedUnits;

    if (roomsCount > availableUnits) {
      await connection.rollback();

      return res.status(409).json({
        message: `Only ${availableUnits} room(s) are available for the selected dates.`,
        availableRooms: availableUnits,
      });
    }

    // Calculate nights and total price
    const checkInDate = new Date(`${checkIn}T00:00:00Z`);
    const checkOutDate = new Date(`${checkOut}T00:00:00Z`);

    const nights = Math.max(
      1,
      Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))
    );

    const nightlyRate =
      residency === 'Resident' && Number(room.resident_price_per_night) > 0
        ? Number(room.resident_price_per_night)
        : Number(room.price_per_night);

    // Evaluate per-room Child Age & Extra Rollaway Bed Supplement from DB rates (6-11 yrs only; 0-5 yrs stay free)
    const childPolicy = evaluateChildPolicy({
      childAges: normalizedChildAges,
      nights,
      residency,
      childExtraBedPrice: room.child_extra_bed_price,
      residentChildExtraBedPrice: room.resident_child_extra_bed_price,
    });
    const childSupplement = childPolicy.childSupplementTotal;

    const offerDiscount = Math.max(0, Number(req.body.offer_discount) || 0);
    const baseRoomSubtotal = Math.max(0, nightlyRate * nights * roomsCount - offerDiscount);
    const staySubtotalWithBedding = Math.round((baseRoomSubtotal + childSupplement) * 100) / 100;
    let appliedPromoCode = null;
    let promoDiscountAmt = 0;

    if (rawPromoCode) {
      const promoCheck = await evaluatePromoCode(connection, {
        code: rawPromoCode,
        subtotal: staySubtotalWithBedding,
        nights,
        roomId,
        residency,
      });

      if (!promoCheck.valid) {
        await connection.rollback();
        return res.status(400).json({
          message: promoCheck.message,
        });
      }

      appliedPromoCode = promoCheck.promo.code;
      promoDiscountAmt = Number(promoCheck.discountAmount) || 0;

      await connection.execute(
        'UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?',
        [promoCheck.promo.id]
      );
    }

    const discountAmount = Math.round((offerDiscount + promoDiscountAmt) * 100) / 100;
    const taxesAndFees = Math.round(staySubtotalWithBedding * 0.15);
    const serverTotal = Math.max(0, staySubtotalWithBedding + taxesAndFees - promoDiscountAmt).toFixed(2);
    const totalPrice = req.body.totalAmount || req.body.total_price || serverTotal;

    // Insert booking as PENDING with all guest & child bedding details
    const [result] = await connection.execute(
      `INSERT INTO bookings
       (user_id, room_id, check_in, check_out, guests, adults, children, child_ages, child_supplement, rooms_count, total_price, status,
        special_requests, payment_method, guest_first_name, guest_last_name, guest_email, guest_phone, residency, guest_id_number, promo_code, discount_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        roomId,
        checkIn,
        checkOut,
        guests,
        adults,
        children,
        childPolicy.normalizedAges.length > 0 ? JSON.stringify(childPolicy.normalizedAges) : null,
        childSupplement,
        roomsCount,
        totalPrice,
        specialRequests,
        paymentMethod,
        guestFirstName || null,
        guestLastName || null,
        guestEmail || null,
        guestPhone || null,
        residency,
        guestIdNumber,
        appliedPromoCode,
        discountAmount,
      ]
    );

    await connection.commit();

    return res.status(201).json({
      message: 'Booking request submitted successfully. Waiting for admin approval.',
      booking: {
        id: result.insertId,
        userId,
        roomId,
        checkIn,
        checkOut,
        guests,
        adults,
        children,
        child_ages: childPolicy.normalizedAges,
        child_supplement: childSupplement,
        roomsCount,
        nights,
        totalPrice,
        status: 'PENDING',
        paymentMethod,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Create booking error:', error.message);

    return res.status(500).json({
      message: 'Failed to create booking. ' + error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};


// Get bookings belonging to the logged-in customer
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const [bookings] = await pool.execute(
      `SELECT
          b.id,
          b.room_id,
          r.room_name,
          r.room_type,
          r.image_url,
          r.bed_type,
          r.size_sqm,
          r.view_type,
          b.check_in,
          b.check_out,
          b.guests,
          b.adults,
          b.children,
          b.child_ages,
          b.child_supplement,
          b.rooms_count,
          b.total_price,
          b.status,
          b.payment_method,
          b.special_requests,
          b.guest_first_name,
          b.guest_last_name,
          b.guest_email,
          b.guest_phone,
          b.residency,
          b.guest_id_number,
          b.admin_note,
          b.created_at
       FROM bookings b
       INNER JOIN rooms r ON b.room_id = r.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      message: 'Your bookings retrieved successfully.',
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('Get my bookings error:', error.message);

    return res.status(500).json({
      message: 'Failed to retrieve bookings.',
    });
  }
};

// Cancel a customer's own booking
exports.cancelMyBooking = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId) || bookingId < 1) {
      return res.status(400).json({ message: 'Invalid booking ID.' });
    }

    const [rows] = await pool.execute(
      `SELECT id, user_id, status FROM bookings WHERE id = ? LIMIT 1`,
      [bookingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only cancel your own bookings.' });
    }

    if (rows[0].status === 'REJECTED') {
      return res.status(400).json({ message: 'This booking is already cancelled.' });
    }

    await pool.execute(
      `UPDATE bookings SET status = 'REJECTED', admin_note = 'Cancelled by Guest' WHERE id = ?`,
      [bookingId]
    );

    return res.status(200).json({
      success: true,
      message: 'Your booking has been cancelled.',
    });
  } catch (error) {
    console.error('Cancel my booking error:', error.message);
    return res.status(500).json({ message: 'Failed to cancel booking.' });
  }
};

// Public lookup by Booking Reference ID + Guest Email (for non-logged-in guests)
exports.lookupBooking = async (req, res) => {
  try {
    const rawId = String(req.query.bookingId || '').replace(/[^0-9]/g, '');
    const bookingId = Number(rawId);
    const email = String(req.query.email || '').trim().toLowerCase();

    if (!Number.isInteger(bookingId) || bookingId < 1 || !email) {
      return res.status(400).json({
        message: 'Please provide a valid Booking Reference ID and Email.',
      });
    }

    const [bookings] = await pool.execute(
      `SELECT
          b.id,
          b.room_id,
          r.room_name,
          r.room_type,
          r.image_url,
          r.bed_type,
          r.size_sqm,
          r.view_type,
          b.check_in,
          b.check_out,
          b.guests,
          b.adults,
          b.children,
          b.child_ages,
          b.child_supplement,
          b.rooms_count,
          b.total_price,
          b.status,
          b.payment_method,
          b.special_requests,
          b.guest_first_name,
          b.guest_last_name,
          b.guest_email,
          b.guest_phone,
          b.residency,
          b.guest_id_number,
          b.admin_note,
          b.created_at
       FROM bookings b
       INNER JOIN rooms r ON b.room_id = r.id
       INNER JOIN users u ON b.user_id = u.id
       WHERE b.id = ? AND (LOWER(b.guest_email) = ? OR LOWER(u.email) = ?)
       LIMIT 1`,
      [bookingId, email, email]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        message: 'No booking found matching that Reference ID and Email.',
      });
    }

    return res.status(200).json({
      booking: bookings[0],
    });
  } catch (error) {
    console.error('Lookup booking error:', error.message);
    return res.status(500).json({ message: 'Failed to look up booking.' });
  }
};


// Get all bookings (Admin / Super Admin)
exports.getAllBookings = async (req, res) => {
  try {
    const [bookings] = await pool.execute(
      `SELECT
          b.id,
          b.user_id,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', b.guest_first_name, b.guest_last_name)), ''),
            u.full_name
          ) AS guest_name,
          COALESCE(b.guest_first_name, '') AS guest_first_name,
          COALESCE(b.guest_last_name, '') AS guest_last_name,
          COALESCE(b.guest_email, u.email) AS guest_email,
          COALESCE(b.guest_phone, u.phone) AS guest_phone,
          u.full_name,
          u.email,
          u.phone,
          b.room_id,
          r.room_name,
          r.room_type,
          r.price_per_night,
          b.check_in,
          b.check_out,
          b.guests,
          b.adults,
          b.children,
          b.child_ages,
          b.child_supplement,
          b.rooms_count,
          b.total_price,
          b.status,
          b.payment_method,
          b.special_requests,
          b.admin_note,
          b.created_at
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN rooms r ON b.room_id = r.id
       ORDER BY b.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      message: 'All bookings retrieved successfully.',
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('Get all bookings error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve bookings.',
    });
  }
};


// Approve or reject booking (Admin / Super Admin)
exports.updateBookingStatus = async (req, res) => {
  let connection;

  try {
    const bookingId = Number(req.params.id);
    const { status, adminNote } = req.body;

    if (!Number.isInteger(bookingId) || bookingId < 1) {
      return res.status(400).json({
        message: 'Invalid booking ID.',
      });
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        message: 'Status must be APPROVED or REJECTED.',
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lock the booking
    const [bookings] = await connection.execute(
      `SELECT
          id,
          room_id,
          check_in,
          check_out,
          rooms_count,
          status
       FROM bookings
       WHERE id = ?
       FOR UPDATE`,
      [bookingId]
    );

    if (bookings.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: 'Booking not found.',
      });
    }

    const booking = bookings[0];

    if (booking.status !== 'PENDING') {
      await connection.rollback();

      return res.status(409).json({
        message: 'Only pending bookings can be approved or rejected.',
      });
    }

    // Before approval, lock the room category row
    if (status === 'APPROVED') {
      const [rooms] = await connection.execute(
        `SELECT id, total_units
         FROM rooms
         WHERE id = ?
         FOR UPDATE`,
        [booking.room_id]
      );

      if (rooms.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message: 'Room type not found.',
        });
      }

      const totalUnits = Number(rooms[0].total_units);

      // Count other approved bookings overlapping these dates
      const [bookingRows] = await connection.execute(
        `SELECT COALESCE(SUM(rooms_count), 0) AS booked_units
         FROM bookings
         WHERE room_id = ?
           AND id != ?
           AND status = 'APPROVED'
           AND check_in < ?
           AND check_out > ?`,
        [
          booking.room_id,
          bookingId,
          booking.check_out,
          booking.check_in,
        ]
      );

      const approvedUnits = Number(bookingRows[0].booked_units);
      const availableUnits = totalUnits - approvedUnits;
      const requestedUnits = Number(booking.rooms_count || 1);

      if (requestedUnits > availableUnits) {
        await connection.rollback();

        return res.status(409).json({
          message: `Cannot approve this booking. Only ${availableUnits} room(s) remain available for these dates.`,
          availableRooms: availableUnits,
        });
      }
    }

    const cleanedAdminNote =
      typeof adminNote === 'string' ? adminNote.trim() || null : null;

    await connection.execute(
      `UPDATE bookings
       SET status = ?, admin_note = ?
       WHERE id = ?`,
      [status, cleanedAdminNote, bookingId]
    );

    await connection.commit();

    return res.status(200).json({
      message: `Booking ${status.toLowerCase()} successfully.`,
      booking: {
        id: bookingId,
        status,
        adminNote: cleanedAdminNote,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Update booking status error:', error.message);

    return res.status(500).json({
      message: 'Failed to update booking status.',
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Full Update Booking (Admin / Super Admin)
exports.updateBooking = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId) || bookingId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const {
      roomId,
      room_id,
      checkIn,
      check_in,
      checkOut,
      check_out,
      guests,
      adults,
      children,
      roomsCount,
      rooms_count,
      totalPrice,
      total_price,
      status,
      paymentMethod,
      payment_method,
      specialRequests,
      special_requests,
      guestFirstName,
      guest_first_name,
      guestLastName,
      guest_last_name,
      guestEmail,
      guest_email,
      guestPhone,
      guest_phone,
      adminNote,
      admin_note,
    } = req.body;

    const finalRoomId = Number(roomId || room_id);
    const finalCheckIn = normalizeDate(checkIn || check_in);
    const finalCheckOut = normalizeDate(checkOut || check_out);
    const finalAdults = Number(adults ?? 1);
    const finalChildren = Number(children ?? 0);
    const finalGuests = Number(guests ?? (finalAdults + finalChildren));
    const finalRoomsCount = Number(roomsCount ?? rooms_count ?? 1);
    const finalPrice = totalPrice || total_price;
    const finalStatus = status || 'PENDING';
    const finalPayment = paymentMethod || payment_method || 'PAY_AT_HOTEL';
    const finalRequests = specialRequests || special_requests || null;
    const finalFirstName = guestFirstName || guest_first_name || null;
    const finalLastName = guestLastName || guest_last_name || null;
    const finalEmail = guestEmail || guest_email || null;
    const finalPhone = guestPhone || guest_phone || null;
    const finalNote = adminNote || admin_note || null;

    const [result] = await pool.execute(
      `UPDATE bookings
       SET room_id = COALESCE(?, room_id),
           check_in = COALESCE(?, check_in),
           check_out = COALESCE(?, check_out),
           guests = COALESCE(?, guests),
           adults = COALESCE(?, adults),
           children = COALESCE(?, children),
           rooms_count = COALESCE(?, rooms_count),
           total_price = COALESCE(?, total_price),
           status = COALESCE(?, status),
           payment_method = COALESCE(?, payment_method),
           special_requests = ?,
           guest_first_name = COALESCE(?, guest_first_name),
           guest_last_name = COALESCE(?, guest_last_name),
           guest_email = COALESCE(?, guest_email),
           guest_phone = COALESCE(?, guest_phone),
           admin_note = ?
       WHERE id = ?`,
      [
        finalRoomId || null,
        finalCheckIn || null,
        finalCheckOut || null,
        finalGuests || null,
        finalAdults || null,
        finalChildren || null,
        finalRoomsCount || null,
        finalPrice || null,
        finalStatus || null,
        finalPayment || null,
        finalRequests,
        finalFirstName,
        finalLastName,
        finalEmail,
        finalPhone,
        finalNote,
        bookingId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking updated successfully.',
    });
  } catch (error) {
    console.error('Update booking error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update booking. ' + error.message,
    });
  }
};

// Delete Booking (Admin / Super Admin)
exports.deleteBooking = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId) || bookingId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const [result] = await pool.execute(
      'DELETE FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking deleted successfully.',
    });
  } catch (error) {
    console.error('Delete booking error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete booking.',
    });
  }
};