const fs = require('fs');
const path = require('path');
require('dotenv').config();

const adminCredPath = path.join(__dirname, 'adminCredentials.json');

function createAdminCredentials() {
  try {
    // Check if adminCredentials.json already exists
    if (fs.existsSync(adminCredPath)) {
      const creds = JSON.parse(fs.readFileSync(adminCredPath, 'utf8'));
      console.log('Admin credentials already exist:');
      console.log('Email:', creds.email);
      console.log('Password:', creds.password);
      process.exit(0);
    }
    // Create new admin credentials file
    const creds = {
      email: 'admin@example.com',
      password: 'admin123'
    };
    fs.writeFileSync(adminCredPath, JSON.stringify(creds, null, 2));
    console.log('Admin credentials created:');
    console.log('Email:', creds.email);
    console.log('Password:', creds.password);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin credentials:', err.message);
    process.exit(1);
  }
}

createAdminCredentials(); 