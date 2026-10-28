
const express = require('express');
const router = express.Router();

const {
  authMiddleware,
  authorizeRoles,
} = require('../middleware/authMiddleware');

const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoomStatus,
} = require('../controllers/roomController');

// Public room viewing
router.get('/', getAllRooms);
router.get('/:id', getRoomById);
router.post(
  '/',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  createRoom
);

router.patch(
  '/:id/status',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  updateRoomStatus
);

// These routes MUST be protected by authentication
// and ADMIN/SUPER_ADMIN role authorization before use.
//router.post('/', /* authMiddleware, adminOnly, */ createRoom);
//router.patch('/:id/status', /* authMiddleware, adminOnly, */ updateRoomStatus);

module.exports = router;
