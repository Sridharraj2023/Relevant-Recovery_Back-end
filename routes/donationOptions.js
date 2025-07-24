const express = require('express');
const router = express.Router();
const DonationOption = require('../models/DonationOption');

// GET all active donation options, optionally filtered by type
router.get('/', async (req, res) => {
  try {
    const filter = { active: true };
    if (req.query.type) filter.type = req.query.type;
    const options = await DonationOption.find(filter).sort({ order: 1, amount: 1 });
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Create a new donation option
router.post('/', async (req, res) => {
  try {
    const { group, label, amount, type, order, active } = req.body;
    const option = new DonationOption({ group, label, amount, type, order, active });
    await option.save();
    res.status(201).json(option);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ADMIN: Update a donation option
router.put('/:id', async (req, res) => {
  try {
    const updated = await DonationOption.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ADMIN: Delete a donation option
router.delete('/:id', async (req, res) => {
  try {
    await DonationOption.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
