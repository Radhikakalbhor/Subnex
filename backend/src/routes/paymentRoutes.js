const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validatePaymentRecord } = require('../middleware/validateMiddleware');

// Record a manual payment (Admin and Staff only)
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  validatePaymentRecord,
  paymentController.recordPayment
);

// List payment history (Customer filtered to own, Staff/Admin see all)
router.get(
  '/',
  authenticate,
  paymentController.listPayments
);

// Payment & outstanding balance summary
router.get(
  '/summary',
  authenticate,
  paymentController.getPaymentSummary
);

// Overdue invoices lookup via payment service
router.get(
  '/overdue-invoices',
  authenticate,
  paymentController.getOverdueInvoices
);

// Get payments for a specific invoice
router.get(
  '/invoice/:invoiceId',
  authenticate,
  paymentController.getInvoicePayments
);

// Get single payment details by ID
router.get(
  '/:id',
  authenticate,
  paymentController.getPayment
);

// Refund payment (Admin only)
router.post(
  '/:id/refund',
  authenticate,
  authorize('admin'),
  paymentController.refundPayment
);

module.exports = router;

