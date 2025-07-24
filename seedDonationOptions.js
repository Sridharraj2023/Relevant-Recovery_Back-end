const mongoose = require('mongoose');
const dotenv = require('dotenv');
const DonationOption = require('./models/DonationOption');

dotenv.config();

const options = [
  // Contributions
  { group: 'Friend', label: '$25', amount: 25, type: 'contribution', order: 1 },
  { group: 'Friend', label: '$50', amount: 50, type: 'contribution', order: 2 },
  { group: 'Friend', label: '$100', amount: 100, type: 'contribution', order: 3 },
  { group: 'Friend', label: '$250', amount: 250, type: 'contribution', order: 4 },

  { group: 'Supporter', label: '$500', amount: 500, type: 'contribution', order: 5 },
  { group: 'Supporter', label: '$1,000', amount: 1000, type: 'contribution', order: 6 },
  { group: 'Supporter', label: '$2,500', amount: 2500, type: 'contribution', order: 7 },

  { group: 'Sustainer', label: '$5,000', amount: 5000, type: 'contribution', order: 8 },
  { group: 'Sustainer', label: '$10,000', amount: 10000, type: 'contribution', order: 9 },

  // Memberships
  { group: 'Membership', label: 'Family Membership', amount: 100, type: 'membership', order: 10 },
  { group: 'Membership', label: 'Organizational Membership', amount: 250, type: 'membership', order: 11 },

  // Sponsorships
  { group: 'Sponsorship', label: 'Class/Workshop Sponsorship', amount: 1000, type: 'sponsorship', order: 12 },
  { group: 'Sponsorship', label: 'Program Sponsorship', amount: 5000, type: 'sponsorship', order: 13 },
  { group: 'Sponsorship', label: 'Special Events Sponsorship', amount: 10000, type: 'sponsorship', order: 14 },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    await DonationOption.deleteMany({});
    await DonationOption.insertMany(options);
    console.log('Donation options seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
