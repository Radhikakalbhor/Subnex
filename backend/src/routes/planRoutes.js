const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validatePlan } = require('../middleware/validateMiddleware');

router.post('/', authenticate, authorize('admin'), validatePlan, planController.createPlan);
router.get('/', planController.listPlans);
router.get('/:id', planController.getPlan);
router.put('/:id', authenticate, authorize('admin'), planController.updatePlan);
router.delete('/:id', authenticate, authorize('admin'), planController.deletePlan);

module.exports = router;

