const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
  // Donor Information
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  org: { type: String },
  title: { type: String },
  
  // Contact Information
  email: { type: String, required: true, index: true },
  emailWork: { type: String },
  phone: { type: String },
  
  // Address
  address: { type: String },
  city: { type: String },
  state: { type: String },
  zip: { type: String },  
  country: { type: String, default: 'US' },
  
  // Donation Details
  amount: { type: Number, required: true },
  currency: { type: String, default: 'usd' },
  
  // Payment Information
  paymentMethod: { 
    type: String, 
    required: true,
    enum: ['stripe', 'paypal', 'bank_transfer'],
    default: 'stripe'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'cancelled', 'succeeded', 'failed'],
    default: 'pending'
  },
  
  // Stripe Specific Fields
  stripePaymentIntentId: { type: String, index: true },
  stripeCustomerId: { type: String },
  stripePaymentMethod: { type: String },
  
  // Status Tracking
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending' 
  },
  
  // Additional Metadata
  metadata: { type: Map, of: String },
  error: { type: String },
  
  // Timestamps
  paidAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Add indexes for better query performance
DonationSchema.index({ email: 1, createdAt: -1 });
DonationSchema.index({ status: 1 });
DonationSchema.index({ 'metadata.customId': 1 }, { sparse: true });

module.exports = mongoose.model('Donation', DonationSchema); 