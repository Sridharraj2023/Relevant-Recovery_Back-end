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

    // Robust validation
    const errors = {};
    if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 2) errors.firstName = 'First name is required (min 2 chars).';
    if (!lastName || typeof lastName !== 'string' || lastName.trim().length < 2) errors.lastName = 'Last name is required (min 2 chars).';
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'A valid email is required.';
    if (!amount || isNaN(amount) || Number(amount) <= 0) errors.amount = 'Amount must be greater than 0.';
    if (!paymentMethod || typeof paymentMethod !== 'string') errors.paymentMethod = 'Payment method is required.';
    if (phone && !/^[\d\-+() ]{7,20}$/.test(phone)) errors.phone = 'Phone number is invalid.';
    if (country && !/^[A-Z]{2}$/.test(country)) errors.country = 'Country must be a 2-letter code.';
    if (zip && !/^\w{3,12}$/.test(zip)) errors.zip = 'Zip/Postal code is invalid.';
    if (address && address.length < 3) errors.address = 'Address must be at least 3 characters.';
    if (city && city.length < 2) errors.city = 'City must be at least 2 characters.';
    if (state && state.length < 2) errors.state = 'State must be at least 2 characters.';
    if (emailWork && emailWork.length > 0 && !/^\S+@\S+\.\S+$/.test(emailWork)) errors.emailWork = 'Work email is invalid.';
    // Optionally validate org, title, etc.
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

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
      firstName, lastName, org, title, address, city, state, zip, country, phone, email, emailWork,
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