
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// GET: Get all Admin accounts
exports.getAllAdmins = async (req, res) => {
  try {
    const [admins] = await pool.execute(
      `SELECT id, full_name, email, phone, role, is_active, created_at
       FROM users
       WHERE role = 'ADMIN'
       ORDER BY created_at DESC`
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
    const { full_name, email, phone, password } = req.body;

    if (
      typeof full_name !== 'string' ||
      !full_name.trim() ||
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid name, email and password (minimum 8 characters).',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
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
       VALUES (?, ?, ?, ?, 'ADMIN', 1)`,
      [
        full_name.trim(),
        normalizedEmail,
        phone || null,
        passwordHash,
      ]
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

// PUT: Update Admin account details
exports.updateAdmin = async (req, res) => {
  try {
    const adminId = Number(req.params.id);
    const { full_name, email, phone } = req.body;

    if (!Number.isInteger(adminId) || adminId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Admin ID.',
      });
    }

    if (
      typeof full_name !== 'string' ||
      !full_name.trim() ||
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid name and email.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [admins] = await pool.execute(
      "SELECT id FROM users WHERE id = ? AND role = 'ADMIN'",
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
      [normalizedEmail, adminId]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email is already used by another account.',
      });
    }

    await pool.execute(
      `UPDATE users
       SET full_name = ?, email = ?, phone = ?
       WHERE id = ? AND role = 'ADMIN'`,
      [
        full_name.trim(),
        normalizedEmail,
        phone || null,
        adminId,
      ]
    );

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

// DELETE: Deactivate an Admin account
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
      `UPDATE users
       SET is_active = 0
       WHERE id = ? AND role = 'ADMIN' AND is_active = 1`,
      [adminId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active Admin account not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Admin account deactivated successfully.',
    });
  } catch (error) {
    console.error('Deactivate Admin error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to deactivate Admin account.',
    });
  }
};
