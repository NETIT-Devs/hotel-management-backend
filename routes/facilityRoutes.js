/**
 * Facility & Facility Reservation Routes
 * Defines public, authenticated customer, and admin-protected API endpoints.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/facilityController');

// ================= PUBLIC ENDPOINTS =================
// List all resort facilities (optional ?status=OPEN filter)
router.get('/', getAllFacilities);

// Submit a guest facility reservation or event proposal inquiry (guest or logged-in user)
router.post('/reservations', createFacilityReservation);

// ================= CUSTOMER SELF-SERVICE ENDPOINTS =================
// View logged-in customer's facility reservations & inquiries
router.get('/reservations/my', authMiddleware, getMyFacilityReservations);

// Cancel logged-in customer's own facility reservation
router.patch('/reservations/:id/cancel', authMiddleware, cancelMyFacilityReservation);

// ================= ADMIN MANAGEMENT ENDPOINTS =================
// List all guest facility reservations & event inquiries
router.get(
  '/reservations/admin',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  getAllFacilityReservationsAdmin
);

// Update a reservation/inquiry status & concierge notes
router.patch(
  '/reservations/:id/status',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  updateFacilityReservationStatus
);

// Delete a reservation/inquiry record
router.delete(
  '/reservations/:id',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  deleteFacilityReservation
);

// Facility catalog CRUD
router.post('/', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), createFacility);
router.put('/:id', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), updateFacility);
router.patch(
  '/:id/status',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  toggleFacilityStatus
);
router.delete('/:id', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), deleteFacility);

module.exports = router;
