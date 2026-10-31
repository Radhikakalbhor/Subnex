const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const variantRoutes = require('./variantRoutes');
const planRoutes = require('./planRoutes');
const taxRoutes = require('./taxRoutes');
const discountRoutes = require('./discountRoutes');
const quotationTemplateRoutes = require('./quotationTemplateRoutes');
const subscriptionRoutes = require('./subscriptionRoutes');

// API Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'SUBNEX API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Route registration
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/variants', variantRoutes);
router.use('/plans', planRoutes);
router.use('/taxes', taxRoutes);
router.use('/discounts', discountRoutes);
router.use('/quotations', quotationTemplateRoutes);
router.use('/subscriptions', subscriptionRoutes);

module.exports = router;
