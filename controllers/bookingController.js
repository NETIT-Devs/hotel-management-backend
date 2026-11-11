const pool = require('../config/db');

// Create a new booking
exports.createBooking = async (req, res) => {
  let connection;

  try {
    const { roomId, checkIn, checkOut, guests } = req.body;
    const roomsCount = Number(req.body.roomsCount ?? 1);
    const userId = req.user.id;

    // Required fields
    if (!roomId || !checkIn || !checkOut || !guests) {
      return res.status(400).json({
        message: 'Room, check-in, check-out and guests are required.',
      });
    }

    // Validate numbers
    if (
      !Number.isInteger(Number(roomId)) ||
      Number(roomId) < 1 ||
      !Number.isInteger(Number(guests)) ||
      Number(guests) < 1 ||
      !Number.isInteger(roomsCount) ||
      roomsCount < 1
    ) {
      return res.status(400).json({
        message: 'Invalid room ID, guest count or rooms count.',
      });
    }

    // Validate date format
    const isValidDate = (date) =>
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

    if (!isValidDate(checkIn) || !isValidDate(checkOut)) {
      return res.status(400).json({
        message: 'Please provide valid dates in YYYY-MM-DD format.',
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    if (checkIn <= today) {
      return res.status(400).json({
        message: 'Check-in date must be in the future.',
      });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({
        message: 'Check-out must be after check-in.',
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    /*
      Lock the room category row.
      This prevents simultaneous booking requests from exceeding inventory.
    */
    const [rooms] = await connection.execute(
      `SELECT id, price_per_night, capacity, status, total_units
       FROM rooms
       WHERE id = ?
       FOR UPDATE`,
      [Number(roomId)]
    );

    if (rooms.length === 0 || rooms[0].status !== 'ACTIVE') {
      await connection.rollback();

      return res.status(404).json({
        message: 'Room not found or unavailable.',
      });
    }

    const room = rooms[0];
    const totalUnits = Number(room.total_units);

    if (roomsCount > totalUnits) {
      await connection.rollback();

      return res.status(400).json({
        message: `Only ${totalUnits} rooms are available in this room type.`,
      });
    }

    // Validate guest capacity for the selected number of rooms
    const totalCapacity = Number(room.capacity) * roomsCount;

    if (Number(guests) > totalCapacity) {
      await connection.rollback();

      return res.status(400).json({
        message: `The selected ${roomsCount} room(s) can accommodate up to ${totalCapacity} guests.`,
      });
    }

    /*
      Count rooms already requested/booked for overlapping dates.
      PENDING bookings temporarily reserve inventory too.
    */
    const [bookingRows] = await connection.execute(
      `SELECT COALESCE(SUM(rooms_count), 0) AS booked_units
       FROM bookings
       WHERE room_id = ?
         AND status IN ('PENDING', 'APPROVED')
         AND check_in < ?
         AND check_out > ?`,
      [Number(roomId), checkOut, checkIn]
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

    const nights = Math.round(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)
    );

    const totalPrice = (
      Number(room.price_per_night) * nights * roomsCount
    ).toFixed(2);

    // Insert booking as PENDING
    const [result] = await connection.execute(
      `INSERT INTO bookings
       (user_id, room_id, check_in, check_out, guests, rooms_count, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        userId,
        Number(roomId),
        checkIn,
        checkOut,
        Number(guests),
        roomsCount,
        totalPrice,
      ]
    );

    await connection.commit();

    return res.status(201).json({
      message:
        'Booking request submitted successfully. Waiting for admin approval.',
      booking: {
        id: result.insertId,
        userId,
        roomId: Number(roomId),
        checkIn,
        checkOut,
        guests: Number(guests),
        roomsCount,
        nights,
        totalPrice,
        status: 'PENDING',
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Create booking error:', error.message);

    return res.status(500).json({
      message: 'Failed to create booking.',
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
          b.check_in,
          b.check_out,
          b.guests,
          b.rooms_count,
          b.total_price,
          b.status,
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


// Get all bookings (Admin / Super Admin)
exports.getAllBookings = async (req, res) => {
  try {
    const [bookings] = await pool.execute(
      `SELECT
          b.id,
          b.user_id,
          u.full_name,
          u.email,
          u.phone,
          b.room_id,
          r.room_name,
          r.room_type,
          b.check_in,
          b.check_out,
          b.guests,
          b.rooms_count,
          b.total_price,
          b.status,
          b.admin_note,
          b.created_at
       FROM bookings b
       INNER JOIN users u ON b.user_id = u.id
       INNER JOIN rooms r ON b.room_id = r.id
       ORDER BY b.created_at DESC`
    );

    return res.status(200).json({
      message: 'All bookings retrieved successfully.',
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('Get all bookings error:', error.message);

    return res.status(500).json({
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