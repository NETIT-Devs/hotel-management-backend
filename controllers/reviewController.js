const pool = require('../config/db');

/**
 * Extract numeric booking ID from either a raw number ("12")
 * or a formatted reference code ("SBHR-2026-00012" -> 12).
 */
const parseBookingId = (rawValue) => {
  const str = String(rawValue || '').trim();
  if (!str) return NaN;
  const segment = str.includes('-') ? str.split('-').pop() : str;
  const digits = segment.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : NaN;
};

/**
 * Format a date value to YYYY-MM-DD in local/ISO calendar form.
 */
const toDateOnly = (val) => {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    return val.slice(0, 10);
  }
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

/**
 * A stay is eligible for review only if:
 * 1. The booking has been explicitly marked CHECKED_OUT by hotel staff, OR
 * 2. The booking was APPROVED and its check-out date has already passed (<= today).
 */
const isBookingEligible = (booking) => {
  if (!booking) return false;
  if (booking.status === 'CHECKED_OUT') return true;
  if (booking.status === 'APPROVED') {
    const checkOutDate = toDateOnly(booking.check_out);
    const today = new Date().toISOString().slice(0, 10);
    return Boolean(checkOutDate && checkOutDate <= today);
  }
  return false;
};

/**
 * Validate an optional 1-5 integer rating field.
 * Returns null if omitted/empty, or throws/returns NaN if invalid.
 */
const parseOptionalRating = (val) => {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  if (!Number.isInteger(num) || num < 1 || num > 5) return NaN;
  return num;
};

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * GET /api/reviews
 * Fetch approved guest reviews with aggregate ratings, category averages,
 * rating distribution, and optional filtering/sorting.
 */
exports.getPublicReviews = async (req, res) => {
  try {
    const roomId = req.query.roomId ? Number(req.query.roomId) : null;
    const minRating = req.query.rating ? Number(req.query.rating) : null;
    const sort = req.query.sort === 'highest' ? 'highest' : 'newest';

    const whereClauses = ["rv.status = 'APPROVED'"];
    const params = [];

    if (roomId && Number.isInteger(roomId) && roomId > 0) {
      whereClauses.push('rv.room_id = ?');
      params.push(roomId);
    }

    if (minRating && Number.isInteger(minRating) && minRating >= 1 && minRating <= 5) {
      whereClauses.push('rv.overall_rating >= ?');
      params.push(minRating);
    }

    const orderBy =
      sort === 'highest'
        ? 'rv.overall_rating DESC, rv.created_at DESC'
        : 'rv.created_at DESC';

    const [reviews] = await pool.execute(
      `SELECT
          rv.id,
          rv.booking_id,
          rv.room_id,
          r.room_name,
          r.room_type,
          rv.guest_name,
          rv.guest_country,
          rv.overall_rating,
          rv.cleanliness_rating,
          rv.service_rating,
          rv.location_rating,
          rv.rooms_rating,
          rv.title,
          rv.comment,
          rv.is_featured,
          rv.admin_reply,
          rv.replied_at,
          rv.created_at,
          b.check_in,
          b.check_out
       FROM reviews rv
       INNER JOIN rooms r ON rv.room_id = r.id
       INNER JOIN bookings b ON rv.booking_id = b.id
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY ${orderBy}`,
      params
    );

    // Compute overall summary across ALL approved reviews (unfiltered)
    const [summaryRows] = await pool.execute(
      `SELECT
          COUNT(*) AS total_reviews,
          ROUND(AVG(overall_rating), 1) AS average_rating,
          ROUND(AVG(cleanliness_rating), 1) AS avg_cleanliness,
          ROUND(AVG(service_rating), 1) AS avg_service,
          ROUND(AVG(location_rating), 1) AS avg_location,
          ROUND(AVG(rooms_rating), 1) AS avg_rooms,
          SUM(CASE WHEN overall_rating = 5 THEN 1 ELSE 0 END) AS stars_5,
          SUM(CASE WHEN overall_rating = 4 THEN 1 ELSE 0 END) AS stars_4,
          SUM(CASE WHEN overall_rating = 3 THEN 1 ELSE 0 END) AS stars_3,
          SUM(CASE WHEN overall_rating = 2 THEN 1 ELSE 0 END) AS stars_2,
          SUM(CASE WHEN overall_rating = 1 THEN 1 ELSE 0 END) AS stars_1
       FROM reviews
       WHERE status = 'APPROVED'`
    );

    // Active rooms list for filter dropdown
    const [rooms] = await pool.execute(
      `SELECT id, room_name FROM rooms WHERE status = 'ACTIVE' ORDER BY id ASC`
    );

    const summary = summaryRows[0] || {
      total_reviews: 0,
      average_rating: 0,
      avg_cleanliness: 0,
      avg_service: 0,
      avg_location: 0,
      avg_rooms: 0,
      stars_5: 0,
      stars_4: 0,
      stars_3: 0,
      stars_2: 0,
      stars_1: 0,
    };

    return res.status(200).json({
      reviews,
      summary,
      rooms,
    });
  } catch (error) {
    console.error('Get public reviews error:', error.message);
    return res.status(500).json({ message: 'Failed to load guest reviews.' });
  }
};

