/**
 * Facility & Facility Reservation Controller
 * Handles real-world luxury hotel facility management:
 *  - Public catalog retrieval (Complimentary, Reservable, Event Inquiry tiers)
 *  - Guest appointment/table reservations & event proposal inquiries
 *  - Customer self-service reservation listing & cancellation
 *  - Admin CRUD for facilities and guest reservation/inquiry workflow management
 */
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Safely parses JSON columns stored in MySQL (handles both pre-parsed arrays and JSON strings).
 *
 * @param {any} value - Raw DB column value
 * @returns {Array} Normalized array
 */
const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Normalizes a database row from `facilities` into a clean API response object.
 *
 * @param {object} row - Raw MySQL row
 * @returns {object} Normalized facility object
 */
const normalizeFacility = (row) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  booking_type: row.booking_type || 'COMPLIMENTARY',
  badge: row.badge || 'SIGNATURE EXPERIENCE',
  hours: row.hours || '08:00 AM – 09:00 PM',
  location: row.location || 'Main Resort Wing',
  access_note: row.access_note || 'Complimentary for In-House Guests',
  price_label: row.price_label || 'Complimentary',
  base_price: Number(row.base_price) || 0,
  max_guests: Number(row.max_guests) || 10,
  time_slots: parseJsonArray(row.time_slots),
  service_options: parseJsonArray(row.service_options),
  highlights: parseJsonArray(row.highlights),
  image_url: row.image_url || '',
  image: row.image_url || '',
  description: row.description || '',
  status: row.status || 'OPEN',
  created_at: row.created_at,
  updated_at: row.updated_at,
});

/**
 * Extracts authenticated user ID from Authorization header if provided (non-blocking).
 *
 * @param {import('express').Request} req
 * @returns {number|null} User ID or null
 */
const extractOptionalUserId = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || !process.env.JWT_SECRET) {
      return null;
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id ? Number(decoded.id) : null;
  } catch {
    return null;
  }
};

/**
 * Generates a unique, human-readable facility reservation/inquiry reference code.
 * Example: FAC-2026-48291
 *
 * @param {'RESERVATION'|'INQUIRY'} requestType
 * @returns {string}
 */
const generateReferenceCode = (requestType) => {
  const year = new Date().getFullYear();
  const prefix = requestType === 'INQUIRY' ? 'EVT' : 'FAC';
  const rand = String(Math.floor(10000 + Math.random() * 90000));
  return `${prefix}-${year}-${rand}`;
};

// ============================================================================
// PUBLIC & ADMIN FACILITY CATALOG ENDPOINTS
// ============================================================================

/**
 * GET /api/facilities
 * Returns all resort facilities (optionally filtered by `?status=OPEN`).
 */
