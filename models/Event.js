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
  place: {
    type: String,
    required: true,
    trim: true
  },
  cost: {
    type: String,
    required: true,
    trim: true
  },
  ticketCost: {
    type: Number,
    required: false,
    default: null
  },
  capacity: {
    type: Number,
    required: false
  },
  desc: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String, // filename only
    required: false,
    trim: true
  },
  highlights: {
    type: [String],
    required: false
  },
  specialGift: {
    type: String,
    required: false,
    trim: true
  },
  actionType: {
    type: String,
    required: true,
    trim: true
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