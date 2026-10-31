const express = require('express');
const router = express.Router();
const templateController = require('../controllers/quotationTemplateController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateQuotationTemplate } = require('../middleware/validateMiddleware');

router.post('/', authenticate, authorize('admin', 'staff'), validateQuotationTemplate, templateController.createTemplate);
router.get('/', authenticate, authorize('admin', 'staff'), templateController.listTemplates);
router.get('/:id', authenticate, authorize('admin', 'staff'), templateController.getTemplate);
router.put('/:id', authenticate, authorize('admin', 'staff'), templateController.updateTemplate);
router.delete('/:id', authenticate, authorize('admin'), templateController.deleteTemplate);

module.exports = router;