const getAllFacilities = async (req, res) => {
  try {
    const { status } = req.query;
    const params = [];
    let sql = 'SELECT * FROM facilities';
    if (status && ['OPEN', 'MAINTENANCE'].includes(String(status).toUpperCase())) {
      sql += ' WHERE status = ?';
      params.push(String(status).toUpperCase());
    }
    sql += ' ORDER BY id ASC';

    const [rows] = await pool.query(sql, params);
    return res.json({
      facilities: rows.map(normalizeFacility),
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    return res.status(500).json({ message: 'Failed to load resort facilities.' });
  }
};

/**
 * POST /api/facilities (Admin)
 * Creates a new resort facility with booking mode, pricing, time slots, and options.
 */
const createFacility = async (req, res) => {
  try {
    const {
      title,
      category = 'SPA & WELLNESS',
      booking_type = 'COMPLIMENTARY',
      badge = 'SIGNATURE EXPERIENCE',
      hours = '08:00 AM – 09:00 PM',
      location = 'Main Resort Wing',
      access_note = 'Complimentary for In-House Guests',
      price_label = 'Complimentary',
      base_price = 0,
      max_guests = 10,
      time_slots = [],
      service_options = [],
      highlights = [],
      image_url = '',
      image = '',
      description = '',
      status = 'OPEN',
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Facility title is required.' });
    }

    const validBookingType = ['COMPLIMENTARY', 'RESERVABLE', 'INQUIRY'].includes(
      String(booking_type).toUpperCase()
    )
      ? String(booking_type).toUpperCase()
      : 'COMPLIMENTARY';

    const validStatus = ['OPEN', 'MAINTENANCE'].includes(String(status).toUpperCase())
      ? String(status).toUpperCase()
      : 'OPEN';

    const resolvedImage = image_url || image || '';

    const [result] = await pool.query(
      `INSERT INTO facilities (
        title, category, booking_type, badge, hours, location,
        access_note, price_label, base_price, max_guests,
        time_slots, service_options, highlights, image_url, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(title).trim(),
        String(category).trim().toUpperCase(),
        validBookingType,
        String(badge).trim(),
        String(hours).trim(),
        String(location).trim(),
        String(access_note).trim(),
        String(price_label).trim(),
        Math.max(0, Number(base_price) || 0),
        Math.max(1, Number(max_guests) || 10),
        JSON.stringify(Array.isArray(time_slots) ? time_slots : []),
        JSON.stringify(Array.isArray(service_options) ? service_options : []),
        JSON.stringify(Array.isArray(highlights) ? highlights : []),
        resolvedImage,
        String(description).trim(),
        validStatus,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM facilities WHERE id = ?', [result.insertId]);
    return res.status(201).json({
      message: 'Resort facility created successfully.',
      facility: normalizeFacility(rows[0]),
    });
  } catch (error) {
    console.error('Error creating facility:', error);
    return res.status(500).json({ message: 'Failed to create resort facility.' });
  }
};

/**
 * PUT /api/facilities/:id (Admin)
 * Updates an existing resort facility record.
 */
const updateFacility = async (req, res) => {
  try {
    const facilityId = Number(req.params.id);
    if (!facilityId) {
      return res.status(400).json({ message: 'Invalid facility ID.' });
    }

    const [existingRows] = await pool.query('SELECT * FROM facilities WHERE id = ?', [facilityId]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Facility not found.' });
    }

    const current = normalizeFacility(existingRows[0]);
    const {
      title = current.title,
      category = current.category,
      booking_type = current.booking_type,
      badge = current.badge,
      hours = current.hours,
      location = current.location,
      access_note = current.access_note,
      price_label = current.price_label,
      base_price = current.base_price,
      max_guests = current.max_guests,
      time_slots = current.time_slots,
      service_options = current.service_options,
      highlights = current.highlights,
      image_url,
      image,
      description = current.description,
      status = current.status,
    } = req.body;

    const validBookingType = ['COMPLIMENTARY', 'RESERVABLE', 'INQUIRY'].includes(
      String(booking_type).toUpperCase()
    )
      ? String(booking_type).toUpperCase()
      : current.booking_type;

    const validStatus = ['OPEN', 'MAINTENANCE'].includes(String(status).toUpperCase())
      ? String(status).toUpperCase()
      : current.status;

    const resolvedImage =
      image_url !== undefined ? image_url : image !== undefined ? image : current.image_url;

    await pool.query(
      `UPDATE facilities SET
        title = ?, category = ?, booking_type = ?, badge = ?, hours = ?, location = ?,
        access_note = ?, price_label = ?, base_price = ?, max_guests = ?,
        time_slots = ?, service_options = ?, highlights = ?, image_url = ?, description = ?, status = ?
      WHERE id = ?`,
      [
        String(title).trim(),
        String(category).trim().toUpperCase(),
        validBookingType,
        String(badge).trim(),
        String(hours).trim(),
        String(location).trim(),
        String(access_note).trim(),
        String(price_label).trim(),
        Math.max(0, Number(base_price) || 0),
        Math.max(1, Number(max_guests) || 10),
        JSON.stringify(Array.isArray(time_slots) ? time_slots : []),
        JSON.stringify(Array.isArray(service_options) ? service_options : []),
        JSON.stringify(Array.isArray(highlights) ? highlights : []),
        resolvedImage,
        String(description).trim(),
        validStatus,
        facilityId,
      ]
    );

    const [updatedRows] = await pool.query('SELECT * FROM facilities WHERE id = ?', [facilityId]);
    return res.json({
      message: 'Facility updated successfully.',
      facility: normalizeFacility(updatedRows[0]),
    });
  } catch (error) {
    console.error('Error updating facility:', error);
    return res.status(500).json({ message: 'Failed to update facility.' });
  }
};

/**
 * PATCH /api/facilities/:id/status (Admin)
 * Toggles facility operational status between OPEN and MAINTENANCE.
 */
const toggleFacilityStatus = async (req, res) => {
  try {
    const facilityId = Number(req.params.id);
    const { status } = req.body;
    const nextStatus = String(status || '').toUpperCase();

    if (!['OPEN', 'MAINTENANCE'].includes(nextStatus)) {
      return res.status(400).json({ message: 'Status must be OPEN or MAINTENANCE.' });
    }

    const [result] = await pool.query('UPDATE facilities SET status = ? WHERE id = ?', [
      nextStatus,
      facilityId,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Facility not found.' });
    }

    return res.json({ message: `Facility marked as ${nextStatus}.`, status: nextStatus });
  } catch (error) {
    console.error('Error updating facility status:', error);
    return res.status(500).json({ message: 'Failed to update facility status.' });
  }
};

/**
 * DELETE /api/facilities/:id (Admin)
 * Permanently removes a facility and cascades its reservation records.
 */
const deleteFacility = async (req, res) => {
  try {
    const facilityId = Number(req.params.id);
    const [result] = await pool.query('DELETE FROM facilities WHERE id = ?', [facilityId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Facility not found.' });
    }
    return res.json({ message: 'Facility deleted successfully.' });
  } catch (error) {
    console.error('Error deleting facility:', error);
    return res.status(500).json({ message: 'Failed to delete facility.' });
  }
};

// ============================================================================
// FACILITY RESERVATION & EVENT INQUIRY ENDPOINTS
// ============================================================================

/**
 * POST /api/facilities/reservations (Public / Optional Authenticated Guest)
 * Creates a slot/table reservation (for RESERVABLE facilities) or an event proposal
 * inquiry (for INQUIRY venues). Rejects booking attempts on COMPLIMENTARY or MAINTENANCE facilities.
 */
const createFacilityReservation = async (req, res) => {
  try {
    const {
      facility_id,
      guest_name,
      guest_email,
      guest_phone,
      room_booking_ref = '',
      reservation_date,
      time_slot = '',
      service_option = '',
      guests_count = 2,
      special_requests = '',
    } = req.body;

    const facilityId = Number(facility_id);
    if (!facilityId) {
      return res.status(400).json({ message: 'Please select a valid facility.' });
    }
    if (!guest_name || !guest_email || !guest_phone || !reservation_date) {
      return res.status(400).json({
        message: 'Guest name, email, phone number, and preferred date are required.',
      });
    }

    const [facilityRows] = await pool.query('SELECT * FROM facilities WHERE id = ?', [facilityId]);
    if (facilityRows.length === 0) {
      return res.status(404).json({ message: 'Selected facility was not found.' });
    }

    const facility = normalizeFacility(facilityRows[0]);

    if (facility.status !== 'OPEN') {
      return res.status(400).json({
        message: 'This facility is currently undergoing scheduled maintenance and cannot accept bookings.',
      });
    }

    if (facility.booking_type === 'COMPLIMENTARY') {
      return res.status(400).json({
        message: 'This facility is complimentary for walk-in guests and does not require a reservation.',
      });
    }

    const guestsNum = Math.max(1, Number(guests_count) || 1);
    if (guestsNum > facility.max_guests) {
      return res.status(400).json({
        message: `Maximum capacity for ${facility.title} is ${facility.max_guests} guests.`,
      });
    }

    const requestType = facility.booking_type === 'INQUIRY' ? 'INQUIRY' : 'RESERVATION';
    const userId = extractOptionalUserId(req);
    const referenceCode = generateReferenceCode(requestType);

    // Estimate venue charge for reservable experiences (paid at venue / charged to room)
    const estimatedPrice =
      requestType === 'RESERVATION' && facility.base_price > 0
        ? Math.round(facility.base_price * guestsNum * 100) / 100
        : 0;

    const [insertResult] = await pool.query(
      `INSERT INTO facility_reservations (
        reference_code, facility_id, user_id, request_type,
        guest_name, guest_email, guest_phone, room_booking_ref,
        reservation_date, time_slot, service_option, guests_count,
        estimated_price, special_requests, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        referenceCode,
        facilityId,
        userId,
        requestType,
        String(guest_name).trim(),
        String(guest_email).trim().toLowerCase(),
        String(guest_phone).trim(),
        String(room_booking_ref || '').trim() || null,
        reservation_date,
        String(time_slot || '').trim() || null,
        String(service_option || '').trim() || null,
        guestsNum,
        estimatedPrice,
        String(special_requests || '').trim() || null,
      ]
    );

    const [createdRows] = await pool.query(
      `SELECT fr.*, f.title AS facility_title, f.category AS facility_category,
              f.location AS facility_location, f.image_url AS facility_image,
              f.booking_type AS facility_booking_type, f.price_label AS facility_price_label
       FROM facility_reservations fr
       INNER JOIN facilities f ON f.id = fr.facility_id
       WHERE fr.id = ?`,
      [insertResult.insertId]
    );

    return res.status(201).json({
      message:
        requestType === 'INQUIRY'
          ? 'Your event proposal inquiry has been received. Our concierge will respond within 24 hours.'
          : 'Your facility reservation request has been submitted successfully.',
      reservation: createdRows[0],
    });
  } catch (error) {
    console.error('Error creating facility reservation:', error);
    return res.status(500).json({ message: 'Failed to submit facility reservation.' });
  }
};

/**
 * GET /api/facilities/reservations/my (Authenticated Customer)
 * Returns facility reservations & event inquiries belonging to the logged-in user.
 */
const getMyFacilityReservations = async (req, res) => {
  try {
    const userId = req.user?.id;
    const [[userRow]] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
    const userEmail = userRow?.email ? String(userRow.email).toLowerCase() : null;

    const [rows] = await pool.query(
      `SELECT fr.*, f.title AS facility_title, f.category AS facility_category,
              f.location AS facility_location, f.image_url AS facility_image,
              f.hours AS facility_hours, f.price_label AS facility_price_label
       FROM facility_reservations fr
       INNER JOIN facilities f ON f.id = fr.facility_id
       WHERE fr.user_id = ? OR (? IS NOT NULL AND LOWER(fr.guest_email) = ?)
       ORDER BY fr.created_at DESC`,
      [userId, userEmail, userEmail]
    );

    return res.json({ reservations: rows });
  } catch (error) {
    console.error('Error fetching user facility reservations:', error);
    return res.status(500).json({ message: 'Failed to load your facility reservations.' });
  }
};

/**
 * PATCH /api/facilities/reservations/:id/cancel (Authenticated Customer)
 * Allows a guest to cancel their own PENDING or CONFIRMED facility reservation.
 */
const cancelMyFacilityReservation = async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    const userId = req.user?.id;
    const [[userRow]] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
    const userEmail = userRow?.email ? String(userRow.email).toLowerCase() : null;

    const [rows] = await pool.query(
      `SELECT * FROM facility_reservations
       WHERE id = ? AND (user_id = ? OR (? IS NOT NULL AND LOWER(guest_email) = ?))`,
      [reservationId, userId, userEmail, userEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Reservation not found under your account.' });
    }

    if (rows[0].status === 'CANCELLED' || rows[0].status === 'COMPLETED') {
      return res.status(400).json({
        message: `Reservation is already ${rows[0].status.toLowerCase()}.`,
      });
    }

    await pool.query(
      "UPDATE facility_reservations SET status = 'CANCELLED' WHERE id = ?",
      [reservationId]
    );

    return res.json({ message: 'Facility reservation cancelled successfully.' });
  } catch (error) {
    console.error('Error cancelling facility reservation:', error);
    return res.status(500).json({ message: 'Failed to cancel facility reservation.' });
  }
};

/**
 * GET /api/facilities/reservations/admin (Admin / Super Admin)
 * Lists all guest facility reservations and event inquiries with joined facility metadata.
 */
const getAllFacilityReservationsAdmin = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fr.*, f.title AS facility_title, f.category AS facility_category,
              f.location AS facility_location, f.image_url AS facility_image,
              f.booking_type AS facility_booking_type, f.price_label AS facility_price_label
       FROM facility_reservations fr
       INNER JOIN facilities f ON f.id = fr.facility_id
       ORDER BY fr.created_at DESC`
    );

    return res.json({ reservations: rows });
  } catch (error) {
    console.error('Error fetching admin facility reservations:', error);
    return res.status(500).json({ message: 'Failed to load facility reservations.' });
  }
};

/**
 * PATCH /api/facilities/reservations/:id/status (Admin / Super Admin)
 * Updates reservation status (PENDING, CONFIRMED, COMPLETED, CANCELLED) and optional concierge notes.
 */
const updateFacilityReservationStatus = async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    const { status, admin_notes } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
    const nextStatus = String(status || '').toUpperCase();

    if (!validStatuses.includes(nextStatus)) {
      return res.status(400).json({
        message: `Status must be one of: ${validStatuses.join(', ')}.`,
      });
    }

    const [result] = await pool.query(
      `UPDATE facility_reservations
       SET status = ?, admin_notes = COALESCE(?, admin_notes)
       WHERE id = ?`,
      [nextStatus, admin_notes !== undefined ? String(admin_notes).trim() : null, reservationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Facility reservation not found.' });
    }

    return res.json({
      message: `Reservation status updated to ${nextStatus}.`,
      status: nextStatus,
    });
  } catch (error) {
    console.error('Error updating reservation status:', error);
    return res.status(500).json({ message: 'Failed to update reservation status.' });
  }
};

/**
 * DELETE /api/facilities/reservations/:id (Admin / Super Admin)
 * Deletes a facility reservation or inquiry record.
 */
const deleteFacilityReservation = async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    const [result] = await pool.query('DELETE FROM facility_reservations WHERE id = ?', [
      reservationId,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Facility reservation not found.' });
    }
    return res.json({ message: 'Reservation record removed.' });
  } catch (error) {
    console.error('Error deleting reservation record:', error);
    return res.status(500).json({ message: 'Failed to delete reservation record.' });
  }
};

module.exports = {
  getAllFacilities,
  createFacility,
  updateFacility,
  toggleFacilityStatus,
  deleteFacility,
  createFacilityReservation,
  getMyFacilityReservations,
  cancelMyFacilityReservation,
  getAllFacilityReservationsAdmin,
  updateFacilityReservationStatus,
  deleteFacilityReservation,
};
