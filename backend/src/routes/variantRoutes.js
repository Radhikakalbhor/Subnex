const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const planController = require('../controllers/planController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateVariant, validatePlan } = require('../middleware/validateMiddleware');

// Direct variant CRUD
router.post('/', authenticate, authorize('admin'), validateVariant, productController.createVariant);
router.get('/', productController.listVariants);
router.get('/:id', productController.getVariant);
router.put('/:id', authenticate, authorize('admin'), productController.updateVariant);
router.delete('/:id', authenticate, authorize('admin'), productController.deleteVariant);

// Plans under variant
router.post('/:variantId/plans', authenticate, authorize('admin'), validatePlan, planController.createPlan);
router.get('/:variantId/plans', planController.listPlans);

module.exports = router;

