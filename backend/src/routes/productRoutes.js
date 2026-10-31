const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateProduct, validateVariant } = require('../middleware/validateMiddleware');

// Product CRUD
router.post('/', authenticate, authorize('admin'), validateProduct, productController.createProduct);
router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);
router.put('/:id', authenticate, authorize('admin'), productController.updateProduct);
router.delete('/:id', authenticate, authorize('admin'), productController.deleteProduct);

// Variant Subroutes under product
router.post('/:productId/variants', authenticate, authorize('admin'), validateVariant, productController.createVariant);
router.get('/:productId/variants', productController.listVariants);

module.exports = router;

