const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  validateSubscription,
  validateQuotation,
  validateStatusTransition,
} = require('../middleware/validateMiddleware');

// 1. Subscription creation (Admin / Staff)
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  validateSubscription,
  subscriptionController.createSubscription
);

// 5. Quotation creation from template (Admin / Staff)
router.post(
  '/quote',
  authenticate,
  authorize('admin', 'staff'),
  validateQuotation,
  subscriptionController.createQuotation
);

// List subscriptions (Staff/Admin see all, Customer sees only own)
router.get('/', authenticate, subscriptionController.listSubscriptions);

// Get subscription by ID (Customers can only view own)
router.get('/:id', authenticate, subscriptionController.getSubscription);

// 8. Status transitions (Admin / Staff)
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin', 'staff'),
  validateStatusTransition,
  subscriptionController.transitionStatus
);

// 10. Pause subscription (Admin / Staff)
router.patch(
  '/:id/pause',
  authenticate,
  authorize('admin', 'staff'),
  subscriptionController.pauseSubscription
);

// 10. Resume subscription (Admin / Staff)
router.patch(
  '/:id/resume',
  authenticate,
  authorize('admin', 'staff'),
  subscriptionController.resumeSubscription
);

// 10. Renew subscription (Admin / Staff)
router.patch(
  '/:id/renew',
  authenticate,
  authorize('admin', 'staff'),
  subscriptionController.renewSubscription
);

// 10. Early close subscription (Admin / Staff)
router.patch(
  '/:id/close',
  authenticate,
  authorize('admin', 'staff'),
  subscriptionController.closeSubscription
);

module.exports = router;

