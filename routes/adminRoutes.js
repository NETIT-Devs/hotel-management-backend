
const express = require('express');
const router = express.Router();

const {
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} = require('../controllers/adminController');

const {
  authMiddleware,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// Only Super Admin can manage Admin accounts
router.use(authMiddleware, authorizeRoles('SUPER_ADMIN'));

router.get('/', getAllAdmins);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

module.exports = router;
