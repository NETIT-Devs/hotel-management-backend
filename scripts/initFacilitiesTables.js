/**
 * Database Initialization Script: Facilities & Facility Reservations
 * Creates `facilities` and `facility_reservations` tables in MySQL
 * and seeds the 6 signature Serenity Bay resort facilities with real-world booking modes.
 */
require('dotenv').config();
const pool = require('../config/db');

const SEED_FACILITIES = [
  {
    title: 'Oceanfront Infinity Pool & Private Cabanas',
    category: 'POOL & BEACH',
    booking_type: 'COMPLIMENTARY',
    badge: 'SIGNATURE EXPERIENCE',
    hours: '06:30 AM – 09:30 PM',
    location: 'Main Coastal Horizon Deck',
    access_note: 'Complimentary Walk-In for In-House Guests',
    price_label: 'Complimentary',
    base_price: 0,
    max_guests: 40,
    time_slots: [],
    service_options: [],
    highlights: [
      'Temperature-controlled saltwater infinity edge',
      'Chilled tropical fruit skewers & Evian mist service',
      'Dedicated family lagoon & heated jacuzzi deck',
    ],
    image_url:
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=85',
    description:
      'Immerse yourself in our temperature-controlled saltwater infinity pool that blends seamlessly into the turquoise Indian Ocean, complete with shaded teakwood loungers and poolside refreshment service.',
    status: 'OPEN',
  },
  {
    title: 'Serenity Holistic Spa & Ayurveda Sanctuary',
    category: 'SPA & WELLNESS',
    booking_type: 'RESERVABLE',
    badge: 'AWARD-WINNING SPA',
    hours: '08:00 AM – 08:30 PM',
    location: 'Emerald Lotus Garden Wing',
    access_note: 'Advance Appointment Recommended',
    price_label: 'From $95 / session',
    base_price: 95,
    max_guests: 4,
    time_slots: ['09:00 AM', '11:00 AM', '02:00 PM', '04:30 PM', '06:30 PM'],
    service_options: [
      'Ceylon Ayurveda Full Body Ritual (90 min)',
      'Private Couples Aromatherapy Suite (120 min)',
      'Warm Stone & Shirodhara Healing Therapy (75 min)',
      'Sunrise Ocean Yoga & Sound Bath (60 min)',
    ],
    highlights: [
      'Private couples treatment villas with floral baths',
      'Authentic Shirodhara & Ceylon herbal steam suites',
      'Sunrise ocean-facing yoga & guided meditation',
    ],
    image_url:
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=85',
    description:
      'Rejuvenate body and soul amidst tranquil lotus ponds. Our master therapists blend ancient Sri Lankan Ayurveda with organic botanicals, warm stone rituals, and holistic sound-healing therapies.',
    status: 'OPEN',
  },
  {
    title: 'The Azure Cliffside Fine Dining & Cellar',
    category: 'FINE DINING',
    booking_type: 'RESERVABLE',
    badge: 'CULINARY EXCELLENCE',
    hours: '07:00 AM – 11:00 PM',
    location: 'West Cliff Ocean Terrace',
    access_note: 'Smart Casual · Table Reservation Recommended',
    price_label: 'From $65 / guest',
    base_price: 65,
    max_guests: 12,
    time_slots: ['12:30 PM (Lunch)', '06:30 PM (Sunset)', '07:30 PM (Dinner)', '08:45 PM (Late Dining)'],
    service_options: [
      '7-Course Chef Tasting Menu (Ocean Terrace)',
      'Private Beachfront Candlelit Dinner for Two',
      'Subterranean Sommelier Wine Cellar Pairing',
      'À La Carte Coastal Seafood Dining',
    ],
    highlights: [
      '7-course chef tasting menu under the stars',
      'Private beachfront candlelit dining setups',
      'Over 300 vintage labels in our subterranean cellar',
    ],
    image_url:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=85',
    description:
      'Savor contemporary Indian Ocean gastronomy crafted from daily reef catches and organic estate spices, paired with over 300 vintage labels from our subterranean sommelier wine cellar.',
    status: 'OPEN',
  },
  {
    title: 'Performance Fitness & Ocean Movement Studio',
    category: 'FITNESS',
    booking_type: 'COMPLIMENTARY',
    badge: '24/7 ACCESS',
    hours: 'Open 24 Hours (Keycard Access)',
    location: 'Wellness Pavilion, Level 2',
    access_note: 'Complimentary 24/7 Access for All Guests',
    price_label: 'Complimentary',
    base_price: 0,
    max_guests: 25,
    time_slots: [],
    service_options: [],
    highlights: [
      'Latest Technogym Artis line & Reformer Pilates studio',
      'Himalayan salt sauna & eucalyptus steam room',
      'Floodlit championship tennis & padel courts',
    ],
    image_url:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=85',
    description:
      'Maintain your peak routine with panoramic ocean views. Equipped with the latest Technogym Artis line, free weights, Reformer Pilates studio, and post-workout recovery suites.',
    status: 'OPEN',
  },
  {
    title: 'Private Cove Beach Club & Yacht Charters',
    category: 'RECREATION',
    booking_type: 'RESERVABLE',
    badge: 'EXCLUSIVE EXPERIENCE',
    hours: '07:00 AM – 07:00 PM',
    location: 'Serenity Private Southern Cove',
    access_note: 'Private Concierge Slot Reservation',
    price_label: 'From $140 / experience',
    base_price: 140,
    max_guests: 10,
    time_slots: ['08:00 AM (Morning Reef)', '11:30 AM (Day Cabana)', '04:00 PM (Sunset Cruise)'],
    service_options: [
      'Private 55ft Luxury Sunset Yacht Charter',
      'Private Beachfront Champagne Cabana (Half-Day)',
      'Guided Coral Reef Snorkeling & Marine Safari',
      'Whale-Watching Catamaran Expedition',
    ],
    highlights: [
      'Private 55ft luxury sunset yacht charters',
      'Complimentary kayaking, paddleboarding & snorkeling gear',
      'Beachside wood-fired seafood grill & raw bar',
    ],
    image_url:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85',
    description:
      'Step directly onto powdery golden sands in our sheltered private bay. Reserve luxury catamaran sunset cruises, private champagne beach cabanas, and guided coral reef expeditions.',
    status: 'OPEN',
  },
  {
    title: 'Royal Pavilion Events, Weddings & VIP Chauffeur',
    category: 'EVENTS & VIP',
    booking_type: 'INQUIRY',
    badge: 'BESPOKE VENUES',
    hours: '24/7 Dedicated Events Concierge',
    location: 'Grand Ballroom & Cliffside Ocean Lawn',
    access_note: 'Tailored Proposal Within 24 Hours',
    price_label: 'Bespoke Packages',
    base_price: 0,
    max_guests: 250,
    time_slots: ['Morning Event', 'Afternoon Reception', 'Evening Gala', 'Full-Day Venue'],
    service_options: [
      'Cliffside Luxury Destination Wedding',
      'Executive Boardroom & Corporate Retreat',
      'Private Anniversary / Milestone Gala',
      'VIP Helicopter or Maybach Airport Transfer',
    ],
    highlights: [
      'Oceanfront wedding lawn for up to 250 guests',
      'Private helipad & Mercedes-Maybach airport transfers',
      'Dedicated event planners & bespoke banquet menus',
    ],
    image_url:
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=85',
    description:
      'From fairytale cliffside weddings to executive boardroom retreats and private helicopter transfers, our dedicated lifestyle concierges craft bespoke proposals tailored to your celebration.',
    status: 'OPEN',
  },
];

