const pool = require('../config/db');

const INITIAL_GALLERY = [
  {
    title: 'Oceanfront Infinity Pool at Sunset',
    category: 'Facilities',
    image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=85&w=1200',
    caption: 'Unwind beside our heated infinity pool overlooking the Indian Ocean.',
    is_featured: 1,
  },
  {
    title: 'Private Pool Villa Sanctuary',
    category: 'Rooms & Suites',
    image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=85&w=1200',
    caption: 'Secluded tropical luxury with a private plunge pool and sun deck.',
    is_featured: 1,
  },
  {
    title: 'Twilight Resort Terrace',
    category: 'Resort Life',
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=85&w=1200',
    caption: 'Golden-hour serenity across the palm-lined coastal grounds.',
    is_featured: 1,
  },
  {
    title: 'Deluxe Ocean Suite Interior',
    category: 'Rooms & Suites',
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=85&w=1200',
    caption: 'Handcrafted timber textures and panoramic ocean balconies.',
    is_featured: 1,
  },
  {
    title: 'Candlelit Coastal Fine Dining',
    category: 'Dining',
    image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=85&w=1200',
    caption: 'Chef-curated island seafood paired with vintage cellar selections.',
    is_featured: 0,
  },
  {
    title: 'Ayurvedic Spa Pavilion',
    category: 'Facilities',
    image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=85&w=1200',
    caption: 'Restorative herbal rituals in an open-air tranquil sanctuary.',
    is_featured: 0,
  },
  {
    title: 'Sunset Villa Horizon View',
    category: 'Rooms & Suites',
    image_url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=85&w=1200',
    caption: 'Front-row seats to amber coastal evenings from your private deck.',
    is_featured: 0,
  },
  {
    title: 'Artisanal Breakfast by the Sea',
    category: 'Dining',
    image_url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=85&w=1200',
    caption: 'Fresh tropical fruits, Ceylon tea, and warm pastries served oceanfront.',
    is_featured: 0,
  },
  {
    title: 'Emerald Palm Courtyard',
    category: 'Resort Life',
    image_url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=85&w=1200',
    caption: 'Lush tropical pathways leading directly to the private beach.',
    is_featured: 0,
  },
  {
    title: 'Ocean Suite Master Lounge',
    category: 'Rooms & Suites',
    image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=85&w=1200',
    caption: 'Expansive residential comfort designed for unforgettable stays.',
    is_featured: 0,
  },
  {
    title: 'Private Beach Cabanas',
    category: 'Facilities',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=85&w=1200',
    caption: 'Dedicated butler service along our pristine golden shoreline.',
    is_featured: 0,
  },
  {
    title: 'Signature Sunset Cocktails',
    category: 'Dining',
    image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=85&w=1200',
    caption: 'Botanical infusions crafted daily at the Coral Lounge Bar.',
    is_featured: 0,
  },
];

async function run() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS gallery (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        category VARCHAR(80) NOT NULL DEFAULT 'Resort Life',
        image_url VARCHAR(500) NOT NULL,
        caption TEXT NULL,
        is_featured TINYINT(1) NOT NULL DEFAULT 0,
        status ENUM('ACTIVE', 'HIDDEN') NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [existing] = await pool.execute('SELECT COUNT(*) AS cnt FROM gallery');
    if (existing[0].cnt === 0) {
      for (const item of INITIAL_GALLERY) {
        await pool.execute(
          `INSERT INTO gallery (title, category, image_url, caption, is_featured, status)
           VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
          [item.title, item.category, item.image_url, item.caption, item.is_featured]
        );
      }
      console.log(`Seeded ${INITIAL_GALLERY.length} luxury gallery photos.`);
    } else {
      console.log(`Gallery table already has ${existing[0].cnt} items.`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Gallery init failed:', err);
    process.exit(1);
  }
}

run();
