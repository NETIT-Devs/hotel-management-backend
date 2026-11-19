const pool = require('../config/db');

const INITIAL_PROMOS = [
  {
    code: 'SERENITY20',
    title: 'Serenity Signature 20% Escape',
    discount_type: 'PERCENTAGE',
    discount_value: 20,
    max_discount: 250,
    min_nights: 2,
    min_amount: 0,
    applicable_room_id: null,
    residency_type: 'ALL',
    valid_from: '2026-01-01',
    valid_until: '2027-12-31',
    max_uses: 100,
    status: 'ACTIVE',
  },
  {
    code: 'WELCOME50',
    title: 'First Stay Welcome Privilege',
    discount_type: 'FIXED',
    discount_value: 50,
    max_discount: null,
    min_nights: 1,
    min_amount: 200,
    applicable_room_id: null,
    residency_type: 'ALL',
    valid_from: '2026-01-01',
    valid_until: '2027-12-31',
    max_uses: 200,
    status: 'ACTIVE',
  },
  {
    code: 'LANKA15',
    title: 'Sri Lankan Resident Exclusive',
    discount_type: 'PERCENTAGE',
    discount_value: 15,
    max_discount: 180,
    min_nights: 1,
    min_amount: 0,
    applicable_room_id: null,
    residency_type: 'Resident',
    valid_from: '2026-01-01',
    valid_until: '2027-12-31',
    max_uses: 150,
    status: 'ACTIVE',
  },
  {
    code: 'VIP100',
    title: 'Extended Luxury Suite Credit',
    discount_type: 'FIXED',
    discount_value: 100,
    max_discount: null,
    min_nights: 3,
    min_amount: 600,
    applicable_room_id: null,
    residency_type: 'ALL',
    valid_from: '2026-01-01',
    valid_until: '2027-12-31',
    max_uses: 50,
    status: 'ACTIVE',
  },
];

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
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(150) NOT NULL,
        discount_type ENUM('PERCENTAGE', 'FIXED') NOT NULL DEFAULT 'PERCENTAGE',
        discount_value DECIMAL(10,2) NOT NULL,
        max_discount DECIMAL(10,2) NULL,
        min_nights INT NOT NULL DEFAULT 1,
        min_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        applicable_room_id INT NULL,
        residency_type ENUM('ALL', 'Resident', 'Non-Resident') NOT NULL DEFAULT 'ALL',
        valid_from DATE NULL,
        valid_until DATE NULL,
        max_uses INT NULL,
        used_count INT NOT NULL DEFAULT 0,
        status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await addColumnIfMissing('bookings', 'promo_code', 'VARCHAR(50) NULL');
    await addColumnIfMissing('bookings', 'discount_amount', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');

    const [existing] = await pool.execute('SELECT COUNT(*) AS cnt FROM promo_codes');
    if (existing[0].cnt === 0) {
      for (const p of INITIAL_PROMOS) {
        await pool.execute(
          `INSERT INTO promo_codes
           (code, title, discount_type, discount_value, max_discount, min_nights, min_amount, applicable_room_id, residency_type, valid_from, valid_until, max_uses, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.code,
            p.title,
            p.discount_type,
            p.discount_value,
            p.max_discount,
            p.min_nights,
            p.min_amount,
            p.applicable_room_id,
            p.residency_type,
            p.valid_from,
            p.valid_until,
            p.max_uses,
            p.status,
          ]
        );
      }
      console.log(`Seeded ${INITIAL_PROMOS.length} luxury promo codes.`);
    } else {
      console.log(`promo_codes table already has ${existing[0].cnt} codes.`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Promo codes init failed:', err);
    process.exit(1);
  }
}

run();
