const express = require('express');
const router = express.Router();

const {
  authMiddleware,
  authorizeRoles,
} = require('../middleware/authMiddleware');

const {
  getAllRooms,
  checkRoomAvailability,
  getRoomById,
  createRoom,
  updateRoom,
  updateRoomStatus,
  deleteRoom,
} = require('../controllers/roomController');

// Public room viewing & live availability check
router.get('/', getAllRooms);
router.get('/availability', checkRoomAvailability);
router.get('/:id', getRoomById);

// Admin & Super Admin room management
router.post(
  '/',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  createRoom
);

router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  updateRoom
);

router.patch(
  '/:id/status',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  updateRoomStatus
);

router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  deleteRoom
);

module.exports = router;
