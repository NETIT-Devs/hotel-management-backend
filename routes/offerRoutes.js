const express = require('express');
const router = express.Router();

const {
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
} = require('../controllers/offerController');

const {
  authMiddleware,
  authorizeRoles,
} = require('../middleware/authMiddleware');

const jwt = require('jsonwebtoken');

// Helper for optional auth on GET
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      if (process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id, role: decoded.role };
      }
    } catch (e) {}
  }
  next();
};

// Public & Admin: Get offers
router.get('/', optionalAuth, getAllOffers);
router.get('/:id', getOfferById);

// Admin & Super Admin: Create, Update, Delete offers
router.post(
  '/',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  createOffer
);

router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  updateOffer
);

router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  deleteOffer
);

module.exports = router;
