const express = require('express');
const router = express.Router();
const CommunitySignup = require('../models/CommunitySignup');

// @route   POST /api/community-signups
// @desc    Register a new community signup
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }
    const signup = new CommunitySignup({ name, email });
    await signup.save();
    res.status(201).json({ message: 'Registration successful!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

module.exports = router; 