/**
 * GET /api/reviews/featured
 * Fetch featured approved reviews for the Home page Testimonials carousel.
 * Prioritizes admin-featured reviews first, then most recent 5-star/approved reviews.
 */
exports.getFeaturedReviews = async (req, res) => {
  try {
    const [reviews] = await pool.execute(
      `SELECT
          rv.id,
          rv.room_id,
          r.room_name,
          rv.guest_name,
          rv.guest_country,
          rv.overall_rating,
          rv.title,
          rv.comment,
          rv.created_at,
          b.check_out
       FROM reviews rv
       INNER JOIN rooms r ON rv.room_id = r.id
       INNER JOIN bookings b ON rv.booking_id = b.id
       WHERE rv.status = 'APPROVED'
       ORDER BY rv.is_featured DESC, rv.overall_rating DESC, rv.created_at DESC
       LIMIT 8`
    );

    return res.status(200).json({ reviews });
  } catch (error) {
    console.error('Get featured reviews error:', error.message);
    return res.status(500).json({ message: 'Failed to load featured reviews.' });
  }
};

// ============================================================================
// GUEST & CUSTOMER SUBMISSION ENDPOINTS
// ============================================================================

/**
 * POST /api/reviews/verify-eligibility
 * Verify whether a booking (via logged-in user OR Guest Reference + Email)
 * is eligible to submit a verified stay review.
 */
exports.verifyReviewEligibility = async (req, res) => {
  try {
    const bookingId = parseBookingId(req.body.bookingId || req.body.bookingRef);
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!Number.isInteger(bookingId) || bookingId < 1) {
      return res.status(400).json({
        message: 'Please provide a valid Booking Reference ID (e.g. SBHR-2026-00012).',
      });
    }

    const [rows] = await pool.execute(
      `SELECT
          b.id,
          b.user_id,
          b.room_id,
          b.check_in,
          b.check_out,
          b.status,
          b.guest_first_name,
          b.guest_last_name,
          b.guest_email,
          u.email AS account_email,
          u.full_name AS account_name,
          r.room_name,
          rv.id AS existing_review_id
       FROM bookings b
       INNER JOIN rooms r ON b.room_id = r.id
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN reviews rv ON rv.booking_id = b.id
       WHERE b.id = ?
       LIMIT 1`,
      [bookingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'No reservation found with that Reference ID.',
      });
    }

    const booking = rows[0];

    // Ownership check: either matching logged-in user OR matching guest email
    const isOwnerByJwt = req.user?.id && booking.user_id === req.user.id;
    const isOwnerByEmail =
      email &&
      (String(booking.guest_email || '').toLowerCase() === email ||
        String(booking.account_email || '').toLowerCase() === email);

    if (!isOwnerByJwt && !isOwnerByEmail) {
      return res.status(403).json({
        message: 'The email address does not match this reservation.',
      });
    }

    if (booking.existing_review_id) {
      return res.status(409).json({
        message: 'A review has already been submitted for this stay. Thank you!',
      });
    }

    if (!isBookingEligible(booking)) {
      return res.status(400).json({
        message:
          'Reviews can only be submitted after your stay has been completed (checked out).',
      });
    }

    const guestName =
      `${booking.guest_first_name || ''} ${booking.guest_last_name || ''}`.trim() ||
      booking.account_name ||
      'Verified Guest';

    return res.status(200).json({
      eligible: true,
      booking: {
        id: booking.id,
        room_id: booking.room_id,
        room_name: booking.room_name,
        check_in: booking.check_in,
        check_out: booking.check_out,
        guest_name: guestName,
      },
    });
  } catch (error) {
    console.error('Verify review eligibility error:', error.message);
    return res.status(500).json({ message: 'Failed to verify booking eligibility.' });
  }
};

