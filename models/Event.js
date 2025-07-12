const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  time: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  desc: {
    type: String,
    required: true,
    trim: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  free: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema); 