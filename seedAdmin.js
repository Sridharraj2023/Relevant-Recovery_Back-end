const fs = require('fs');
const path = require('path');
require('dotenv').config();

function createAdminEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    
    // Check if .env already exists
    if (fs.existsSync(envPath)) {
      const existingContent = fs.readFileSync(envPath, 'utf8');
      
      // Check if admin credentials already exist
      if (existingContent.includes('ADMIN_EMAIL=') && existingContent.includes('ADMIN_PASSWORD=')) {
        console.log('.env file already exists with admin credentials');
        console.log('Admin credentials:');
        console.log('Email: admin@example.com');
        console.log('Password: admin123');
        process.exit(0);
      }
      
      // Add missing admin credentials to existing .env file
      const adminCredentials = `
# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123`;
      
      fs.appendFileSync(envPath, adminCredentials);
      console.log('Admin credentials added to existing .env file');
      console.log('Admin credentials:');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
      process.exit(0);
    }

    // Create new .env file with admin credentials
    const envContent = `# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
MONGO_URI=mongodb://localhost:27017/relevant-recovery
PORT=5000

# Event Management
NODE_ENV=development`;

    fs.writeFileSync(envPath, envContent);
    
    console.log('Admin environment setup completed successfully!');
    console.log('Admin credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('.env file created with admin credentials');
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin environment:', err.message);
    process.exit(1);
  }
}

createAdminEnv(); 