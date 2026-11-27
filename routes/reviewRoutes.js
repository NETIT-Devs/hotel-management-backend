const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const {
  getPublicReviews,
  getFeaturedReviews,
  verifyReviewEligibility,
  submitReview,
  getAllReviewsAdmin,
  updateReviewModeration,
  deleteReviewAdmin,
} = require('../controllers/reviewController');

const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * Optional JWT authentication middleware:
 * Attaches req.user when a valid Bearer token is present,
 * otherwise proceeds cleanly so Guest Lookup users can also submit reviews.
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      if (process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id, role: decoded.role };
      }
    } catch {
      // Proceed as unauthenticated guest when token is absent or expired
    }
  }
  next();
};

// Public endpoints
router.get('/', getPublicReviews);
router.get('/featured', getFeaturedReviews);

// Guest & Logged-in Customer endpoints
router.post('/verify-eligibility', optionalAuth, verifyReviewEligibility);
router.post('/', optionalAuth, submitReview);

// Admin Moderation endpoints
router.get('/admin', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), getAllReviewsAdmin);
router.patch('/admin/:id', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), updateReviewModeration);
router.delete('/admin/:id', authMiddleware, authorizeRoles('ADMIN', 'SUPER_ADMIN'), deleteReviewAdmin);

module.exports = router;
