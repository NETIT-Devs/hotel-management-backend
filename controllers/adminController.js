const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// GET: Get all Admin accounts (plus Super Admin overview)
exports.getAllAdmins = async (req, res) => {
  try {
    const [admins] = await pool.execute(
      `SELECT id, full_name, email, phone, role, is_active, created_at
       FROM users
       WHERE role IN ('ADMIN', 'SUPER_ADMIN')
       ORDER BY FIELD(role, 'SUPER_ADMIN', 'ADMIN'), created_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: admins.length,
      admins,
    });
  } catch (error) {
    console.error('Get admins error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve Admin accounts.',
    });
  }
};

// POST: Create a new Admin account
exports.createAdmin = async (req, res) => {
  try {
    const fullName = (req.body.full_name || req.body.fullName || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const phone = (req.body.phone || '').trim() || null;
    const password = req.body.password || '';
    const isActive = req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 1;

    if (
      !fullName ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid name, email and password (minimum 8 characters).',
      });
    }

    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO users
       (full_name, email, phone, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 'ADMIN', ?)`,
      [fullName, email, phone, passwordHash, isActive]
    );

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully.',
      adminId: result.insertId,
    });
  } catch (error) {
    console.error('Create Admin error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create Admin account.',
    });
  }
};

// PUT: Update Admin account details (and optional password / status)
exports.updateAdmin = async (req, res) => {
  try {
    const adminId = Number(req.params.id);
    const fullName = (req.body.full_name || req.body.fullName || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const phone = (req.body.phone || '').trim() || null;
    const password = req.body.password ? String(req.body.password) : '';
    const isActive = req.body.is_active;

    if (!Number.isInteger(adminId) || adminId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Admin ID.',
      });
    }

    if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid name and email.',
      });
    }

    const [admins] = await pool.execute(
      "SELECT id, is_active FROM users WHERE id = ? AND role = 'ADMIN'",
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found.',
      });
    }

    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, adminId]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email is already used by another account.',
      });
    }

    const nextActive =
      isActive !== undefined ? (Number(isActive) ? 1 : 0) : admins[0].is_active;

    if (password && password.trim().length > 0) {
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters.',
        });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.execute(
        `UPDATE users
         SET full_name = ?, email = ?, phone = ?, password_hash = ?, is_active = ?
         WHERE id = ? AND role = 'ADMIN'`,
        [fullName, email, phone, passwordHash, nextActive, adminId]
      );
    } else {
      await pool.execute(
        `UPDATE users
         SET full_name = ?, email = ?, phone = ?, is_active = ?
         WHERE id = ? AND role = 'ADMIN'`,
        [fullName, email, phone, nextActive, adminId]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Admin account updated successfully.',
    });
  } catch (error) {
    console.error('Update Admin error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update Admin account.',
    });
  }
};

// PATCH: Toggle or set Admin active status
exports.toggleAdminStatus = async (req, res) => {
  try {
    const adminId = Number(req.params.id);
    if (!Number.isInteger(adminId) || adminId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Admin ID.',
      });
    }

    const [admins] = await pool.execute(
      "SELECT id, is_active FROM users WHERE id = ? AND role = 'ADMIN'",
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found.',
      });
    }

    const nextStatus =
      req.body.is_active !== undefined
        ? Number(req.body.is_active)
          ? 1
          : 0
        : admins[0].is_active
        ? 0
        : 1;

    await pool.execute(
      "UPDATE users SET is_active = ? WHERE id = ? AND role = 'ADMIN'",
      [nextStatus, adminId]
    );

    return res.status(200).json({
      success: true,
      is_active: nextStatus,
      message: nextStatus
        ? 'Admin account activated.'
        : 'Admin account deactivated.',
    });
  } catch (error) {
    console.error('Toggle Admin status error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update Admin status.',
    });
  }
};

// DELETE: Permanently delete an Admin account
exports.deleteAdmin = async (req, res) => {
  try {
    const adminId = Number(req.params.id);

    if (!Number.isInteger(adminId) || adminId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Admin ID.',
      });
    }

    const [result] = await pool.execute(
      "DELETE FROM users WHERE id = ? AND role = 'ADMIN'",
      [adminId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Admin account deleted successfully.',
    });
  } catch (error) {
    console.error('Delete Admin error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete Admin account.',
    });
  }
};
