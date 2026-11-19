const pool = require('../config/db');

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

/**
 * Shared promo validation & discount calculator used by both
 * POST /api/promo-codes/validate and POST /api/bookings.
 */
async function evaluatePromoCode(
  dbClient,
  { code, subtotal = 0, nights = 1, roomId = null, residency = 'Non-Resident' }
) {
  const cleanCode = normalizeCode(code);
  if (!cleanCode) {
    return { valid: false, message: 'Please enter a promo code.' };
  }

  const [rows] = await dbClient.execute(
    `SELECT p.*, r.room_name AS applicable_room_name
     FROM promo_codes p
     LEFT JOIN rooms r ON p.applicable_room_id = r.id
     WHERE UPPER(p.code) = ?
     LIMIT 1`,
    [cleanCode]
  );

  if (rows.length === 0) {
    return { valid: false, message: `Promo code "${cleanCode}" is invalid.` };
  }

  const promo = rows[0];

  if (promo.status !== 'ACTIVE') {
    return { valid: false, message: `Promo code "${cleanCode}" is currently inactive.` };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (promo.valid_from) {
    const start = new Date(promo.valid_from).toISOString().slice(0, 10);
    if (today < start) {
      return { valid: false, message: `Promo code "${cleanCode}" is not active until ${start}.` };
    }
  }
  if (promo.valid_until) {
    const end = new Date(promo.valid_until).toISOString().slice(0, 10);
    if (today > end) {
      return { valid: false, message: `Promo code "${cleanCode}" has expired on ${end}.` };
    }
  }

  if (promo.max_uses !== null && Number(promo.used_count) >= Number(promo.max_uses)) {
    return { valid: false, message: `Promo code "${cleanCode}" has reached its redemption limit.` };
  }

  const reqNights = Math.max(1, Number(nights) || 1);
  if (promo.min_nights && reqNights < Number(promo.min_nights)) {
    return {
      valid: false,
      message: `Promo code "${cleanCode}" requires a minimum stay of ${promo.min_nights} night(s).`,
    };
  }

  const baseSubtotal = Math.max(0, Number(subtotal) || 0);
  if (Number(promo.min_amount) > 0 && baseSubtotal > 0 && baseSubtotal < Number(promo.min_amount)) {
    return {
      valid: false,
      message: `Promo code "${cleanCode}" requires a minimum room spend of $${Number(promo.min_amount).toFixed(0)}.`,
    };
  }

  if (
    promo.applicable_room_id &&
    roomId &&
    Number(promo.applicable_room_id) !== Number(roomId)
  ) {
    return {
      valid: false,
      message: `Promo code "${cleanCode}" is only valid for ${promo.applicable_room_name || 'a specific room category'}.`,
    };
  }

  if (
    promo.residency_type &&
    promo.residency_type !== 'ALL' &&
    residency &&
    promo.residency_type !== residency
  ) {
    return {
      valid: false,
      message: `Promo code "${cleanCode}" is exclusive to ${promo.residency_type} guests.`,
    };
  }

  let discountAmount = 0;
  if (promo.discount_type === 'PERCENTAGE') {
    discountAmount = (baseSubtotal * Number(promo.discount_value)) / 100;
    if (promo.max_discount !== null && Number(promo.max_discount) > 0) {
      discountAmount = Math.min(discountAmount, Number(promo.max_discount));
    }
  } else {
    discountAmount = Math.min(Number(promo.discount_value), baseSubtotal > 0 ? baseSubtotal : Number(promo.discount_value));
  }

  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    valid: true,
    promo: {
      id: promo.id,
      code: promo.code,
      title: promo.title,
      discount_type: promo.discount_type,
      discount_value: Number(promo.discount_value),
      max_discount: promo.max_discount !== null ? Number(promo.max_discount) : null,
      min_nights: Number(promo.min_nights) || 1,
      min_amount: Number(promo.min_amount) || 0,
      applicable_room_id: promo.applicable_room_id,
      applicable_room_name: promo.applicable_room_name || null,
      residency_type: promo.residency_type,
      valid_until: promo.valid_until,
    },
    discountAmount,
    finalSubtotal: Math.max(0, Math.round((baseSubtotal - discountAmount) * 100) / 100),
    message:
      promo.discount_type === 'PERCENTAGE'
        ? `Promo "${promo.code}" applied (${Number(promo.discount_value)}% OFF).`
        : `Promo "${promo.code}" applied ($${Number(promo.discount_value).toFixed(0)} OFF).`,
  };
}

exports.evaluatePromoCode = evaluatePromoCode;

// POST: Public validation endpoint
exports.validatePromoCode = async (req, res) => {
  try {
    const { code, subtotal, nights, roomId, residency } = req.body;
    const result = await evaluatePromoCode(pool, {
      code,
      subtotal,
      nights,
      roomId,
      residency,
    });

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Validate promo code error:', error.message);
    return res.status(500).json({
      success: false,
      valid: false,
      message: 'Unable to validate promo code right now.',
    });
  }
};

