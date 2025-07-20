const fs = require('fs');
const path = require('path');

const adminCredPath = path.join(__dirname, 'adminCredentials.json');

if (!fs.existsSync(adminCredPath)) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required!');
    process.exit(1);
  }
  const creds = { email, password };
  fs.writeFileSync(adminCredPath, JSON.stringify(creds, null, 2));
  console.log('adminCredentials.json created from environment variables.');
} else {
  console.log('adminCredentials.json already exists.');
} 