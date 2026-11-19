/**
 * Shared Admin Media Upload Routes
 * Provides a centralized, role-protected image upload endpoint (`POST /api/uploads/image`)
 * for Rooms, Offers, Facilities, and Gallery management dashboards.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Whitelisted destination subfolders inside `/uploads` to prevent path traversal
const ALLOWED_FOLDERS = new Set(['rooms', 'offers', 'facilities', 'gallery', 'general']);

const resolveTargetFolder = (rawFolder) => {
  const clean = String(rawFolder || 'general').trim().toLowerCase();
  return ALLOWED_FOLDERS.has(clean) ? clean : 'general';
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = resolveTargetFolder(req.query.folder || req.body?.folder);
    const targetDir = path.join(__dirname, '..', 'uploads', folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    req._uploadFolder = folder;
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB max per image
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (.jpg, .png, .webp, .gif) are allowed.'));
    }
  },
});

/**
 * POST /api/uploads/image?folder=rooms|offers|facilities|gallery
 * Uploads a single image file and returns its publicly accessible URL.
 */
router.post(
  '/image',
  authMiddleware,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'Image file exceeds the 8MB maximum limit.'
            : err.message || 'Image upload failed.';
        return res.status(400).json({ success: false, message });
      }
      return next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please choose an image file to upload.',
      });
    }

    const folder = req._uploadFolder || 'general';
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/${folder}/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully.',
      imageUrl,
      filename: req.file.filename,
      folder,
    });
  }
);

module.exports = router;
