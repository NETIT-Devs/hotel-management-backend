const pool = require('../config/db');

const parseJsonArray = (val, fallback = []) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split('\n').map((s) => s.trim()).filter(Boolean);
    }
  }
  return fallback;
};

const toJsonString = (val) => {
  if (val === undefined || val === null) return null;
  if (Array.isArray(val)) return JSON.stringify(val.map((s) => String(s).trim()).filter(Boolean));
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return JSON.stringify([]);
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {
      return JSON.stringify(trimmed.split('\n').map((s) => s.trim()).filter(Boolean));
    }
  }
  return null;
};

const formatOfferRow = (o) => {
  const defaultImg = o.image_url || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=85';
  const images = parseJsonArray(o.images, [defaultImg]);
  return {
    ...o,
    image_url: o.image_url || images[0] || defaultImg,
    images: images.length > 0 ? images : [defaultImg],
    features: parseJsonArray(o.features, ['Luxury room stay', 'Breakfast for two', 'Late checkout']),
    terms: parseJsonArray(o.terms, ['Offer is subject to room availability.', 'Advance reservation is required.']),
  };
};

// GET: All offers
exports.getAllOffers = async (req, res) => {
  try {
    const isAdmin = req.user && ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const query = isAdmin
      ? `SELECT o.*, r.room_name 
         FROM offers o 
         LEFT JOIN rooms r ON o.room_id = r.id 
         ORDER BY o.created_at DESC`
      : `SELECT o.*, r.room_name 
         FROM offers o 
         LEFT JOIN rooms r ON o.room_id = r.id 
         WHERE o.status = 'ACTIVE' 
         ORDER BY o.created_at DESC`;

    const [rows] = await pool.execute(query);
    const offers = rows.map(formatOfferRow);

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    console.error('Get offers error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve special offers.',
    });
  }
};

// GET: Single offer by ID
exports.getOfferById = async (req, res) => {
  try {
    const offerId = Number(req.params.id);
    if (!Number.isInteger(offerId) || offerId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offer ID.',
      });
    }

    const [offers] = await pool.execute(
      `SELECT o.*, r.room_name 
       FROM offers o 
       LEFT JOIN rooms r ON o.room_id = r.id 
       WHERE o.id = ? 
       LIMIT 1`,
      [offerId]
    );

    if (offers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Special offer not found.',
      });
    }

    return res.status(200).json({
      success: true,
      offer: formatOfferRow(offers[0]),
    });
  } catch (error) {
    console.error('Get offer error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve offer details.',
    });
  }
};

// POST: Create a new offer (Admin / Super Admin)
exports.createOffer = async (req, res) => {
  try {
    const {
      title,
      category,
      subtitle,
      description,
      discount,
      original_price,
      discounted_price,
      save_amount,
      valid_until,
      image_url,
      images,
      features,
      terms,
      room_id,
      status,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Offer title is required.',
      });
    }

    const origPrice = Number(original_price || 0);
    const discPrice = Number(discounted_price || 0);
    const finalDiscount = discount || (origPrice > discPrice && origPrice > 0 ? `${Math.round(((origPrice - discPrice) / origPrice) * 100)}% OFF` : 'SPECIAL OFFER');
    const finalSave = save_amount || (origPrice > discPrice ? `Save $${(origPrice - discPrice).toFixed(0)}` : null);
    const primaryImg =
      image_url ||
      (Array.isArray(images) && images[0]) ||
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=85';

    const [result] = await pool.execute(
      `INSERT INTO offers 
       (title, category, subtitle, description, discount, original_price, discounted_price, save_amount, valid_until, image_url, images, features, terms, room_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        category || 'SPECIAL OFFER',
        subtitle || null,
        description || null,
        finalDiscount,
        origPrice,
        discPrice,
        finalSave,
        valid_until || null,
        primaryImg,
        toJsonString(images && images.length ? images : [primaryImg]),
        toJsonString(features || []),
        toJsonString(terms || []),
        room_id ? Number(room_id) : null,
        status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Offer created successfully.',
      offerId: result.insertId,
      offer: {
        id: result.insertId,
        title: title.trim(),
        category: category || 'SPECIAL OFFER',
        discount: finalDiscount,
        original_price: origPrice,
        discounted_price: discPrice,
        status: status || 'ACTIVE',
      },
    });
  } catch (error) {
    console.error('Create offer error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create offer. ' + error.message,
    });
  }
};

// PUT: Update an existing offer (Admin / Super Admin)
exports.updateOffer = async (req, res) => {
  try {
    const offerId = Number(req.params.id);
    if (!Number.isInteger(offerId) || offerId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offer ID.',
      });
    }

    const {
      title,
      category,
      subtitle,
      description,
      discount,
      original_price,
      discounted_price,
      save_amount,
      valid_until,
      image_url,
      images,
      features,
      terms,
      room_id,
      status,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Offer title is required.',
      });
    }

    const origPrice = Number(original_price || 0);
    const discPrice = Number(discounted_price || 0);
    const finalDiscount = discount || (origPrice > discPrice && origPrice > 0 ? `${Math.round(((origPrice - discPrice) / origPrice) * 100)}% OFF` : 'SPECIAL OFFER');
    const finalSave = save_amount || (origPrice > discPrice ? `Save $${(origPrice - discPrice).toFixed(0)}` : null);
    const primaryImg =
      image_url ||
      (Array.isArray(images) && images[0]) ||
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=85';

    const [result] = await pool.execute(
      `UPDATE offers 
       SET title = ?, category = ?, subtitle = ?, description = ?, discount = ?,
           original_price = ?, discounted_price = ?, save_amount = ?, valid_until = ?,
           image_url = ?, images = ?, features = ?, terms = ?, room_id = ?, status = ?
       WHERE id = ?`,
      [
        title.trim(),
        category || 'SPECIAL OFFER',
        subtitle || null,
        description || null,
        finalDiscount,
        origPrice,
        discPrice,
        finalSave,
        valid_until || null,
        primaryImg,
        toJsonString(images && images.length ? images : [primaryImg]),
        toJsonString(features || []),
        toJsonString(terms || []),
        room_id ? Number(room_id) : null,
        status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        offerId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Offer updated successfully.',
    });
  } catch (error) {
    console.error('Update offer error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update offer. ' + error.message,
    });
  }
};

// DELETE: Delete an offer (Admin / Super Admin)
exports.deleteOffer = async (req, res) => {
  try {
    const offerId = Number(req.params.id);
    if (!Number.isInteger(offerId) || offerId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offer ID.',
      });
    }

    const [result] = await pool.execute(
      'DELETE FROM offers WHERE id = ?',
      [offerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Offer deleted successfully.',
    });
  } catch (error) {
    console.error('Delete offer error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete offer.',
    });
  }
};
