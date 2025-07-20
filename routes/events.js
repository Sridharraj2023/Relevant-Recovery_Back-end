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
    // Sanitize event title for filename
    const eventName = req.body.title
      ? req.body.title.replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'event';
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
      actionType,
      free
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
      actionType,
      free: free === 'true' || free === true
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
router.put('/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const {
      date,
      title,
      time,
      place,
      desc,
      actionType,
      cost,
      capacity,
      highlights,
      specialGift,
      free
    } = req.body;

    // Validation (manual, since express-validator is not used here)
    if (!date || !title || !time || !place || !desc || !actionType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Handle highlights (may come as JSON string)
    let highlightsArr = highlights;
    if (typeof highlights === 'string') {
      try { highlightsArr = JSON.parse(highlights); } catch { highlightsArr = [highlights]; }
    }

    // Handle image update
    let imageFilename = event.image; // default to existing image
    if (req.file) {
      // Optionally delete old image file
      if (event.image) {
        const oldImagePath = path.join(__dirname, '../uploads/events', event.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imageFilename = req.file.filename;
    }

    event.date = date;
    event.title = title;
    event.time = time;
    event.place = place;
    event.desc = desc;
    event.actionType = actionType;
    event.cost = cost;
    event.capacity = capacity;
    event.highlights = highlightsArr;
    event.specialGift = specialGift;
    event.image = imageFilename;
    event.free = free === 'true' || free === true;

    await event.save();
    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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