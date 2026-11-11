
const express = require('express');
const router = express.Router();

const {
  createBooking,
  getMyBookings,
  getAllBookings,
  updateBookingStatus,
} = require('../controllers/bookingController');

const {
  authMiddleware,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// Customer booking history
router.get(
  '/my-bookings',
  authMiddleware,
  authorizeRoles('CUSTOMER'),
  getMyBookings
);

// Admin and Super Admin: view all bookings
router.get(
  '/',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  getAllBookings
);

// Admin and Super Admin: approve or reject a booking
router.patch(
  '/:id/status',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  updateBookingStatus
);

// Customer booking request
router.post(
  '/',
  authMiddleware,
  authorizeRoles('CUSTOMER'),
  createBooking
);

module.exports = router;
