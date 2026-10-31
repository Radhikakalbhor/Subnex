const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');

// Get dashboard statistics and metrics (scoped by role: customer sees own, staff/admin see all)
router.get('/stats', authenticate, dashboardController.getStats);

module.exports = router;

