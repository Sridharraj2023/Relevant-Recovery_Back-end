const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const adminCredPath = path.join(__dirname, '../adminCredentials.json');
let adminCreds = { email: '' };
if (fs.existsSync(adminCredPath)) {
  adminCreds = JSON.parse(fs.readFileSync(adminCredPath, 'utf8'));
}

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if the decoded token is for admin
    if (decoded.email !== adminCreds.email) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = {
      _id: 'admin',
      email: decoded.email,
      role: 'admin'
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if the decoded token is for admin
    if (decoded.email !== adminCreds.email) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = {
      _id: 'admin',
      email: decoded.email,
      role: 'admin'
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = { auth, adminAuth }; 