const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// POST /api/payments/create-order
router.post('/create-order', protect, paymentController.createOrder);

// POST /api/payments/verify
router.post('/verify', protect, paymentController.verifyPayment);

module.exports = router;
