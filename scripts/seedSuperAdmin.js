
require('dotenv').config();

const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const createSuperAdmin = async () => {
  try {
    const { SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } =
      process.env;

    if (!SUPER_ADMIN_NAME || !SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
      throw new Error('Super Admin environment variables are missing.');
    }

    if (SUPER_ADMIN_PASSWORD.length < 12) {
      throw new Error('Super Admin password must contain at least 12 characters.');
    }

    const email = SUPER_ADMIN_EMAIL.trim().toLowerCase();

    const [existingUsers] = await pool.execute(
      'SELECT id, role FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existingUsers.length > 0) {
      if (existingUsers[0].role === 'SUPER_ADMIN') {
        console.log('Super Admin account already exists.');
        return;
      }

      throw new Error(
        'This email already belongs to another account. Choose a different email.'
      );
    }

    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, 'SUPER_ADMIN', 1)`,
      [SUPER_ADMIN_NAME.trim(), email, passwordHash]
    );

    console.log('Super Admin account created successfully.');
    console.log('Super Admin ID:', result.insertId);
    console.log('Email:', email);
  } catch (error) {
    console.error('Super Admin creation failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

createSuperAdmin();
