const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { check, validationResult } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const Event = require('../models/Event');
const Ticket = require('../models/EventTicketBooking');

// Check if Stripe is configured
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('STRIPE_SECRET_KEY not found. Payment processing will be disabled.');
}

// @route   POST /api/event-ticket-booking
// @desc    Create a new ticket reservation
// @access  Public
router.post('/', async (req, res) => {
  try {
    console.log('Received booking request:', req.body);
    
    const { eventId, customer, quantity, metadata } = req.body;

    // Comprehensive validation
    const errors = {};

    // Event ID validation
    if (!eventId) {
      errors.eventId = 'Event ID is required';
    } else if (!mongoose.Types.ObjectId.isValid(eventId)) {
      errors.eventId = 'Invalid event ID format';
    }

    // Customer validation
    if (!customer) {
      errors.customer = 'Customer information is required';
    } else {
      // Name validation
      if (!customer.name || customer.name.trim().length === 0) {
        errors.customerName = 'Full name is required';
      } else if (customer.name.trim().length < 2) {
        errors.customerName = 'Name must be at least 2 characters long';
      } else if (customer.name.trim().length > 100) {
        errors.customerName = 'Name must be less than 100 characters';
      }

      // Email validation
      if (!customer.email || customer.email.trim().length === 0) {
        errors.customerEmail = 'Email address is required';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customer.email.trim())) {
          errors.customerEmail = 'Please enter a valid email address';
        }
      }

      // Phone validation
      if (!customer.phone || customer.phone.trim().length === 0) {
        errors.customerPhone = 'Phone number is required';
      } else {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = customer.phone.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          errors.customerPhone = 'Please enter a valid phone number';
        }
      }

      // City validation
      if (!customer.city || customer.city.trim().length === 0) {
        errors.customerCity = 'City is required';
      } else if (customer.city.trim().length < 2) {
        errors.customerCity = 'City must be at least 2 characters long';
      } else if (customer.city.trim().length > 100) {
        errors.customerCity = 'City must be less than 100 characters';
      }

      // State validation
      if (!customer.state || customer.state.trim().length === 0) {
        errors.customerState = 'State/Province is required';
      } else if (customer.state.trim().length < 2) {
        errors.customerState = 'State must be at least 2 characters long';
      } else if (customer.state.trim().length > 100) {
        errors.customerState = 'State must be less than 100 characters';
      }

      // Country validation
      if (!customer.country || customer.country.trim().length === 0) {
        errors.customerCountry = 'Country is required';
      } else if (customer.country.trim().length < 2) {
        errors.customerCountry = 'Country must be at least 2 characters long';
      } else if (customer.country.trim().length > 100) {
        errors.customerCountry = 'Country must be less than 100 characters';
      }
    }

    // Quantity validation
    if (!quantity) {
      errors.quantity = 'Number of tickets is required';
    } else if (!Number.isInteger(quantity) || quantity < 1) {
      errors.quantity = 'Quantity must be at least 1';
    } else if (quantity > 10) {
      errors.quantity = 'You can book maximum 10 tickets at a time';
    }

    // If there are validation errors, return them
    if (Object.keys(errors).length > 0) {
      console.log('Validation errors:', errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    // 1. Find the event
    console.log('Looking for event:', eventId);
    const event = await Event.findById(eventId);
    if (!event) {
      console.log('Event not found:', eventId);
      return res.status(404).json({ 
        success: false,
        message: 'Event not found',
        error: 'The requested event could not be found.'
      });
    }
    console.log('Event found:', event.title);

    // 2. Check if event is active
    if (!event.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Event is not available',
        error: 'This event is no longer available for booking.'
      });
    }

    // 3. Check capacity if available
    if (event.capacity) {
      const ticketsSold = await Ticket.countDocuments({ 
        event: eventId, 
        status: { $in: ['reserved', 'confirmed'] } 
      });
      
      const availableTickets = event.capacity - ticketsSold;
      
      if (quantity > availableTickets) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient tickets available',
          error: `Only ${availableTickets} ticket${availableTickets !== 1 ? 's' : ''} available`,
          availableTickets,
          requestedTickets: quantity
        });
      }
    }

    // 4. Calculate ticket price
    let unitPrice;
    if (event.ticketCost) {
      // Use the new ticketCost field if available
      unitPrice = Math.round(event.ticketCost * 100);
    } else {
      // Fallback to parsing cost string for backward compatibility
      const costString = event.cost.replace(/[^0-9.]/g, '');
      unitPrice = Math.round(parseFloat(costString) * 100);
    }
    const totalAmount = unitPrice * quantity;
    console.log('Price calculation:', { 
      cost: event.cost, 
      ticketCost: event.ticketCost, 
      unitPrice, 
      totalAmount 
    });

    // 5. Create ticket reservation
    console.log('Creating ticket reservation...');
    const ticket = new Ticket({
      event: eventId,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone.trim(),
        address: {
          city: customer.city.trim(),
          state: customer.state.trim(),
          country: customer.country.trim()
        }
      },
      quantity,
      unitPrice,
      totalAmount,
      currency: 'usd',
      status: 'reserved',
      metadata
    });

    await ticket.save();
    console.log('Ticket saved:', ticket._id);

    // 6. Create payment intent with Stripe
    console.log('Creating Stripe payment intent...');
    
    if (!stripe) {
      console.log('Stripe not configured, creating mock payment intent');
      // Create a mock payment intent for testing
      const mockPaymentIntent = {
        id: 'pi_mock_' + Date.now(),
        client_secret: 'pi_mock_secret_' + Date.now(),
        amount: totalAmount,
        currency: 'usd'
      };
      
      // 7. Update ticket with payment intent ID
      ticket.paymentIntentId = mockPaymentIntent.id;
      await ticket.save();
      console.log('Ticket updated with mock payment intent ID');

      // 8. Return client secret for Stripe Elements
      console.log('Sending success response with mock payment intent');
      res.status(201).json({
        success: true,
        message: 'Ticket reservation created successfully (Stripe not configured)',
        data: {
          clientSecret: mockPaymentIntent.client_secret,
          ticketId: ticket._id,
          amount: mockPaymentIntent.amount,
          currency: mockPaymentIntent.currency,
          event: {
            id: event._id,
            title: event.title,
            date: event.date,
            time: event.time
          },
          customer: {
            name: customer.name,
            email: customer.email
          },
          quantity,
          totalAmount: mockPaymentIntent.amount
        }
      });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      metadata: {
        ticketId: ticket._id.toString(),
        eventId: event._id.toString(),
        eventTitle: event.title
      },
      description: `${quantity} ticket(s) for ${event.title}`,
      receipt_email: customer.email
    });
    console.log('Payment intent created:', paymentIntent.id);

    // 7. Update ticket with payment intent ID
    ticket.paymentIntentId = paymentIntent.id;
    await ticket.save();
    console.log('Ticket updated with payment intent ID');

    // 8. Return client secret for Stripe Elements
    console.log('Sending success response');
    res.status(201).json({
      success: true,
      message: 'Ticket reservation created successfully',
      data: {
        clientSecret: paymentIntent.client_secret,
        ticketId: ticket._id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        event: {
          id: event._id,
          title: event.title,
          date: event.date,
          time: event.time
        },
        customer: {
          name: customer.name,
          email: customer.email
        },
        quantity,
        totalAmount: paymentIntent.amount
      }
    });

  } catch (err) {
    console.error('Booking creation error:', err);
    console.error('Error stack:', err.stack);
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(err.errors).forEach(key => {
        validationErrors[key] = err.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate booking',
        error: 'A booking with this information already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: err.message || 'An error occurred while creating the booking'
    });
  }
});

