const pool = require('../config/db');

const VALID_ROOM_TYPES = ['DELUXE', 'SUITE', 'FAMILY', 'STANDARD', 'VILLA'];

const parseJsonArray = (val, fallback = []) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return fallback;
};

const toJsonString = (val) => {
  if (val === undefined || val === null) return null;
  if (Array.isArray(val)) return JSON.stringify(val.map((s) => String(s).trim()).filter(Boolean));
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return JSON.stringify([]);
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {
      return JSON.stringify(trimmed.split('\n').map((s) => s.trim()).filter(Boolean));
    }
  }
  return null;
};

const formatRoomRow = (r) => {
  const defaultImg = r.image_url || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800';
  const images = parseJsonArray(r.images, [defaultImg]);
  const galleryImages = parseJsonArray(r.gallery_images, images.slice(0, 4));
  return {
    ...r,
    resident_price_per_night:
      Number(r.resident_price_per_night) > 0
        ? Number(r.resident_price_per_night)
        : Math.round(Number(r.price_per_night || 280) * 0.75),
    child_extra_bed_price:
      r.child_extra_bed_price !== null && r.child_extra_bed_price !== undefined
        ? Number(r.child_extra_bed_price)
        : 25,
    resident_child_extra_bed_price:
      r.resident_child_extra_bed_price !== null && r.resident_child_extra_bed_price !== undefined
        ? Number(r.resident_child_extra_bed_price)
        : 15,
    image_url: r.image_url || images[0] || defaultImg,
    special_features: parseJsonArray(r.special_features, []),
    amenities: parseJsonArray(r.amenities, []),
    images: images.length > 0 ? images : [defaultImg],
    gallery_images: galleryImages.length > 0 ? galleryImages : [defaultImg],
  };
};

// GET: Get all rooms (supports ?all=true for admin or returns all rooms with status)
exports.getAllRooms = async (req, res) => {
  try {
    const includeAll = req.query.all === 'true';
    const sql = includeAll
      ? 'SELECT * FROM rooms ORDER BY id ASC'
      : "SELECT * FROM rooms WHERE status = 'ACTIVE' ORDER BY id ASC";
    const [rows] = await pool.execute(sql);
    const rooms = rows.map(formatRoomRow);

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    console.error('Get rooms error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve rooms.',
    });
  }
};

// GET: Check room availability for given date range & guests
exports.checkRoomAvailability = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const checkIn = req.query.checkIn || today;
    const checkOut = req.query.checkOut || tomorrow;
    const guests = Math.max(1, Number(req.query.guests) || 1);
    const roomsCount = Math.max(1, Number(req.query.roomsCount) || 1);

    const [rooms] = await pool.execute(
      `SELECT
         r.*,
         COALESCE(r.total_units, 10) AS total_units,
         COALESCE(b.booked_units, 0) AS booked_units,
         CASE
           WHEN r.status = 'MAINTENANCE' THEN 0
           ELSE GREATEST(COALESCE(r.total_units, 10) - COALESCE(b.booked_units, 0), 0)
         END AS available_units
       FROM rooms r
       LEFT JOIN (
         SELECT
           room_id,
           SUM(COALESCE(rooms_count, 1)) AS booked_units
         FROM bookings
         WHERE status IN ('APPROVED', 'PENDING')
           AND check_in < ?
           AND check_out > ?
         GROUP BY room_id
       ) b ON b.room_id = r.id
       ORDER BY r.id ASC`,
      [checkOut, checkIn]
    );

    const resultRooms = rooms.map((r) => {
      const formatted = formatRoomRow(r);
      const availableUnits = Number(r.available_units) || 0;
      const isAvailable =
        r.status === 'ACTIVE' && availableUnits >= roomsCount;
      return {
        ...formatted,
        available_units: availableUnits,
        booked_units: Number(r.booked_units) || 0,
        total_units: Number(r.total_units) || 10,
        is_available: isAvailable,
        meets_capacity: Number(r.capacity || 2) * roomsCount >= guests,
      };
    });

    return res.status(200).json({
      success: true,
      checkIn,
      checkOut,
      guests,
      roomsCount,
      count: resultRooms.length,
      rooms: resultRooms,
    });
  } catch (error) {
    console.error('Check availability error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to check room availability.',
    });
  }
};

