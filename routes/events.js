const express = require('express');
const { body, validationResult } = require('express-validator');
const Event = require('../models/Event');
const { adminAuth } = require('../middleware/auth');


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

// @route   GET /api/events/:id
// @desc    Get single event by ID (public)
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (!event.isActive) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Get single event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events
// @desc    Create new event
// @access  Private (Admin only)
router.post('/', adminAuth, async (req, res) => {
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

    // Validation (manual, since express-validator is not used here)
    if (!date || !title || !time || !place || !desc || !actionType || !cost) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Highlights may come as a JSON string
    let highlightsArr = highlights;
    if (typeof highlights === 'string') {
      try { highlightsArr = JSON.parse(highlights); } catch { highlightsArr = [highlights]; }
    }

    // Extract ticket cost from cost string for paid events
    let ticketCost = null;
    if (cost && cost !== 'Free' && cost.startsWith('$')) {
      ticketCost = parseFloat(cost.replace(/[^0-9.]/g, ''));
    }

    const newEvent = new Event({
      date,
      title,
      time,
      place,
      cost,
      ticketCost,
      capacity,
      desc,
      highlights: highlightsArr,
      specialGift,
      actionType,
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
router.put('/:id', adminAuth, async (req, res) => {
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
      specialGift
    } = req.body;

    // Validation (manual, since express-validator is not used here)
    if (!date || !title || !time || !place || !desc || !actionType || !cost) {
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

    // Extract ticket cost from cost string for paid events
    let ticketCost = null;
    if (cost && cost !== 'Free' && cost.startsWith('$')) {
      ticketCost = parseFloat(cost.replace(/[^0-9.]/g, ''));
    }

    event.date = date;
    event.title = title;
    event.time = time;
    event.place = place;
    event.desc = desc;
    event.actionType = actionType;
    event.cost = cost;
    event.ticketCost = ticketCost;
    event.capacity = capacity;
    event.highlights = highlightsArr;
    event.specialGift = specialGift;

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

module.exports = router; 