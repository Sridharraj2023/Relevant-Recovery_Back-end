const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // For guest checkout
  },
  // Customer information
  customer: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: false
    },
    address: {
      city: String,
      state: String,
      country: String
    }
  },
  // Ticket details
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'usd',
    uppercase: true
  },
  // Payment information
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentIntentId: {
    type: String,
    required: false
  },
  paymentMethod: {
    type: String,
    required: false
  },
  // Ticket status
  status: {
    type: String,
    enum: ['reserved', 'confirmed', 'cancelled', 'used'],
    default: 'reserved'
  },
  // Additional metadata
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes for better query performance
ticketSchema.index({ event: 1 });
ticketSchema.index({ 'customer.email': 1 });
ticketSchema.index({ paymentIntentId: 1 }, { unique: true, sparse: true });

// Virtual for ticket reference number
ticketSchema.virtual('ticketNumber').get(function() {
  return `TKT-${this._id.toString().substring(18, 24).toUpperCase()}`;
});

// Pre-save hook to calculate total amount
ticketSchema.pre('save', function(next) {
  if (this.isModified('quantity') || this.isModified('unitPrice')) {
    this.totalAmount = this.quantity * this.unitPrice;
  }
  next();
});

// Static method to get ticket statistics
ticketSchema.statics.getEventStats = async function(eventId) {
  const stats = await this.aggregate([
    {
      $match: { event: mongoose.Types.ObjectId(eventId) }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  return stats;
};

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