/**
 * POST /api/reviews
 * Submit a new verified stay review.
 * Saves with status = 'PENDING' for admin moderation.
 */
exports.submitReview = async (req, res) => {
  try {
    const bookingId = parseBookingId(req.body.bookingId || req.body.bookingRef);
    const email = String(req.body.email || '').trim().toLowerCase();

    const overallRating = Number(req.body.overall_rating ?? req.body.overallRating);
    const cleanlinessRating = parseOptionalRating(
      req.body.cleanliness_rating ?? req.body.cleanlinessRating
    );
    const serviceRating = parseOptionalRating(
      req.body.service_rating ?? req.body.serviceRating
    );
    const locationRating = parseOptionalRating(
      req.body.location_rating ?? req.body.locationRating
    );
    const roomsRating = parseOptionalRating(
      req.body.rooms_rating ?? req.body.roomsRating
    );

    const title = String(req.body.title || '').trim();
    const comment = String(req.body.comment || '').trim();
    const guestCountry = String(req.body.guest_country || req.body.guestCountry || '').trim() || null;

    if (!Number.isInteger(bookingId) || bookingId < 1) {
      return res.status(400).json({ message: 'Valid Booking Reference ID is required.' });
    }

    if (!Number.isInteger(overallRating) || overallRating < 1 || overallRating > 5) {
      return res.status(400).json({ message: 'Overall star rating (1–5) is required.' });
    }

    if (
      Number.isNaN(cleanlinessRating) ||
      Number.isNaN(serviceRating) ||
      Number.isNaN(locationRating) ||
      Number.isNaN(roomsRating)
    ) {
      return res.status(400).json({ message: 'Category ratings must be between 1 and 5.' });
    }

    if (title.length < 3 || title.length > 160) {
      return res.status(400).json({
        message: 'Review headline must be between 3 and 160 characters.',
      });
    }

    if (comment.length < 10 || comment.length > 2000) {
      return res.status(400).json({
        message: 'Please share at least 10 characters about your stay experience.',
      });
    }

    // Fetch booking & verify ownership + eligibility
    const [rows] = await pool.execute(
      `SELECT
          b.id,
          b.user_id,
          b.room_id,
          b.check_out,
          b.status,
          b.guest_first_name,
          b.guest_last_name,
          b.guest_email,
          u.email AS account_email,
          u.full_name AS account_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.id = ?
       LIMIT 1`,
      [bookingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    const booking = rows[0];

    const isOwnerByJwt = req.user?.id && booking.user_id === req.user.id;
    const isOwnerByEmail =
      email &&
      (String(booking.guest_email || '').toLowerCase() === email ||
        String(booking.account_email || '').toLowerCase() === email);

    if (!isOwnerByJwt && !isOwnerByEmail) {
      return res.status(403).json({
        message: 'You are not authorized to review this reservation.',
      });
    }

    if (!isBookingEligible(booking)) {
      return res.status(400).json({
        message: 'Reviews can only be submitted after your stay is completed.',
      });
    }

    // Check duplicate review
    const [existing] = await pool.execute(
      `SELECT id FROM reviews WHERE booking_id = ? LIMIT 1`,
      [bookingId]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        message: 'A review has already been submitted for this booking.',
      });
    }

    const guestName =
      `${booking.guest_first_name || ''} ${booking.guest_last_name || ''}`.trim() ||
      booking.account_name ||
      'Verified Guest';

    const [result] = await pool.execute(
      `INSERT INTO reviews (
          booking_id,
          user_id,
          room_id,
          guest_name,
          guest_country,
          overall_rating,
          cleanliness_rating,
          service_rating,
          location_rating,
          rooms_rating,
          title,
          comment,
          status,
          is_featured
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0)`,
      [
        booking.id,
        booking.user_id || req.user?.id || null,
        booking.room_id,
        guestName,
        guestCountry,
        overallRating,
        cleanlinessRating,
        serviceRating,
        locationRating,
        roomsRating,
        title,
        comment,
      ]
    );

    return res.status(201).json({
      message:
        'Thank you! Your review has been submitted for approval and will appear once verified.',
      reviewId: result.insertId,
      status: 'PENDING',
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'A review has already been submitted for this booking.',
      });
    }
    console.error('Submit review error:', error.message);
    return res.status(500).json({ message: 'Failed to submit review.' });
  }
};

