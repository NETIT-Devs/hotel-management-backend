
const pool = require('../config/db');

// GET: Dashboard summary cards
exports.getDashboardSummary = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM bookings) AS total_bookings,

        (SELECT COUNT(*) FROM bookings
         WHERE status = 'PENDING') AS pending_bookings,

        (SELECT COUNT(*) FROM bookings
         WHERE status = 'APPROVED') AS approved_bookings,

        (SELECT COUNT(*) FROM bookings
         WHERE status = 'REJECTED') AS rejected_bookings,

        (SELECT COUNT(*) FROM users
         WHERE role = 'CUSTOMER') AS total_customers,

        (SELECT COUNT(*) FROM rooms) AS total_room_types,

        (SELECT COALESCE(SUM(COALESCE(total_units, 1)), 0)
         FROM rooms) AS total_room_units,

        (SELECT COALESCE(SUM(total_price), 0)
         FROM bookings
         WHERE status = 'APPROVED') AS approved_booking_value
    `);

    return res.status(200).json({
      success: true,
      summary: rows[0],
    });
  } catch (error) {
    console.error('Dashboard summary error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard summary.',
    });
  }
};

// GET: Recent bookings
exports.getRecentBookings = async (req, res) => {
  try {
    const [bookings] = await pool.execute(`
      SELECT
        b.id,
        b.user_id,
        b.room_id,
        b.check_in,
        b.check_out,
        b.guests,
        b.rooms_count,
        b.total_price,
        b.status,
        b.created_at,
        b.payment_method,
        COALESCE(
          NULLIF(
            TRIM(CONCAT_WS(' ', b.guest_first_name, b.guest_last_name)),
            ''
          ),
          u.full_name
        ) AS guest_name,
        COALESCE(b.guest_email, u.email) AS guest_email,
        COALESCE(b.guest_phone, u.phone) AS guest_phone,
        r.room_name,
        r.room_type
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN rooms r ON b.room_id = r.id
      ORDER BY b.created_at DESC
      LIMIT 8
    `);

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('Recent bookings error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent bookings.',
    });
  }
};

// GET: Booking statistics for the last 6 months
exports.getBookingStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        COUNT(*) AS total_bookings,
        SUM(status = 'PENDING') AS pending_bookings,
        SUM(status = 'APPROVED') AS approved_bookings,
        SUM(status = 'REJECTED') AS rejected_bookings,
        SUM(status = 'CANCELLED') AS cancelled_bookings
      FROM bookings
      WHERE created_at >= DATE_FORMAT(
        DATE_SUB(CURDATE(), INTERVAL 5 MONTH),
        '%Y-%m-01'
      )
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Booking stats error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve booking statistics.',
    });
  }
};

// GET: Current room availability
exports.getRoomAvailability = async (req, res) => {
  try {
    const [rooms] = await pool.execute(`
      SELECT
        r.id,
        r.room_name,
        r.room_type,
        r.status,
        COALESCE(r.total_units, 1) AS total_units,

        COALESCE(b.occupied_units, 0) AS occupied_units,

        CASE
          WHEN r.status = 'MAINTENANCE' THEN 0
          ELSE GREATEST(
            COALESCE(r.total_units, 1) -
            COALESCE(b.occupied_units, 0),
            0
          )
        END AS available_units

      FROM rooms r

      LEFT JOIN (
        SELECT
          room_id,
          SUM(rooms_count) AS occupied_units
        FROM bookings
        WHERE status = 'APPROVED'
          AND check_in <= CURDATE()
          AND check_out > CURDATE()
        GROUP BY room_id
      ) b ON b.room_id = r.id

      ORDER BY r.room_name ASC
    `);

    const totals = rooms.reduce(
      (result, room) => {
        const units = Number(room.total_units);
        const occupied = Number(room.occupied_units);
        const available = Number(room.available_units);

        result.total_units += units;
        result.occupied_units += occupied;
        result.available_units += available;

        if (room.status === 'MAINTENANCE') {
          result.maintenance_room_types += 1;
        }

        return result;
      },
      {
        total_units: 0,
        occupied_units: 0,
        available_units: 0,
        maintenance_room_types: 0,
      }
    );

    return res.status(200).json({
      success: true,
      totals,
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    console.error('Room availability error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve room availability.',
    });
  }
};
