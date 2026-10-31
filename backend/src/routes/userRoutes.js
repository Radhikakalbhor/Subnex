const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize, requireSelfOrStaff } = require('../middleware/roleMiddleware');
const { validateStaffCreation } = require('../middleware/validateMiddleware');

// 9. Only Admin can create staff accounts
router.post(
  '/staff',
  authenticate,
  authorize('admin'),
  validateStaffCreation,
  userController.createStaff
);

// List users (Staff and Admin only)
router.get(
  '/',
  authenticate,
  authorize('staff', 'admin'),
  userController.listUsers
);

// 10. Get user by ID (Customers strictly restricted to their own ID, Staff/Admin can view any)
router.get(
  '/:id',
  authenticate,
  requireSelfOrStaff('id'),
  userController.getUser
);

module.exports = router;

