const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();

const {
  getAllGallery,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} = require('../controllers/galleryController');

const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

const uploadDir = path.join(__dirname, '..', 'uploads', 'gallery');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

router.get('/', getAllGallery);

router.post(
  '/',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  upload.single('image'),
  createGalleryItem
);

router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  upload.single('image'),
  updateGalleryItem
);

router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  deleteGalleryItem
);

module.exports = router;
