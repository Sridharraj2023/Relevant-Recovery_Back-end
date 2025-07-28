const router = require('express').Router();
const ContactMessage = require('../models/ContactMessage');

// POST /api/contact
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const errors = {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) errors.name = 'Full name is required (min 2 chars).';
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'A valid email is required.';
    if (!subject || typeof subject !== 'string' || subject.trim().length < 2) errors.subject = 'Subject is required (min 2 chars).';
    if (!message || typeof message !== 'string' || message.trim().length < 10) errors.message = 'Message must be at least 10 characters.';
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }
    const contactMessage = new ContactMessage({ name, email, subject, message });
    await contactMessage.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
