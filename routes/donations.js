const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// POST /api/donations
router.post('/', async (req, res) => {
  try {
    const {
      firstName, lastName, org, title, address, city, state, zip, country, phone, email, emailWork,
      volunteer, familyServices, amount, paymentMethod
    } = req.body;

    let stripePaymentIntentId = null;
    let clientSecret = null;

    if (paymentMethod === 'stripe') {
      // Create Stripe PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(Number(amount) * 100), // Stripe expects cents
  currency: 'usd',
  receipt_email: email,
  description: `Donation from ${firstName} ${lastName}${org ? ' (' + org + ')' : ''}`,
  shipping: {
    name: `${firstName} ${lastName}`,
    address: {
      line1: address,
      city: city,
      state: state,
      postal_code: zip,
      country: country || 'US', // Use user's country, default to US
    },
  },
  metadata: {
    firstName, lastName, org, title, address, city, state, zip, country: country || 'US', phone, emailWork, volunteer, familyServices
  }
});
      stripePaymentIntentId = paymentIntent.id;
      clientSecret = paymentIntent.client_secret;
    }

    // Save donation record (no card data)
    const donation = new Donation({
      firstName, lastName, org, title, address, city, state, zip, phone, email, emailWork,
      volunteer, familyServices, amount, paymentMethod, stripePaymentIntentId, status: 'pending'
    });
    await donation.save();

    res.json({
      donation,
      stripeClientSecret: clientSecret
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 