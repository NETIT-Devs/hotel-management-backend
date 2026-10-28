
const pool = require('../config/db');

// GET: Get all active rooms
exports.getAllRooms = async (req, res) => {
  try {
    const [rooms] = await pool.execute(
      `SELECT * FROM rooms
       WHERE status = 'ACTIVE'
       ORDER BY created_at DESC`
    );

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
      'SELECT * FROM rooms WHERE id = ? AND status = ?',
      [roomId, 'ACTIVE']
    );

    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    res.status(200).json({
      success: true,
      room: rooms[0],
    });
  } catch (error) {
    console.error('Get room error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve room.',
    });
  }
};


const VALID_ROOM_TYPES = ['DELUXE', 'SUITE', 'FAMILY', 'STANDARD'];

exports.createRoom = async (req, res) => {
  try {
    const {
      room_name,
      room_type,
      description,
      price_per_night,
      capacity,
      bed_type,
      size_sqm,
      image_url,
    } = req.body;

    if (
      typeof room_name !== 'string' ||
      !room_name.trim() ||
      !VALID_ROOM_TYPES.includes(room_type) ||
      price_per_night === undefined ||
      !Number.isFinite(Number(price_per_night)) ||
      Number(price_per_night) <= 0 ||
      !Number.isInteger(Number(capacity)) ||
      Number(capacity) < 1
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid room name, type, price and capacity.',
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO rooms
       (room_name, room_type, description, price_per_night,
        capacity, bed_type, size_sqm, image_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        room_name.trim(),
        room_type,
        description || null,
        Number(price_per_night),
        Number(capacity),
        bed_type || null,
        size_sqm ?? null,
        image_url || null,
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
