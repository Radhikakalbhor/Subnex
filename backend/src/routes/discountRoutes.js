const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateDiscount } = require('../middleware/validateMiddleware');

router.post('/', authenticate, authorize('admin'), validateDiscount, discountController.createDiscount);
router.get('/', discountController.listDiscounts);
router.get('/:id', discountController.getDiscount);
router.put('/:id', authenticate, authorize('admin'), discountController.updateDiscount);
router.delete('/:id', authenticate, authorize('admin'), discountController.deleteDiscount);

module.exports = router;

