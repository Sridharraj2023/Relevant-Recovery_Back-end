const express = require('express');
const { body, validationResult } = require('express-validator');
const Event = require('../models/Event');
const { adminAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads/events');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config for event images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/events'));
  },
  filename: function (req, file, cb) {
    const eventName = req.body.title ? req.body.title.replace(/\s+/g, '_') : 'event';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${eventName}_${timestamp}${ext}`);
  }
});
const upload = multer({ storage });

const router = express.Router();

// @route   GET /api/events
// @desc    Get all events (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events
// @desc    Create new event
// @access  Private (Admin only)
router.post('/', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const {
      date,
      title,
      time,
      place,
      cost,
      capacity,
      desc,
      highlights,
      specialGift,
      actionType
    } = req.body;

    // Highlights may come as a JSON string from form-data
    let highlightsArr = highlights;
    if (typeof highlights === 'string') {
      try { highlightsArr = JSON.parse(highlights); } catch { highlightsArr = [highlights]; }
    }

    // Image filename
    let imageFilename = req.file ? req.file.filename : '';

    const newEvent = new Event({
      date,
      title,
      time,
      place,
      cost,
      capacity,
      desc,
      image: imageFilename,
      highlights: highlightsArr,
      specialGift,
      actionType
    });

    const event = await newEvent.save();
    res.json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private (Admin only)
router.put('/:id', [
  adminAuth,
  body('date').notEmpty().withMessage('Date is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('time').notEmpty().withMessage('Time is required'),
  body('place').notEmpty().withMessage('Place is required'),
  body('desc').notEmpty().withMessage('Description is required'),
  body('actionType').notEmpty().withMessage('Action type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, title, time, place, desc, actionType, cost, capacity, image, highlights, specialGift } = req.body;

    let event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event = await Event.findByIdAndUpdate(
      req.params.id,
      { date, title, time, place, desc, actionType, cost, capacity, image, highlights, specialGift },
      { new: true }
    );

    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete event (soft delete)
// @access  Private (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event.isActive = false;
    await event.save();

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/events/admin
// @desc    Get all events for admin (including inactive)
// @access  Private (Admin only)
router.get('/admin', adminAuth, async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    console.error('Get admin events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 