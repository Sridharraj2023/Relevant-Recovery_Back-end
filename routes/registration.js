const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const { adminAuth } = require('../middleware/auth');

// POST /api/registration
router.post('/', async (req, res) => {
  const { event, name, email, phone, location, city, state, country } = req.body;
  const errors = {};

  if (!event) errors.event = 'Event ID is required';
  if (!name) errors.name = 'Name is required';
  if (!email) errors.email = 'Email is required';
  else if (!/.+@.+\..+/.test(email)) errors.email = 'Please enter a valid email address';
  if (!city) errors.city = 'City is required';
  if (!state) errors.state = 'State is required';
  if (!country) errors.country = 'Country is required';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const registration = new Registration({ event, name, email, phone, location, city, state, country });
    await registration.save();
    return res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    return res.status(500).json({ errors: { server: 'Server error. Please try again.' } });
  }
});

// GET /api/registration/admin - Get all registrations (for admin)
router.get('/admin', adminAuth, async (req, res) => {
  try {
    const registrations = await Registration.find({})
      .populate('event', 'title date time place')
      .sort({ createdAt: -1 })
      .select('-__v');
    
    res.status(200).json(registrations);
  } catch (err) {
    console.error('Error fetching registrations:', err);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// GET /api/registration/:id - Get specific registration
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id).populate('event', 'title date time place');
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    res.status(200).json(registration);
  } catch (err) {
    console.error('Error fetching registration:', err);
    res.status(500).json({ error: 'Failed to fetch registration' });
  }
});

// DELETE /api/registration/:id - Delete registration
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const registration = await Registration.findByIdAndDelete(req.params.id);
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    res.status(200).json({ message: 'Registration deleted successfully' });
  } catch (err) {
    console.error('Error deleting registration:', err);
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

module.exports = router;
