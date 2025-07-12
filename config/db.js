const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://sridharraj0110:96000922@cluster0.vfztc85.mongodb.net/relevantrecovery', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDb;