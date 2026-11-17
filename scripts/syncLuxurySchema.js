const pool = require('../config/db');

const ROOMS_SEED = [
  {
    id: 1,
    room_name: 'Deluxe Ocean Room',
    category: 'Deluxe Rooms',
    allowed_package: 'Honeymoon & Romantic Getaway',
    guests_label: '2 Adults',
    view_type: 'Ocean View',
    description: 'A perfect blend of comfort and elegance with stunning ocean views.',
    long_description:
      'Step into a world of elegance in our Deluxe Ocean Room, featuring modern luxury design, premium amenities, and panoramic views of the Indian Ocean. Unwind on your private balcony while listening to the soothing waves, and experience unmatched comfort tailored for an unforgettable getaway.',
    room_overview:
      'Immerse yourself in absolute coastal elegance within our Deluxe Ocean Room. Designed as a sanctuary for discerning travelers, this residence features plush hand-crafted furnishings, rich wooden textures, and floor-to-ceiling glass doors that open onto a private ocean-facing balcony. Rejuvenate beneath a spa-inspired rainfall shower, unwind on a signature king bed with pillow-top mattresses and silk-soft linens, and awaken each morning to the soothing melody of crashing waves and panoramic views of the turquoise sea.',
    special_features: [
      'Private balcony with ocean view',
      'Luxurious bathroom amenities',
      '24/7 Room Service',
    ],
    amenities: ['Balcony', 'Free Wi-Fi', 'Air Conditioning'],
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-luxury-resort-overwater-bungalows-41584-large.mp4',
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=800',
    ],
    gallery_images: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=800',
    ],
  },
  {
    id: 2,
    room_name: 'Private Pool Villa',
    category: 'Pool Villas',
    allowed_package: 'Luxury Private Pool Villa',
    guests_label: '2 Adults',
    view_type: 'Pool View',
    description: 'Secluded villa with private infinity pool and lush tropical surroundings.',
    long_description:
      'Designed for ultimate privacy and indulgence, the Private Pool Villa offers a secluded sanctuary featuring your own private infinity pool set against lush tropical surroundings. Enjoy personalized in-room dining, expansive open-air living spaces, and a peaceful atmosphere made for true relaxation.',
    room_overview:
      'An ultra-exclusive haven of solitude, the Private Pool Villa combines tropical opulence with complete architectural privacy. Tucked away amidst lush island foliage, your villa opens to an expansive teak wood sun deck and a breathtaking private infinity plunge pool. Indoors, experience residential luxury with custom artisan decor, an oversized soaking tub, personalized 24/7 butler service, and romantic open-air dining settings designed for unforgettable moments.',
    special_features: [
      'Private infinity pool & sun deck',
      'Secluded tropical garden',
      'Personalized in-room dining',
    ],
    amenities: ['Private Pool', 'Free Wi-Fi', 'In-room Dining'],
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-luxury-resort-overwater-bungalows-41584-large.mp4',
    images: [
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&q=80&w=800',
    ],
    gallery_images: [
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80&w=800',
    ],
  },
  {
    id: 3,
    room_name: 'Ocean Suite',
    category: 'Suites',
    allowed_package: 'Honeymoon & Romantic Getaway',
    guests_label: '2 Adults',
    view_type: 'Ocean View',
    description: 'Spacious luxury with panoramic ocean views and private lounge space.',
    long_description:
      'Immerse yourself in elevated luxury within our Ocean Suite. Boasting an expansive private lounge area and breathtaking ocean vistas, this suite offers a seamless fusion of refined sophistication and residential warmth—perfect for couples seeking a memorable coastal retreat.',
    room_overview:
      'A masterclass in coastal grandeur, the Ocean Suite offers an expansive multi-room retreat framed by uninterrupted horizon vistas. Featuring a grand master bedroom, a separate formal living lounge, and a wide private terrace, this suite harmonizes modern luxury with residential warmth. Indulge in bespoke room refreshments from your private bar, refresh in a marble-clad bathroom with ocean-view tubs, and enjoy sunset champagne tailored for an elevated coastal escape.',
    special_features: [
      'Panoramic floor-to-ceiling ocean windows',
      'Dedicated private lounge area',
      'Complimentary sunset champagne',
    ],
    amenities: ['Living Area', 'Balcony', 'Free Wi-Fi'],
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-luxury-resort-overwater-bungalows-41584-large.mp4',
    images: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&q=80&w=800',
    ],
    gallery_images: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800',
    ],
  },
  {
    id: 4,
    room_name: 'Garden Villa',
    category: 'Villas',
    allowed_package: 'Wellness & Ayurveda Retreat',
    guests_label: '2 Adults',
    view_type: 'Garden View',
    description: 'Surrounded by nature, designed for tranquility and restorative peace.',
    long_description:
      'Nestled within lush, tranquil greenery, the Garden Villa is an oasis of peace designed for restorative tranquility. Step out onto your private sun terrace, breathe in the fresh natural surroundings, and reconnect with nature in an atmosphere of complete quietude and charm.',
    room_overview:
      'Enveloped by a tranquil canopy of emerald greenery, the Garden Villa is a peaceful sanctuary dedicated to holistic wellness and natural harmony. The villa showcases organic architecture, natural stone finishes, and seamless indoor-outdoor living spaces. Step onto your private shaded garden terrace, soak in the restorative serenity of nature, and revitalize your senses under a secluded outdoor rainfall shower surrounded by exotic tropical flora.',
    special_features: [
      'Private sun terrace amidst greenery',
      'Outdoor rain shower experience',
      'Organic herbal tea station',
    ],
    amenities: ['Terrace', 'Free Wi-Fi', 'Air Conditioning'],
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-sunlight-entering-a-modern-hotel-room-41585-large.mp4',
    images: [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=800',
    ],
    gallery_images: [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800',
    ],
  },
  {
    id: 5,
    room_name: 'Family Suite',
    category: 'Suites',
    allowed_package: 'All Rooms & Suites',
    guests_label: '4 Adults',
    view_type: 'Ocean View',
    description: 'More space, more moments together with multi-room luxury comfort.',
    long_description:
      'Crafted to bring loved ones together, the Family Suite offers generous multi-room luxury without compromising on privacy or style. Featuring two opulent master bedrooms, elegant communal spaces, and top-tier amenities, it provides the perfect backdrop for cherished family moments.',
    room_overview:
      "Generously proportioned and thoughtfully curated for multi-generational comfort, the Family Suite offers an unparalleled blend of shared luxury and individual privacy. Boasting two opulent master suites, an expansive central lounge for quality togetherness, and interactive entertainment setups, every family member is treated to supreme comfort. Complete with bespoke children's welcome amenities and dedicated family concierge services, it serves as your home away from home.",
    special_features: [
      'Two spacious master bedrooms',
      'Interconnected family living space',
      "Special children's welcome amenities",
    ],
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'Breakfast Included'],
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-interior-of-a-luxury-hotel-room-41583-large.mp4',
    images: [
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=800',
    ],
    gallery_images: [
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800',
    ],
  },
  {
    id: 6,
    room_name: 'Sunset Villa',
    category: 'Pool Villas',
    allowed_package: 'Luxury Private Pool Villa',
    guests_label: '2 Adults',
    view_type: 'Ocean View',
    description: 'Unforgettable views, exclusive comfort, and breathtaking golden-hour vistas.',
    long_description:
      'Positioned perfectly to capture the magical golden hour, the Sunset Villa combines breathtaking coastal views with exclusive private pool luxury. Bask in the warm glow of the evening sky from your private deck, enjoying uncompromised comfort in a truly romantic setting.',
    room_overview:
      "Strategically positioned to capture the island's most spectacular daily sunset, the Sunset Villa offers front-row seats to nature's golden-hour radiance. Relax in your private outdoor pool as the sky paints shades of amber and rose, or sink into an oversized plush bed angled directly toward the horizon. Featuring rich warm lighting, private evening turndown rituals, and uninterrupted sea views, it represents the absolute pinnacle of romantic indulgence.",
    special_features: [
      'Prime west-facing sunset deck',
      'Private plunge pool with view',
      'Evening turndown service',
    ],
    amenities: ['Private Pool', 'Free Wi-Fi', 'Air Conditioning'],
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-luxury-resort-overwater-bungalows-41584-large.mp4',
    images: [
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&q=80&w=800',
    ],
    gallery_images: [
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80&w=800',
    ],
  },
];

