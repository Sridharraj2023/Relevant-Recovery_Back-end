const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');

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

module.exports = router;
