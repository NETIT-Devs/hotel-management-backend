/**
 * Migration Script: Add `child_ages` & `child_supplement` columns to `bookings` table
 * Persists guest child age brackets and server-verified extra rollaway bed supplements.
 */
require('dotenv').config();
const pool = require('../config/db');

async function run() {
  const conn = await pool.getConnection();
  try {
    const [ageCols] = await conn.query("SHOW COLUMNS FROM bookings LIKE 'child_ages'");
    if (ageCols.length === 0) {
      await conn.query('ALTER TABLE bookings ADD COLUMN child_ages JSON NULL AFTER children');
      console.log('Added `child_ages` JSON column to `bookings`.');
    } else {
      console.log('`child_ages` column already exists.');
    }

    const [supCols] = await conn.query("SHOW COLUMNS FROM bookings LIKE 'child_supplement'");
    if (supCols.length === 0) {
      await conn.query(
        'ALTER TABLE bookings ADD COLUMN child_supplement DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER child_ages'
      );
      console.log('Added `child_supplement` DECIMAL(10,2) column to `bookings`.');
    } else {
      console.log('`child_supplement` column already exists.');
    }

    console.log('Child age schema migration completed.');
  } catch (err) {
    console.error('Child age migration failed:', err);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

run();
