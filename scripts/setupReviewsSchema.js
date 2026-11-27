/**
 * Database migration script for the Verified Guest Reviews module.
 * - Ensures `bookings.status` supports 'CHECKED_OUT' for completed stays.
 * - Creates the `reviews` table with a unique constraint on `booking_id`
 *   to guarantee one verified review per stay.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function setupReviewsSchema() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Connected to MySQL. Updating schema for Verified Reviews...');

    // 1. Ensure bookings.status supports CHECKED_OUT
    const [statusCols] = await connection.execute(
      `SHOW COLUMNS FROM bookings LIKE 'status'`
    );
    if (statusCols.length > 0) {
      const colType = String(statusCols[0].Type || '');
      if (colType.toLowerCase().startsWith('enum(') && !colType.includes('CHECKED_OUT')) {
        await connection.execute(
          `ALTER TABLE bookings
           MODIFY COLUMN status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHECKED_OUT')
           NOT NULL DEFAULT 'PENDING'`
        );
        console.log("Updated bookings.status ENUM to include 'CHECKED_OUT'.");
      } else {
        console.log('bookings.status already supports CHECKED_OUT:', colType);
      }
    }

    // 2. Create reviews table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        user_id INT NULL,
        room_id INT NOT NULL,
        guest_name VARCHAR(120) NOT NULL,
        guest_country VARCHAR(80) NULL,
        overall_rating TINYINT NOT NULL,
        cleanliness_rating TINYINT NULL,
        service_rating TINYINT NULL,
        location_rating TINYINT NULL,
        rooms_rating TINYINT NULL,
        title VARCHAR(160) NOT NULL,
        comment TEXT NOT NULL,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
        is_featured TINYINT(1) NOT NULL DEFAULT 0,
        admin_reply TEXT NULL,
        replied_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_reviews_booking (booking_id),
        INDEX idx_reviews_status (status),
        INDEX idx_reviews_featured (is_featured, status),
        INDEX idx_reviews_room (room_id),
        CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        CONSTRAINT fk_reviews_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Verified `reviews` table exists.');

    console.log('Reviews schema setup completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to setup reviews schema:', error.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

setupReviewsSchema();