async function initFacilitiesTables() {
  const connection = await pool.getConnection();
  try {
    console.log('Initializing `facilities` and `facility_reservations` tables...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS facilities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(180) NOT NULL,
        category VARCHAR(80) NOT NULL DEFAULT 'SPA & WELLNESS',
        booking_type ENUM('COMPLIMENTARY', 'RESERVABLE', 'INQUIRY') NOT NULL DEFAULT 'COMPLIMENTARY',
        badge VARCHAR(80) NOT NULL DEFAULT 'SIGNATURE EXPERIENCE',
        hours VARCHAR(100) NOT NULL DEFAULT '08:00 AM – 09:00 PM',
        location VARCHAR(140) NOT NULL DEFAULT 'Main Resort Wing',
        access_note VARCHAR(160) NOT NULL DEFAULT 'Complimentary for In-House Guests',
        price_label VARCHAR(80) NOT NULL DEFAULT 'Complimentary',
        base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        max_guests INT NOT NULL DEFAULT 10,
        time_slots JSON NULL,
        service_options JSON NULL,
        highlights JSON NULL,
        image_url TEXT NULL,
        description TEXT NULL,
        status ENUM('OPEN', 'MAINTENANCE') NOT NULL DEFAULT 'OPEN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS facility_reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reference_code VARCHAR(32) NOT NULL UNIQUE,
        facility_id INT NOT NULL,
        user_id INT NULL,
        request_type ENUM('RESERVATION', 'INQUIRY') NOT NULL DEFAULT 'RESERVATION',
        guest_name VARCHAR(150) NOT NULL,
        guest_email VARCHAR(150) NOT NULL,
        guest_phone VARCHAR(40) NOT NULL,
        room_booking_ref VARCHAR(60) NULL,
        reservation_date DATE NOT NULL,
        time_slot VARCHAR(80) NULL,
        service_option VARCHAR(180) NULL,
        guests_count INT NOT NULL DEFAULT 2,
        estimated_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        special_requests TEXT NULL,
        status ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
        admin_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_facility_res_facility
          FOREIGN KEY (facility_id) REFERENCES facilities(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [[{ count }]] = await connection.query('SELECT COUNT(*) AS count FROM facilities');
    if (Number(count) === 0) {
      for (const item of SEED_FACILITIES) {
        await connection.query(
          `INSERT INTO facilities (
            title, category, booking_type, badge, hours, location,
            access_note, price_label, base_price, max_guests,
            time_slots, service_options, highlights, image_url, description, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.title,
            item.category,
            item.booking_type,
            item.badge,
            item.hours,
            item.location,
            item.access_note,
            item.price_label,
            item.base_price,
            item.max_guests,
            JSON.stringify(item.time_slots),
            JSON.stringify(item.service_options),
            JSON.stringify(item.highlights),
            item.image_url,
            item.description,
            item.status,
          ]
        );
      }
      console.log(`Seeded ${SEED_FACILITIES.length} luxury resort facilities.`);
    } else {
      console.log(`Facilities table already has ${count} records — skipping seed.`);
    }

    console.log('Facilities schema setup complete.');
  } catch (err) {
    console.error('Failed to initialize facilities tables:', err);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

initFacilitiesTables();
