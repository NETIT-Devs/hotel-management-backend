/**
 * Migration Script: Add `long_description` column to `offers` table
 * Enables separate short preview copy (Offer cards) and rich detailed copy (OfferDetailsPage).
 */
require('dotenv').config();
const pool = require('../config/db');

const DEFAULT_LONG_DESCRIPTIONS = [
  {
    matchTitle: 'romantic',
    text: 'Enjoy an intimate luxury escape with elegant accommodation and a relaxing atmosphere for two. Indulge in a romantic getaway at Serenity Bay, featuring private dining experiences, couple spa treatments, and breathtaking sunset views designed exclusively for your special moments.',
  },
  {
    matchTitle: 'longer',
    text: 'Take your time, unwind in comfort and enjoy more of your stay with our extended-stay offer. Indulge in a luxurious getaway at Serenity Bay, enjoying a perfect blend of comfort, elegance and breathtaking ocean views, designed for your special moments and complete relaxation.',
  },
  {
    matchTitle: 'plan ahead',
    text: 'Plan your next luxury holiday early and enjoy an exclusive saving on your room reservation. Experience world-class hospitality, pristine beaches, and exceptional dining options at Serenity Bay when you secure your dream vacation well in advance.',
  },
];

async function run() {
  const conn = await pool.getConnection();
  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM offers LIKE 'long_description'");
    if (cols.length === 0) {
      await conn.query('ALTER TABLE offers ADD COLUMN long_description TEXT NULL AFTER description');
      console.log('Added `long_description` column to `offers` table.');
    } else {
      console.log('`long_description` column already exists.');
    }

    const [offers] = await conn.query('SELECT id, title, description, long_description FROM offers');
    for (const offer of offers) {
      if (offer.long_description && String(offer.long_description).trim()) continue;
      const lowerTitle = String(offer.title || '').toLowerCase();
      const matched = DEFAULT_LONG_DESCRIPTIONS.find((d) => lowerTitle.includes(d.matchTitle));
      const nextLong = matched
        ? matched.text
        : `${offer.description || ''} Experience refined coastal hospitality, curated resort dining, and serene oceanfront suites tailored exclusively for your Serenity Bay getaway.`.trim();

      await conn.query('UPDATE offers SET long_description = ? WHERE id = ?', [nextLong, offer.id]);
      console.log(`Populated long_description for offer #${offer.id} (${offer.title})`);
    }
    console.log('Offer long_description migration completed.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

run();
