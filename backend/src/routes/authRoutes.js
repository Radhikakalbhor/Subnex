const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require('../middleware/validateMiddleware');

// 1. Customer signup
router.post('/register', validateSignup, authController.register);

// 1. Login (Customer, Staff, Admin)
router.post('/login', validateLogin, authController.login);

// 6. Forgot password
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);

// 6. Reset password
router.post('/reset-password', validateResetPassword, authController.resetPassword);

// Current authenticated user profile
router.get('/me', authenticate, authController.getMe);

module.exports = router;

