const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const adminCredPath = path.join(__dirname, '../adminCredentials.json');
let adminCreds = { email: '', password: '' };
if (fs.existsSync(adminCredPath)) {
  adminCreds = JSON.parse(fs.readFileSync(adminCredPath, 'utf8'));
}

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
    console.log('Admin creds:', adminCreds);

    // Check if credentials match environment variables
    if (email !== adminCreds.email || password !== adminCreds.password) {
      console.log('Credentials mismatch:', {
        emailMatch: email === adminCreds.email,
        passwordMatch: password === adminCreds.password
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
      email: adminCreds.email,
      role: 'admin'
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 