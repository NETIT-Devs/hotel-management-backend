
const express = require('express');
const router = express.Router();

const {
  getDashboardSummary,
  getRecentBookings,
  getBookingStats,
  getRoomAvailability,
} = require('../controllers/dashboardController');

const {
  authMiddleware,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// Admin and Super Admin can access dashboard
router.use(
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN')
);

router.get('/summary', getDashboardSummary);
router.get('/recent-bookings', getRecentBookings);
router.get('/booking-stats', getBookingStats);
router.get('/room-availability', getRoomAvailability);

module.exports = router;
