
const express = require('express');
const router = express.Router();

const {
  createBooking,
  getMyBookings,
  cancelMyBooking,
  lookupBooking,
  getAllBookings,
  updateBookingStatus,
  updateBooking,
  deleteBooking,
} = require('../controllers/bookingController');

const {
  authMiddleware,
  authorizeRoles,
} = require('../middleware/authMiddleware');

const jwt = require('jsonwebtoken');

// Public booking lookup by Reference ID + Email
router.get('/lookup', lookupBooking);

// Customer booking history (Customer, Admin or Super Admin)
router.get(
  '/my-bookings',
  authMiddleware,
  getMyBookings
);

// Customer self-cancel own booking
router.patch(
  '/:id/cancel',
  authMiddleware,
  cancelMyBooking
);

// Admin and Super Admin: view all bookings
router.get(
  '/',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  getAllBookings
);

// Admin and Super Admin: approve or reject a booking status
router.patch(
  '/:id/status',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  updateBookingStatus
);

// Admin and Super Admin: full update booking details
router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  updateBooking
);

// Admin and Super Admin: delete booking
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  deleteBooking
);

// Optional authentication middleware for booking request
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      if (process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id, role: decoded.role };
      }
    } catch (e) {
      // Ignore token verification errors and proceed as guest
    }
  }
  next();
};

// Booking request (Logged-in user or Guest)
router.post(
  '/',
  optionalAuth,
  createBooking
);

module.exports = router;
