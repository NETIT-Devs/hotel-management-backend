const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const VALID_CATEGORIES = ['Rooms & Suites', 'Facilities', 'Dining', 'Resort Life'];

const buildFileUrl = (req, filename) =>
  `${req.protocol}://${req.get('host')}/uploads/gallery/${filename}`;

exports.getAllGallery = async (req, res) => {
  try {
    const includeAll = req.query.all === 'true';
    const sql = includeAll
      ? 'SELECT * FROM gallery ORDER BY is_featured DESC, created_at DESC'
      : "SELECT * FROM gallery WHERE status = 'ACTIVE' ORDER BY is_featured DESC, created_at DESC";
    const [items] = await pool.execute(sql);
    return res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error('Get gallery error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve gallery photos.',
    });
  }
};

exports.createGalleryItem = async (req, res) => {
  try {
    const { title, category = 'Resort Life', image_url, caption, is_featured, status } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Photo title is required.',
      });
    }

    const finalImageUrl = req.file
      ? buildFileUrl(req, req.file.filename)
      : String(image_url || '').trim();

    if (!finalImageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please choose an image file or provide an image URL.',
      });
    }

    const normalizedCat = VALID_CATEGORIES.includes(category) ? category : 'Resort Life';
    const featured = is_featured === true || is_featured === 'true' || is_featured === '1' || is_featured === 1 ? 1 : 0;
    const normalizedStatus = status === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE';

    const [result] = await pool.execute(
      `INSERT INTO gallery (title, category, image_url, caption, is_featured, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [String(title).trim(), normalizedCat, finalImageUrl, caption || null, featured, normalizedStatus]
    );

    return res.status(201).json({
      success: true,
      message: 'Gallery photo added successfully.',
      itemId: result.insertId,
      image_url: finalImageUrl,
    });
  } catch (error) {
    console.error('Create gallery item error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to add gallery photo.',
    });
  }
};

exports.updateGalleryItem = async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid gallery item ID.' });
    }

    const [existing] = await pool.execute('SELECT * FROM gallery WHERE id = ? LIMIT 1', [itemId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery photo not found.' });
    }

    const { title, category, image_url, caption, is_featured, status } = req.body;
    const finalTitle = title && String(title).trim() ? String(title).trim() : existing[0].title;
    const normalizedCat = VALID_CATEGORIES.includes(category) ? category : existing[0].category;
    const finalImageUrl = req.file
      ? buildFileUrl(req, req.file.filename)
      : (image_url && String(image_url).trim()) || existing[0].image_url;
    const featured =
      is_featured === undefined
        ? existing[0].is_featured
        : is_featured === true || is_featured === 'true' || is_featured === '1' || is_featured === 1
        ? 1
        : 0;
    const normalizedStatus = status === 'HIDDEN' || status === 'ACTIVE' ? status : existing[0].status;

    await pool.execute(
      `UPDATE gallery
       SET title = ?, category = ?, image_url = ?, caption = ?, is_featured = ?, status = ?
       WHERE id = ?`,
      [finalTitle, normalizedCat, finalImageUrl, caption !== undefined ? caption : existing[0].caption, featured, normalizedStatus, itemId]
    );

    return res.status(200).json({
      success: true,
      message: 'Gallery photo updated successfully.',
    });
  } catch (error) {
    console.error('Update gallery item error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update gallery photo.',
    });
  }
};

exports.deleteGalleryItem = async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid gallery item ID.' });
    }

    const [existing] = await pool.execute('SELECT image_url FROM gallery WHERE id = ? LIMIT 1', [itemId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery photo not found.' });
    }

    await pool.execute('DELETE FROM gallery WHERE id = ?', [itemId]);

    // Clean up local uploaded file if stored under /uploads/gallery/
    const imgUrl = existing[0].image_url || '';
    const marker = '/uploads/gallery/';
    if (imgUrl.includes(marker)) {
      const filename = imgUrl.split(marker).pop();
      if (filename) {
        const filePath = path.join(__dirname, '..', 'uploads', 'gallery', path.basename(filename));
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, () => {});
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Gallery photo deleted successfully.',
    });
  } catch (error) {
    console.error('Delete gallery item error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete gallery photo.',
    });
  }
};
