const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Event = require('../models/Event');
const EventTicketBooking = require('../models/EventTicketBooking');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @route   POST /api/event-ticket-booking
// @desc    Create a new ticket reservation
// @access  Public
router.post(
  '/',
  [
    // Event validation
    check('eventId', 'Event ID is required').notEmpty().isMongoId().withMessage('Invalid event ID format'),
    
    // Customer validation
    check('customer.name', 'Full name is required')
      .notEmpty()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
      
    check('customer.email', 'Please include a valid email')
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 100 })
      .withMessage('Email must be less than 100 characters'),
      
    check('customer.phone', 'Phone number is required')
      .notEmpty()
      .trim()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
      
    check('customer.city', 'City is required')
      .notEmpty()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('City must be between 2 and 100 characters'),
      
    check('customer.state', 'State/Province is required')
      .notEmpty()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('State must be between 2 and 100 characters'),
      
    check('customer.country', 'Country is required')
      .notEmpty()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Country must be between 2 and 100 characters'),
      
    // Ticket quantity validation
    check('quantity', 'Number of tickets is required')
      .notEmpty()
      .isInt({ min: 1, max: 10 })
      .withMessage('You can book between 1 and 10 tickets at a time')
  ],
  async (req, res) => {
    // Format validation errors for consistent response
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = {};
      errors.array().forEach(error => {
        // Format field names to match frontend expectations (e.g., customer.name -> customerName)
        const field = error.param.includes('.') 
          ? error.param.split('.').join('_')
          : error.param;
          
        formattedErrors[field] = error.msg;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { eventId, customer, quantity, metadata } = req.body;

      // 1. Find the event and check availability
      const event = await Event.findById(eventId).session(session);
      if (!event) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ 
          success: false,
          message: 'Event not found',
          error: 'The requested event could not be found.'
        });
      }

      // 2. Check if event has available tickets
      if (event.capacity) {
        const ticketsSold = await EventTicketBooking.countDocuments({ 
          event: eventId, 
          status: { $in: ['reserved', 'confirmed'] } 
        }).session(session);

        const availableTickets = event.capacity - ticketsSold;
        
        if (quantity > availableTickets) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ 
            success: false,
            message: 'Insufficient tickets',
            error: `Only ${availableTickets} ticket${availableTickets !== 1 ? 's' : ''} available`,
            availableTickets,
            requestedTickets: quantity
          });
        }
      }

      // 3. Calculate ticket price (in smallest currency unit)
      const unitPrice = event.price; // Already in cents
      const totalAmount = unitPrice * quantity;

      // 4. Create ticket reservation
      const ticket = new EventTicketBooking({
        event: eventId,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: {
            city: customer.city,
            state: customer.state,
            country: customer.country
          }
        },
        quantity,
        unitPrice,
        totalAmount,
        currency: event.currency || 'usd',
        status: 'reserved',
        metadata
      });

      await ticket.save({ session });

      // 5. Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: event.currency || 'usd',
        metadata: {
          ticketId: ticket._id.toString(),
          eventId: event._id.toString(),
          eventTitle: event.title
        },
        description: `${quantity} ticket(s) for ${event.title}`,
        shipping: customer.address ? {
          name: customer.name,
          address: {
            city: customer.city,
            state: customer.state,
            country: customer.country
          }
        } : undefined,
        receipt_email: customer.email
      });

      // 6. Update ticket with payment intent ID
      ticket.paymentIntentId = paymentIntent.id;
      await ticket.save({ session });

      await session.commitTransaction();
      session.endSession();

      // 7. Return client secret for Stripe Elements
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
      await session.abortTransaction().catch(console.error);
      session.endSession().catch(console.error);
      
      console.error('Error creating ticket:', err);
      
      // Handle Stripe specific errors
      if (err.type === 'StripeCardError' || err.type === 'StripeError') {
        return res.status(402).json({
          success: false,
          message: 'Payment processing failed',
          error: err.message,
          type: err.type,
          code: err.code || null
        });
      }
      
      // Handle duplicate key errors
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: 'Duplicate entry',
          error: `${field} already exists`,
          field
        });
      }
      
      // Handle validation errors from Mongoose
      if (err.name === 'ValidationError') {
        const errors = {};
        Object.keys(err.errors).forEach(key => {
          errors[key] = err.errors[key].message;
        });
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      
      // Generic error handler
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    }
  }
);

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

    const ticket = await EventTicketBooking.findById(req.params.id)
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

    const tickets = await EventTicketBooking.find({ event: req.params.eventId })
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

      const ticket = await EventTicketBooking.findById(req.params.id);
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
    await EventTicketBooking.findOneAndUpdate(
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
    await EventTicketBooking.findOneAndUpdate(
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
