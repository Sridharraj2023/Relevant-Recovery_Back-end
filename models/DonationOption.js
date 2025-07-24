const mongoose = require('mongoose');

const DonationOptionSchema = new mongoose.Schema({
  group: { type: String, required: true }, // e.g., 'Friend', 'Supporter', 'Sustainer', 'Membership', 'Sponsorship'
  label: { type: String, required: true }, // e.g., 'Family Membership', 'Class/Workshop Sponsorship'
  amount: { type: Number, required: true },
  type: { type: String, enum: ['contribution', 'membership', 'sponsorship'], required: true },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 } // for sorting in dropdowns
});

module.exports = mongoose.model('DonationOption', DonationOptionSchema);
