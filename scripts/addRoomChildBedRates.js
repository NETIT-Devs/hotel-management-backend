/**
 * Migration Script: Add per-room Extra Child Bed Rates to `rooms` table
 * Enables admins to configure Non-Resident and Sri Lankan Resident child extra bed prices
 * (for ages 6–11) independently per room category (including $0 for Family Suites).
 */
require('dotenv').config();
const pool = require('../config/db');

async function run() {
  const conn = await pool.getConnection();
  try {
    const [col1] = await conn.query("SHOW COLUMNS FROM rooms LIKE 'child_extra_bed_price'");
    if (col1.length === 0) {
      await conn.query(
        'ALTER TABLE rooms ADD COLUMN child_extra_bed_price DECIMAL(10, 2) NOT NULL DEFAULT 25.00 AFTER resident_price_per_night'
      );
      console.log('Added `child_extra_bed_price` column to `rooms`.');
    } else {
      console.log('`child_extra_bed_price` already exists.');
    }

    const [col2] = await conn.query("SHOW COLUMNS FROM rooms LIKE 'resident_child_extra_bed_price'");
    if (col2.length === 0) {
      await conn.query(
        'ALTER TABLE rooms ADD COLUMN resident_child_extra_bed_price DECIMAL(10, 2) NOT NULL DEFAULT 15.00 AFTER child_extra_bed_price'
      );
      console.log('Added `resident_child_extra_bed_price` column to `rooms`.');
    } else {
      console.log('`resident_child_extra_bed_price` already exists.');
    }

    // Apply realistic initial tier defaults by room type/name
    const [rooms] = await conn.query('SELECT id, room_name, room_type FROM rooms');
    for (const r of rooms) {
      const name = String(r.room_name || '').toLowerCase();
      const type = String(r.room_type || '').toUpperCase();
      let intlRate = 25;
      let localRate = 15;
      if (type === 'FAMILY' || name.includes('family')) {
        intlRate = 0;
        localRate = 0; // Kids stay free in Family Suites!
      } else if (name.includes('villa')) {
        intlRate = 35;
        localRate = 20;
      }
      await conn.query(
        'UPDATE rooms SET child_extra_bed_price = ?, resident_child_extra_bed_price = ? WHERE id = ?',
        [intlRate, localRate, r.id]
      );
      console.log(`Room #${r.id} (${r.room_name}) -> Extra Child Bed: $${intlRate} Intl / $${localRate} Resident`);
    }

    console.log('Per-room child extra bed rates migration completed.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

run();
