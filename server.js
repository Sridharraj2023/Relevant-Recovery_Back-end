// Load environment variables
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDb = require('./config/db');
const path = require('path');
const fs = require('fs');
const donations = require('./routes/donations');



// Ensure uploads/events directory exists
const uploadDir = path.join(__dirname, 'uploads/events');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads/events', express.static(path.join(__dirname, 'uploads/events')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/community-signups', require('./routes/communitySignups'));
app.use('/api/donations', donations);
app.use('/api/donation-options', require('./routes/donationOptions'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/registration', require('./routes/registration'));
// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Relevant Recovery API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

// Start server and connect to database
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDb();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 