// @route   GET /api/event-ticket-booking/:id
// @desc    Get ticket by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID format',
        error: 'The provided ticket ID is not valid.'
      });
    }

    const ticket = await Ticket.findById(req.params.id)
      .populate('event', 'title date time place')
      .lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
        error: 'The requested ticket could not be found.'
      });
    }

    // Check if user is authorized to view this ticket
    // Only allow the ticket owner or admin to view the ticket
    const isOwner = ticket.user && ticket.user.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'You are not authorized to view this ticket.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ticket retrieved successfully',
      data: ticket
    });
  } catch (err) {
    console.error('Get ticket error:', err);
    
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        error: 'The provided ID is not valid.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred while retrieving the ticket.'
    });
  }
});

// @route   GET /api/event-ticket-booking/event/:eventId
// @desc    Get all tickets for an event (admin only)
// @access  Private/Admin
router.get('/event/:eventId', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const tickets = await Ticket.find({ event: req.params.eventId })
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    res.json(tickets);
  } catch (err) {
    console.error('Get event tickets error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PUT /api/event-ticket-booking/:id/status
// @desc    Update ticket status (admin only)
// @access  Private/Admin
router.put(
  '/:id/status',
  [
    auth,
    check('status', 'Status is required').notEmpty(),
    check('status', 'Invalid status').isIn(['reserved', 'confirmed', 'cancelled', 'used'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(401).json({ msg: 'Not authorized' });
      }

      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ msg: 'Ticket not found' });
      }

      ticket.status = req.body.status;
      await ticket.save();

      res.json(ticket);
    } catch (err) {
      console.error('Update ticket status error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
);

// Webhook handler for Stripe events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handlePaymentIntentSucceeded(paymentIntent);
      break;
    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      await handlePaymentIntentFailed(failedPaymentIntent);
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({received: true});
});

// Helper function to handle successful payments
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    // Update ticket status to confirmed
    await Ticket.findOneAndUpdate(
      { paymentIntentId: paymentIntent.id },
      { 
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'card'
      },
      { new: true }
    );
    
    // TODO: Send confirmation email to customer
  } catch (err) {
    console.error('Error handling successful payment:', err);
    // TODO: Implement retry logic or alert admin
  }
}

// Helper function to handle failed payments
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    // Update ticket status to failed
    await Ticket.findOneAndUpdate(
      { paymentIntentId: paymentIntent.id },
      { 
        status: 'cancelled',
        paymentStatus: 'failed',
        $push: { 
          metadata: { 
            paymentError: paymentIntent.last_payment_error?.message || 'Payment failed' 
          } 
        }
      },
      { new: true }
    );
    
    // TODO: Send failure notification to customer
  } catch (err) {
    console.error('Error handling failed payment:', err);
    // TODO: Implement retry logic or alert admin
  }
}

module.exports = router;
