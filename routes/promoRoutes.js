const express = require('express');
const router = express.Router();

const {
  validatePromoCode,
  getAllPromoCodes,
  createPromoCode,
  updatePromoCode,
  togglePromoStatus,
  deletePromoCode,
} = require('../controllers/promoController');

const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

// Public: validate promo code before/during checkout
router.post('/validate', validatePromoCode);

// Admin & Super Admin CRUD
router.get('/', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), getAllPromoCodes);
router.post('/', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), createPromoCode);
router.put('/:id', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), updatePromoCode);
router.patch('/:id/status', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), togglePromoStatus);
router.delete('/:id', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), deletePromoCode);

module.exports = router;
