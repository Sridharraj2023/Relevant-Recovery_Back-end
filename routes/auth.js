const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Admin login
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 1 }).withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Debug logs
    console.log('Login attempt:', { email, password });
    console.log('Environment variables:', { 
      ADMIN_EMAIL: process.env.ADMIN_EMAIL, 
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD 
    });

    // Check if credentials match environment variables
    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      console.log('Credentials mismatch:', {
        emailMatch: email === process.env.ADMIN_EMAIL,
        passwordMatch: password === process.env.ADMIN_PASSWORD
      });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const payload = {
      userId: 'admin',
      email: email,
      role: 'admin'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '24h'
    });

    res.json({
      token,
      user: {
        id: 'admin',
        name: 'Admin',
        email: email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', async (req, res) => {
  try {
    // For admin-only system, return admin info
    res.json({
      id: 'admin',
      name: 'Admin',
      email: process.env.ADMIN_EMAIL,
      role: 'admin'
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 