const mongoose = require('mongoose');

const ContactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 2 },
  email: { type: String, required: true, match: /^\S+@\S+\.\S+$/ },
  subject: { type: String, required: true, minlength: 2 },
  message: { type: String, required: true, minlength: 10 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ContactMessage', ContactMessageSchema);
