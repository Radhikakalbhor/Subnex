const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Trigger recurring billing run across due subscriptions (Admin / Staff)
router.post(
  '/trigger-billing',
  authenticate,
  authorize('admin', 'staff'),
  invoiceController.triggerBilling
);

// Get overdue invoices (Customer filtered to own, Admin/Staff see all)
router.get('/overdue', authenticate, invoiceController.getOverdueInvoices);

// Get outstanding invoices with unpaid balance (Customer filtered to own, Admin/Staff see all)
router.get('/outstanding', authenticate, invoiceController.getOutstandingInvoices);

// Generate invoice on-demand for a single subscription (Admin / Staff)
router.post(
  '/subscription/:subscriptionId',
  authenticate,
  authorize('admin', 'staff'),
  invoiceController.generateForSubscription
);

// List invoices (Admin/Staff see all, Customer sees only own)
router.get('/', authenticate, invoiceController.listInvoices);

// Get payments for a specific invoice
router.get('/:id/payments', authenticate, invoiceController.getInvoicePayments);

// Get single invoice by ID (Customer can only view own)
router.get('/:id', authenticate, invoiceController.getInvoice);

// Update invoice status (Draft -> Confirmed -> Paid) (Admin / Staff)
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin', 'staff'),
  invoiceController.updateStatus
);

module.exports = router;
