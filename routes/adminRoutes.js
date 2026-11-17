const express = require('express');
const router = express.Router();

const {
  getAllAdmins,
  createAdmin,
  updateAdmin,
  toggleAdminStatus,
  deleteAdmin,
} = require('../controllers/adminController');

const {
  authMiddleware,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// Super Admin can manage Admin accounts (Admin can view list if needed)
router.get('/', authMiddleware, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getAllAdmins);
router.post('/', authMiddleware, authorizeRoles('SUPER_ADMIN'), createAdmin);
router.put('/:id', authMiddleware, authorizeRoles('SUPER_ADMIN'), updateAdmin);
router.patch('/:id/status', authMiddleware, authorizeRoles('SUPER_ADMIN'), toggleAdminStatus);
router.delete('/:id', authMiddleware, authorizeRoles('SUPER_ADMIN'), deleteAdmin);

module.exports = router;