const OFFERS_SEED = [
  {
    id: 1,
    features: ['Luxury room stay', 'Breakfast for two', 'Late checkout'],
    terms: [
      'Offer is subject to room availability.',
      'Advance reservation is required.',
      'Valid for selected room categories only.',
      'This offer cannot be combined with other promotions.',
    ],
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1400&q=85',
    ],
  },
  {
    id: 2,
    features: ['Minimum 3 nights stay', 'Complimentary Wi-Fi', 'Premium Services'],
    terms: [
      'A minimum stay of three nights is required.',
      'Offer is subject to room availability.',
      'Complimentary Wi-Fi applies to all registered guests during the stay.',
      'Cancellation must be made at least 48 hours prior to check-in.',
    ],
    images: [
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1400&q=85',
    ],
  },
  {
    id: 3,
    features: ['Advance Reservation', 'Selected Rooms', 'Flexible Travel'],
    terms: [
      'Booking must be made at least 30 days in advance.',
      'Offer is subject to room availability and seasonal dates.',
      'A non-refundable deposit is required at the time of booking.',
      'Valid only for selected room categories specified in the promotion.',
    ],
    images: [
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1400&q=85',
    ],
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
    // 1. Rooms luxury columns
    await addColumnIfMissing('rooms', 'category', "VARCHAR(100) DEFAULT 'Deluxe Rooms'");
    await addColumnIfMissing('rooms', 'allowed_package', "VARCHAR(150) DEFAULT 'All Rooms & Suites'");
    await addColumnIfMissing('rooms', 'guests_label', "VARCHAR(50) DEFAULT '2 Adults'");
    await addColumnIfMissing('rooms', 'view_type', "VARCHAR(80) DEFAULT 'Ocean View'");
    await addColumnIfMissing('rooms', 'long_description', 'TEXT NULL');
    await addColumnIfMissing('rooms', 'room_overview', 'TEXT NULL');
    await addColumnIfMissing('rooms', 'special_features', 'LONGTEXT NULL');
    await addColumnIfMissing('rooms', 'amenities', 'LONGTEXT NULL');
    await addColumnIfMissing('rooms', 'video_url', 'VARCHAR(500) NULL');
    await addColumnIfMissing('rooms', 'images', 'LONGTEXT NULL');
    await addColumnIfMissing('rooms', 'gallery_images', 'LONGTEXT NULL');

    // 2. Offers luxury columns
    await addColumnIfMissing('offers', 'images', 'LONGTEXT NULL');

    // 3. Backfill rooms 1..6
    for (const r of ROOMS_SEED) {
      await pool.execute(
        `UPDATE rooms
         SET category = COALESCE(NULLIF(category, ''), ?),
             allowed_package = COALESCE(NULLIF(allowed_package, ''), ?),
             guests_label = COALESCE(NULLIF(guests_label, ''), ?),
             view_type = COALESCE(NULLIF(view_type, ''), ?),
             description = COALESCE(NULLIF(description, ''), ?),
             long_description = COALESCE(long_description, ?),
             room_overview = COALESCE(room_overview, ?),
             special_features = COALESCE(special_features, ?),
             amenities = COALESCE(amenities, ?),
             video_url = COALESCE(video_url, ?),
             images = COALESCE(images, ?),
             gallery_images = COALESCE(gallery_images, ?),
             status = 'ACTIVE'
         WHERE id = ?`,
        [
          r.category,
          r.allowed_package,
          r.guests_label,
          r.view_type,
          r.description,
          r.long_description,
          r.room_overview,
          JSON.stringify(r.special_features),
          JSON.stringify(r.amenities),
          r.video_url,
          JSON.stringify(r.images),
          JSON.stringify(r.gallery_images),
          r.id,
        ]
      );
    }

    // Also ensure all rooms have category/amenities populated even if previously 'Deluxe Rooms' default was set
    for (const r of ROOMS_SEED) {
      await pool.execute(
        `UPDATE rooms SET category = ?, allowed_package = ?, guests_label = ?, view_type = ? WHERE id = ?`,
        [r.category, r.allowed_package, r.guests_label, r.view_type, r.id]
      );
    }

    // 4. Backfill offers 1..3
    for (const o of OFFERS_SEED) {
      await pool.execute(
        `UPDATE offers
         SET features = COALESCE(NULLIF(features, ''), ?),
             terms = COALESCE(NULLIF(terms, ''), ?),
             images = COALESCE(NULLIF(images, ''), ?)
         WHERE id = ?`,
        [
          JSON.stringify(o.features),
          JSON.stringify(o.terms),
          JSON.stringify(o.images),
          o.id,
        ]
      );
    }

    console.log('Luxury schema & seed sync completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
