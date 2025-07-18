const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  org: { type: String },
  title: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  zip: { type: String },
  phone: { type: String },
  email: { type: String, required: true },
  emailWork: { type: String },
  volunteer: { type: Boolean, default: false },
  familyServices: { type: Boolean, default: false },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true }, // e.g., 'stripe', 'paypal'
  stripePaymentIntentId: { type: String },
  status: { type: String, default: 'pending' }, // 'pending', 'succeeded', 'failed'
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donation', DonationSchema); 