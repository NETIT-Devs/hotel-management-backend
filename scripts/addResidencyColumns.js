const pool = require('../config/db');

async function addColumnIfMissing(table, column, definition) {
  const [cols] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (cols.length === 0) {
    await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Added ${table}.${column}`);
  }
}

async function run() {
  try {
    await addColumnIfMissing('rooms', 'resident_price_per_night', 'DECIMAL(10,2) NULL');
    await addColumnIfMissing('bookings', 'residency', "VARCHAR(30) DEFAULT 'Non-Resident'");
    await addColumnIfMissing('bookings', 'guest_id_number', 'VARCHAR(80) NULL');

    await pool.execute(
      `UPDATE rooms
       SET resident_price_per_night = ROUND(price_per_night * 0.75, 0)
       WHERE resident_price_per_night IS NULL OR resident_price_per_night <= 0`
    );

    console.log('Residency columns & default resident rates synced.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