// GET: Get one room by ID
exports.getRoomById = async (req, res) => {
  try {
    const roomId = Number(req.params.id);

    if (!Number.isInteger(roomId) || roomId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID.',
      });
    }

    const [rooms] = await pool.execute(
      'SELECT * FROM rooms WHERE id = ?',
      [roomId]
    );

    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    res.status(200).json({
      success: true,
      room: formatRoomRow(rooms[0]),
    });
  } catch (error) {
    console.error('Get room error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve room.',
    });
  }
};

// POST: Create a new room
exports.createRoom = async (req, res) => {
  try {
    const {
      room_name,
      room_type = 'DELUXE',
      category = 'Deluxe Rooms',
      allowed_package = 'All Rooms & Suites',
      guests_label,
      view_type = 'Ocean View',
      description,
      long_description,
      room_overview,
      special_features,
      amenities,
      price_per_night,
      resident_price_per_night,
      child_extra_bed_price = 25,
      resident_child_extra_bed_price = 15,
      capacity = 2,
      bed_type = 'King Bed',
      size_sqm = 45,
      total_units = 5,
      image_url,
      video_url,
      images,
      gallery_images,
      status = 'ACTIVE',
    } = req.body;

    const normalizedType = String(room_type || 'DELUXE').toUpperCase();

    if (
      typeof room_name !== 'string' ||
      !room_name.trim() ||
      price_per_night === undefined ||
      !Number.isFinite(Number(price_per_night)) ||
      Number(price_per_night) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid room name and price per night.',
      });
    }

    const cap = Math.max(1, Number(capacity) || 2);
    const primaryImg =
      image_url ||
      (Array.isArray(images) && images[0]) ||
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800';
    const imagesJson = toJsonString(images && images.length ? images : [primaryImg]);
    const galleryJson = toJsonString(gallery_images && gallery_images.length ? gallery_images : [primaryImg]);

    const residentPrice =
      resident_price_per_night && Number(resident_price_per_night) > 0
        ? Number(resident_price_per_night)
        : Math.round(Number(price_per_night) * 0.75);
    const childBedPrice = Math.max(0, Number(child_extra_bed_price ?? 25) || 0);
    const residentChildBedPrice = Math.max(0, Number(resident_child_extra_bed_price ?? 15) || 0);

    const [result] = await pool.execute(
      `INSERT INTO rooms
       (room_name, room_type, category, allowed_package, guests_label, view_type,
        description, long_description, room_overview, special_features, amenities,
        price_per_night, resident_price_per_night, child_extra_bed_price, resident_child_extra_bed_price, capacity, bed_type, size_sqm, total_units,
        image_url, video_url, images, gallery_images, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        room_name.trim(),
        VALID_ROOM_TYPES.includes(normalizedType) ? normalizedType : 'DELUXE',
        category || 'Deluxe Rooms',
        allowed_package || 'All Rooms & Suites',
        guests_label || `${cap} Adults`,
        view_type || 'Ocean View',
        description || null,
        long_description || description || null,
        room_overview || long_description || description || null,
        toJsonString(special_features || []),
        toJsonString(amenities || []),
        Number(price_per_night),
        residentPrice,
        childBedPrice,
        residentChildBedPrice,
        cap,
        bed_type || 'King Bed',
        size_sqm ? Number(String(size_sqm).replace(/[^0-9.]/g, '')) || 45 : 45,
        Math.max(1, Number(total_units) || 5),
        primaryImg,
        video_url || null,
        imagesJson,
        galleryJson,
        ['ACTIVE', 'MAINTENANCE'].includes(status) ? status : 'ACTIVE',
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Room created successfully.',
      roomId: result.insertId,
    });
  } catch (error) {
    console.error('Create room error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create room.',
    });
  }
};

// PUT: Full update room
exports.updateRoom = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID.',
      });
    }

    const {
      room_name,
      room_type = 'DELUXE',
      category = 'Deluxe Rooms',
      allowed_package = 'All Rooms & Suites',
      guests_label,
      view_type = 'Ocean View',
      description,
      long_description,
      room_overview,
      special_features,
      amenities,
      price_per_night,
      resident_price_per_night,
      child_extra_bed_price = 25,
      resident_child_extra_bed_price = 15,
      capacity = 2,
      bed_type = 'King Bed',
      size_sqm = 45,
      total_units = 5,
      image_url,
      video_url,
      images,
      gallery_images,
      status = 'ACTIVE',
    } = req.body;

    if (!room_name || !String(room_name).trim() || Number(price_per_night) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Room name and valid price are required.',
      });
    }

    const normalizedType = String(room_type || 'DELUXE').toUpperCase();
    const cap = Math.max(1, Number(capacity) || 2);
    const primaryImg =
      image_url ||
      (Array.isArray(images) && images[0]) ||
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800';
    const imagesJson = toJsonString(images && images.length ? images : [primaryImg]);
    const galleryJson = toJsonString(gallery_images && gallery_images.length ? gallery_images : [primaryImg]);

    const residentPriceUpdate =
      resident_price_per_night && Number(resident_price_per_night) > 0
        ? Number(resident_price_per_night)
        : Math.round(Number(price_per_night) * 0.75);
    const childBedPriceUpdate = Math.max(0, Number(child_extra_bed_price ?? 25) || 0);
    const residentChildBedPriceUpdate = Math.max(0, Number(resident_child_extra_bed_price ?? 15) || 0);

    const [result] = await pool.execute(
      `UPDATE rooms
       SET room_name = ?,
           room_type = ?,
           category = ?,
           allowed_package = ?,
           guests_label = ?,
           view_type = ?,
           description = ?,
           long_description = ?,
           room_overview = ?,
           special_features = ?,
           amenities = ?,
           price_per_night = ?,
           resident_price_per_night = ?,
           child_extra_bed_price = ?,
           resident_child_extra_bed_price = ?,
           capacity = ?,
           bed_type = ?,
           size_sqm = ?,
           total_units = ?,
           image_url = ?,
           video_url = ?,
           images = ?,
           gallery_images = ?,
           status = ?
       WHERE id = ?`,
      [
        String(room_name).trim(),
        VALID_ROOM_TYPES.includes(normalizedType) ? normalizedType : 'DELUXE',
        category || 'Deluxe Rooms',
        allowed_package || 'All Rooms & Suites',
        guests_label || `${cap} Adults`,
        view_type || 'Ocean View',
        description || null,
        long_description || description || null,
        room_overview || long_description || description || null,
        toJsonString(special_features || []),
        toJsonString(amenities || []),
        Number(price_per_night),
        residentPriceUpdate,
        childBedPriceUpdate,
        residentChildBedPriceUpdate,
        cap,
        bed_type || 'King Bed',
        size_sqm ? Number(String(size_sqm).replace(/[^0-9.]/g, '')) || 45 : 45,
        Math.max(1, Number(total_units) || 5),
        primaryImg,
        video_url || null,
        imagesJson,
        galleryJson,
        ['ACTIVE', 'MAINTENANCE'].includes(status) ? status : 'ACTIVE',
        roomId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Room updated successfully.',
    });
  } catch (error) {
    console.error('Update room error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update room.',
    });
  }
};

// PATCH: Update room status
exports.updateRoomStatus = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    const { status } = req.body;

    if (
      !Number.isInteger(roomId) ||
      roomId < 1 ||
      !['ACTIVE', 'MAINTENANCE'].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID or status.',
      });
    }

    const [result] = await pool.execute(
      'UPDATE rooms SET status = ? WHERE id = ?',
      [status, roomId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Room status updated successfully.',
    });
  } catch (error) {
    console.error('Update room status error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update room status.',
    });
  }
};

// DELETE: Delete a room
exports.deleteRoom = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID.',
      });
    }

    await pool.execute('DELETE FROM bookings WHERE room_id = ?', [roomId]);
    const [result] = await pool.execute('DELETE FROM rooms WHERE id = ?', [roomId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Room deleted successfully.',
    });
  } catch (error) {
    console.error('Delete room error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete room.',
    });
  }
};