// GET: Admin list all promo codes
exports.getAllPromoCodes = async (req, res) => {
  try {
    const [promos] = await pool.execute(
      `SELECT p.*, r.room_name AS applicable_room_name
       FROM promo_codes p
       LEFT JOIN rooms r ON p.applicable_room_id = r.id
       ORDER BY p.created_at DESC`
    );
    return res.status(200).json({
      success: true,
      count: promos.length,
      promos,
    });
  } catch (error) {
    console.error('Get promo codes error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve promo codes.',
    });
  }
};

// POST: Create promo code (Admin / Super Admin)
exports.createPromoCode = async (req, res) => {
  try {
    const {
      code,
      title,
      discount_type = 'PERCENTAGE',
      discount_value,
      max_discount,
      min_nights = 1,
      min_amount = 0,
      applicable_room_id,
      residency_type = 'ALL',
      valid_from,
      valid_until,
      max_uses,
      status = 'ACTIVE',
    } = req.body;

    const cleanCode = normalizeCode(code);
    if (!cleanCode || !title || !String(title).trim() || Number(discount_value) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Promo code, title, and a valid discount value are required.',
      });
    }

    const [exists] = await pool.execute(
      'SELECT id FROM promo_codes WHERE UPPER(code) = ? LIMIT 1',
      [cleanCode]
    );
    if (exists.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Promo code "${cleanCode}" already exists.`,
      });
    }

    const type = discount_type === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
    const resType = ['ALL', 'Resident', 'Non-Resident'].includes(residency_type)
      ? residency_type
      : 'ALL';

    const [result] = await pool.execute(
      `INSERT INTO promo_codes
       (code, title, discount_type, discount_value, max_discount, min_nights, min_amount,
        applicable_room_id, residency_type, valid_from, valid_until, max_uses, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanCode,
        String(title).trim(),
        type,
        Number(discount_value),
        max_discount ? Number(max_discount) : null,
        Math.max(1, Number(min_nights) || 1),
        Math.max(0, Number(min_amount) || 0),
        applicable_room_id ? Number(applicable_room_id) : null,
        resType,
        valid_from || null,
        valid_until || null,
        max_uses ? Math.max(1, Number(max_uses)) : null,
        status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Promo code "${cleanCode}" created successfully.`,
      promoId: result.insertId,
    });
  } catch (error) {
    console.error('Create promo code error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create promo code.',
    });
  }
};

// PUT: Update promo code (Admin / Super Admin)
exports.updatePromoCode = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Invalid promo code ID.' });
    }

    const {
      code,
      title,
      discount_type = 'PERCENTAGE',
      discount_value,
      max_discount,
      min_nights = 1,
      min_amount = 0,
      applicable_room_id,
      residency_type = 'ALL',
      valid_from,
      valid_until,
      max_uses,
      status = 'ACTIVE',
    } = req.body;

    const cleanCode = normalizeCode(code);
    if (!cleanCode || !title || !String(title).trim() || Number(discount_value) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Promo code, title, and a valid discount value are required.',
      });
    }

    const type = discount_type === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
    const resType = ['ALL', 'Resident', 'Non-Resident'].includes(residency_type)
      ? residency_type
      : 'ALL';

    const [result] = await pool.execute(
      `UPDATE promo_codes
       SET code = ?, title = ?, discount_type = ?, discount_value = ?, max_discount = ?,
           min_nights = ?, min_amount = ?, applicable_room_id = ?, residency_type = ?,
           valid_from = ?, valid_until = ?, max_uses = ?, status = ?
       WHERE id = ?`,
      [
        cleanCode,
        String(title).trim(),
        type,
        Number(discount_value),
        max_discount ? Number(max_discount) : null,
        Math.max(1, Number(min_nights) || 1),
        Math.max(0, Number(min_amount) || 0),
        applicable_room_id ? Number(applicable_room_id) : null,
        resType,
        valid_from || null,
        valid_until || null,
        max_uses ? Math.max(1, Number(max_uses)) : null,
        status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Promo code not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Promo code updated successfully.',
    });
  } catch (error) {
    console.error('Update promo code error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update promo code.',
    });
  }
};

// PATCH: Toggle status
exports.togglePromoStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const nextStatus = req.body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const [result] = await pool.execute(
      'UPDATE promo_codes SET status = ? WHERE id = ?',
      [nextStatus, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Promo code not found.' });
    }
    return res.status(200).json({
      success: true,
      message: `Promo code marked as ${nextStatus}.`,
    });
  } catch (error) {
    console.error('Toggle promo status error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update promo status.' });
  }
};

// DELETE: Delete promo code
exports.deletePromoCode = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [result] = await pool.execute('DELETE FROM promo_codes WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Promo code not found.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Promo code deleted successfully.',
    });
  } catch (error) {
    console.error('Delete promo code error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete promo code.' });
  }
};
