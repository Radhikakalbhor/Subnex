const express = require('express');
const router = express.Router();
const taxController = require('../controllers/taxController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateTax } = require('../middleware/validateMiddleware');

router.post('/', authenticate, authorize('admin'), validateTax, taxController.createTax);
router.get('/', taxController.listTaxes);
router.get('/:id', taxController.getTax);
router.put('/:id', authenticate, authorize('admin'), taxController.updateTax);
router.delete('/:id', authenticate, authorize('admin'), taxController.deleteTax);

module.exports = router;