// ============================================================================
// ADMIN MODERATION ENDPOINTS
// ============================================================================

/**
 * GET /api/reviews/admin
 * Fetch all reviews for admin moderation with status counts.
 */
exports.getAllReviewsAdmin = async (req, res) => {
  try {
    const statusFilter = String(req.query.status || 'ALL').toUpperCase();
    const whereClause =
      statusFilter !== 'ALL' && ['PENDING', 'APPROVED', 'REJECTED'].includes(statusFilter)
        ? 'WHERE rv.status = ?'
        : '';
    const params = whereClause ? [statusFilter] : [];

    const [reviews] = await pool.execute(
      `SELECT
          rv.*,
          r.room_name,
          b.check_in,
          b.check_out,
          b.guest_email
       FROM reviews rv
       INNER JOIN rooms r ON rv.room_id = r.id
       INNER JOIN bookings b ON rv.booking_id = b.id
       ${whereClause}
       ORDER BY
         CASE rv.status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END,
         rv.created_at DESC`,
      params
    );

    const [countRows] = await pool.execute(
      `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
          SUM(CASE WHEN is_featured = 1 AND status = 'APPROVED' THEN 1 ELSE 0 END) AS featured
       FROM reviews`
    );

    return res.status(200).json({
      reviews,
      counts: countRows[0] || { total: 0, pending: 0, approved: 0, rejected: 0, featured: 0 },
    });
  } catch (error) {
    console.error('Admin get reviews error:', error.message);
    return res.status(500).json({ message: 'Failed to load reviews for moderation.' });
  }
};

/**
 * PATCH /api/reviews/admin/:id
 * Moderate a review: approve/reject, toggle featured on homepage, or add management reply.
 */
exports.updateReviewModeration = async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    if (!Number.isInteger(reviewId) || reviewId < 1) {
      return res.status(400).json({ message: 'Invalid review ID.' });
    }

    const { status, is_featured, admin_reply } = req.body;

    const updates = [];
    const params = [];

    if (status !== undefined) {
      const normalized = String(status).toUpperCase();
      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(normalized)) {
        return res.status(400).json({ message: 'Invalid review status.' });
      }
      updates.push('status = ?');
      params.push(normalized);

      // Automatically unfeature if review is rejected or moved back to pending
      if (normalized !== 'APPROVED') {
        updates.push('is_featured = 0');
      }
    }

    if (is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(is_featured ? 1 : 0);
    }

    if (admin_reply !== undefined) {
      const replyText = String(admin_reply || '').trim();
      if (replyText) {
        updates.push('admin_reply = ?', 'replied_at = NOW()');
        params.push(replyText);
      } else {
        updates.push('admin_reply = NULL', 'replied_at = NULL');
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No moderation updates provided.' });
    }

    params.push(reviewId);

    const [result] = await pool.execute(
      `UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    return res.status(200).json({
      message: 'Review updated successfully.',
    });
  } catch (error) {
    console.error('Update review moderation error:', error.message);
    return res.status(500).json({ message: 'Failed to update review.' });
  }
};

/**
 * DELETE /api/reviews/admin/:id
 * Permanently delete a review (Admin / Super Admin).
 */
exports.deleteReviewAdmin = async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    if (!Number.isInteger(reviewId) || reviewId < 1) {
      return res.status(400).json({ message: 'Invalid review ID.' });
    }

    const [result] = await pool.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    return res.status(200).json({ message: 'Review deleted successfully.' });
  } catch (error) {
    console.error('Delete review error:', error.message);
    return res.status(500).json({ message: 'Failed to delete review.' });
  }
};
