// Load environment variables from the .env file into process.env
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const pool = require('./config/db');

// Import route handlers for each API module
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const offerRoutes = require('./routes/offerRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const promoRoutes = require('./routes/promoRoutes');
const facilityRoutes = require('./routes/facilityRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// Build the list of allowed frontend origins for CORS from env or fallback defaults
const configuredOrigins = (
  process.env.CORS_ORIGINS ||
  'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Configure CORS to allow configured origins, local dev ports, and non-browser/same-origin requests
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      configuredOrigins.includes(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Parse incoming JSON request bodies
app.use(express.json());

// Serve uploaded files statically under the /uploads URL path
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check / root API status endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Serenity Bay Hotel API is running.' });
});

// Mount API route modules under their respective base paths
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/promo-codes', promoRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/uploads', uploadRoutes);

// Use PORT from environment variables or default to 5000
const PORT = process.env.PORT || 5000;

// Verify database connection first, then start the Express server
async function startServer() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL database connected successfully.');
    connection.release();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

startServer();