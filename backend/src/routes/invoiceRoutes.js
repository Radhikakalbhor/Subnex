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

// Generate invoice on-demand for a single subscription (Admin / Staff)
router.post(
  '/subscription/:subscriptionId',
  authenticate,
  authorize('admin', 'staff'),
  invoiceController.generateForSubscription
);

// List invoices (Admin/Staff see all, Customer sees only own)
router.get('/', authenticate, invoiceController.listInvoices);

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

