const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const stripeOptions = {};
const crypto = require('crypto');
if (process.env.STRIPE_API_BASE_URL) {
  // Only for local stripe-mock
  const url = new URL(process.env.STRIPE_API_BASE_URL);
  stripeOptions.host = url.hostname;
  stripeOptions.port = Number(url.port);
  stripeOptions.protocol = url.protocol.replace(':', '');
}
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, stripeOptions);

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

    try {
      // Create a customer in Stripe
      const customer = await stripe.customers.create({
        email,
        name: `${firstName} ${lastName}`,
        phone,
        metadata: {
          firstName,
          lastName,
          org: org || '',
          donationAmount: amount
        }
      });

      // Create a new donation record with additional payment details
      const donation = new Donation({
        firstName,
        lastName,
        org,
        title,
        address,
        city,
        state,
        zip,
        country,
        phone,
        email,
        emailWork,
        volunteer,
        familyServices,
        amount: Number(amount),
        currency: 'usd',
        paymentMethod,
        paymentStatus: 'requires_payment_method',
        stripePaymentIntentId: paymentIntent?.id,
        stripeCustomerId: customer.id,
        status: 'pending',
        metadata: {
          source: 'website',
          campaign: 'general',
          referrer: req.headers.referer || 'direct'
        }
      });

      await donation.save();

      // Return the client secret and donation details to the frontend
      res.status(200).json({
        success: true,
        message: 'Payment intent created successfully',
        clientSecret: paymentIntent?.client_secret,
        donationId: donation._id,
        requiresAction: paymentIntent?.status === 'requires_action',
        paymentIntentStatus: paymentIntent?.status
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful!', paymentIntent.id);
      
      // Update your database here
      try {
        await Donation.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { 
            status: 'succeeded',
            paymentStatus: 'completed',
            updatedAt: new Date()
          },
          { new: true }
        );
        console.log(`Updated donation for payment intent ${paymentIntent.id}`);
      } catch (err) {
        console.error('Error updating donation:', err);
      }
      break;
      
    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      console.log('Payment failed:', failedPaymentIntent.id);
      
      try {
        await Donation.findOneAndUpdate(
          { stripePaymentIntentId: failedPaymentIntent.id },
          { 
            status: 'failed',
            paymentStatus: 'failed',
            updatedAt: new Date(),
            error: failedPaymentIntent.last_payment_error?.message || 'Payment failed'
          },
          { new: true }
        );
      } catch (err) {
        console.error('Error updating failed donation:', err);
      }
      break;
      
    // Add more event types as needed
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

module.exports = router; 