process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { initDb } = require('../config/db');
const { ensureDefaultAdmin } = require('../server');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log('\n=======================================================');
  console.log('  SUBNEX Phase 2: Catalog, Plans, Taxes & Discounts');
  console.log('=======================================================\n');

  await initDb();
  await ensureDefaultAdmin();

  // Obtain Admin & Customer Tokens
  const adminLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@subnex.io',
      password: 'Admin@Subnex2026!',
    });
  assert(adminLoginRes.status === 200, 'Admin successfully authenticated');
  const adminToken = adminLoginRes.body.data.token;

  const customerRegisterRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: 'customer.phase2@subnex.io',
      password: 'CustomerPass@2026!',
      full_name: 'Phase2 Tester',
    });
  assert(customerRegisterRes.status === 201, 'Customer successfully registered');
  const customerToken = customerRegisterRes.body.data.token;

  // =================================================================
  // 1. PRODUCTS CRUD & VALIDATION
  // =================================================================
  console.log('\n[1. Products: CRUD, Pricing & Permissions]');

  // 1a. Customer forbidden from creating product
  const customerCreateProdRes = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      name: 'Unauthorized SaaS Platform',
      sales_price: 99.99,
    });
  assert(customerCreateProdRes.status === 403, 'Customer forbidden from creating product (403)');

  // 1b. Reject negative prices
  const negPriceRes = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Bad Product',
      sales_price: -10.00,
      cost_price: -5.00,
    });
  assert(negPriceRes.status === 400, 'Reject negative sales_price / cost_price (400)');

  // 1c. Admin creates valid product
  const prodData = {
    name: 'Cloud Infrastructure Engine',
    type: 'saas',
    sales_price: 299.00,
    cost_price: 80.00,
    notes: 'Primary enterprise cloud hosting offering with 99.9% SLA.',
    sku: 'PROD-CLOUD-INFRA',
    description: 'High-availability compute and container infrastructure.',
  };

  const createProdRes = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(prodData);
  assert(createProdRes.status === 201, 'Admin successfully created product (201)');
  const product = createProdRes.body.data;
  assert(product.sales_price === '299.00' || product.sales_price === 299, 'Sales price stored properly');
  assert(product.cost_price === '80.00' || product.cost_price === 80, 'Cost price stored properly');
  assert(product.type === 'saas', 'Product type stored properly');
  const productId = product.id;

  // 1d. Get Product by ID
  const getProdRes = await request(app).get(`/api/v1/products/${productId}`);
  assert(getProdRes.status === 200, 'Get product by ID succeeds (200)');
  assert(getProdRes.body.data.name === prodData.name, 'Product name matches');

  // 1e. Update Product
  const updateProdRes = await request(app)
    .put(`/api/v1/products/${productId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      sales_price: 349.00,
      notes: 'Updated notes with updated SLA.',
    });
  assert(updateProdRes.status === 200, 'Admin successfully updated product (200)');
  assert(updateProdRes.body.data.sales_price === '349.00' || updateProdRes.body.data.sales_price === 349, 'Updated sales price reflected');

  // =================================================================
  // 2. PRODUCT VARIANTS CRUD & VALIDATION
  // =================================================================
  console.log('\n[2. Product Variants: Brand, Additional Prices & Options]');

  // 2a. Reject negative additional price
  const negVariantRes = await request(app)
    .post(`/api/v1/products/${productId}/variants`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Invalid Variant',
      additional_price: -25.00,
    });
  assert(negVariantRes.status === 400, 'Reject negative additional_price on variant (400)');

  // 2b. Customer forbidden from creating variant
  const customerVariantRes = await request(app)
    .post(`/api/v1/products/${productId}/variants`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      name: 'Customer Variant',
      additional_price: 50.00,
    });
  assert(customerVariantRes.status === 403, 'Customer forbidden from creating variant (403)');

  // 2c. Admin creates valid variant
  const variantData = {
    name: 'Dedicated CPU Tier',
    brand: 'Subnex Cloud Pro',
    additional_price: 150.00,
    sku: 'VAR-CLOUD-DEDICATED',
    attributes: { cpu_cores: 8, ram_gb: 32, storage: '1TB NVMe' },
  };

  const createVariantRes = await request(app)
    .post(`/api/v1/products/${productId}/variants`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(variantData);
  assert(createVariantRes.status === 201, 'Admin successfully created variant (201)');
  const variant = createVariantRes.body.data;
  assert(variant.brand === 'Subnex Cloud Pro', 'Variant brand stored properly');
  assert(variant.additional_price === '150.00' || variant.additional_price === 150, 'Additional price stored properly');
  const variantId = variant.id;

  // 2d. Update variant
  const updateVariantRes = await request(app)
    .put(`/api/v1/variants/${variantId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      additional_price: 175.00,
      brand: 'Subnex Cloud Enterprise',
    });
  assert(updateVariantRes.status === 200, 'Admin updated variant (200)');
  assert(updateVariantRes.body.data.brand === 'Subnex Cloud Enterprise', 'Updated brand reflected');

  // =================================================================
  // 3. PLANS: DAILY, WEEKLY, MONTHLY & YEARLY BILLING PERIODS & PERMISSIONS
  // =================================================================
  console.log('\n[3. Plans: Intervals, Permissions & Date Constraints]');

  // 3a. Reject negative price or minimum_quantity < 1
  const badPlanRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Bad Plan',
      price: -50.00,
      minimum_quantity: 0,
    });
  assert(badPlanRes.status === 400, 'Reject negative price or minimum_quantity < 1 (400)');

  // 3b. Reject invalid availability dates (end date before start date)
  const badDatesPlanRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Bad Dates Plan',
      price: 50.00,
      available_from: '2026-12-01T00:00:00Z',
      available_until: '2026-11-01T00:00:00Z',
    });
  assert(badDatesPlanRes.status === 400, 'Reject available_until earlier than available_from (400)');

  // 3c. Create Daily Plan
  const dailyPlanRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Dedicated Daily Burst',
      code: 'PLAN-DEDICATED-DAILY',
      billing_interval: 'day',
      billing_interval_count: 1,
      price: 25.00,
      minimum_quantity: 1,
      allow_auto_close: true,
      allow_pause: true,
      allow_renewal: true,
      allow_early_close: true,
    });
  assert(dailyPlanRes.status === 201, 'Admin created Daily billing plan (201)');
  assert(dailyPlanRes.body.data.billing_interval === 'day', 'Billing interval is "day"');

  // 3d. Create Weekly Plan
  const weeklyPlanRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Dedicated Weekly Sprint',
      code: 'PLAN-DEDICATED-WEEKLY',
      billing_interval: 'week',
      billing_interval_count: 1,
      price: 150.00,
      minimum_quantity: 1,
    });
  assert(weeklyPlanRes.status === 201, 'Admin created Weekly billing plan (201)');
  assert(weeklyPlanRes.body.data.billing_interval === 'week', 'Billing interval is "week"');

  // 3e. Create Monthly Plan with permissions configuration
  const monthlyPlanRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Dedicated Monthly Growth',
      code: 'PLAN-DEDICATED-MONTHLY',
      billing_interval: 'month',
      billing_interval_count: 1,
      price: 499.00,
      minimum_quantity: 2,
      available_from: '2026-01-01T00:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      allow_auto_close: false,
      allow_pause: true,
      allow_renewal: true,
      allow_early_close: true,
    });
  assert(monthlyPlanRes.status === 201, 'Admin created Monthly billing plan with full permissions (201)');
  const monthlyPlan = monthlyPlanRes.body.data;
  assert(monthlyPlan.minimum_quantity === 2, 'Minimum quantity 2 stored properly');
  assert(monthlyPlan.allow_pause === true, 'allow_pause flag stored');
  assert(monthlyPlan.allow_renewal === true, 'allow_renewal flag stored');
  assert(monthlyPlan.allow_early_close === true, 'allow_early_close flag stored');
  const planId = monthlyPlan.id;

  // 3f. Create Yearly Plan
  const yearlyPlanRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Dedicated Annual Commit',
      code: 'PLAN-DEDICATED-YEARLY',
      billing_interval: 'year',
      billing_interval_count: 1,
      price: 4990.00,
      minimum_quantity: 1,
      trial_period_days: 14,
    });
  assert(yearlyPlanRes.status === 201, 'Admin created Yearly billing plan (201)');
  assert(yearlyPlanRes.body.data.billing_interval === 'year', 'Billing interval is "year"');
  assert(yearlyPlanRes.body.data.trial_period_days === 14, 'Trial period days 14 stored');

  // 3g. Customer forbidden from creating plans
  const customerPlanRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      name: 'Customer Plan',
      price: 10.00,
    });
  assert(customerPlanRes.status === 403, 'Customer forbidden from creating plan (403)');

  // 3h. Update Plan
  const updatePlanRes = await request(app)
    .put(`/api/v1/plans/${planId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      price: 479.00,
      minimum_quantity: 3,
    });
  assert(updatePlanRes.status === 200, 'Admin updated plan configuration (200)');
  assert(updatePlanRes.body.data.price === '479.00' || updatePlanRes.body.data.price === 479, 'Updated price reflected');

  // =================================================================
  // 4. TAX CONFIGURATION & APPLICABLE RULES
  // =================================================================
  console.log('\n[4. Tax Configuration & Applicable Rules]');

  // 4a. Reject negative tax rate and rate > 100%
  const badTaxRes = await request(app)
    .post('/api/v1/taxes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Bad Tax',
      rate: -5.00,
    });
  assert(badTaxRes.status === 400, 'Reject negative tax rate (400)');

  const taxOver100Res = await request(app)
    .post('/api/v1/taxes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Extreme Tax',
      rate: 105.00,
      tax_type: 'percentage',
    });
  assert(taxOver100Res.status === 400, 'Reject percentage tax rate > 100% (400)');

  // 4b. Customer forbidden from creating taxes
  const customerTaxRes = await request(app)
    .post('/api/v1/taxes')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      name: 'Customer Tax',
      rate: 5.0,
    });
  assert(customerTaxRes.status === 403, 'Customer forbidden from configuring taxes (403)');

  // 4c. Admin creates valid Tax with applicable rules
  const taxData = {
    name: 'State Technology VAT',
    rate: 18.000,
    tax_type: 'percentage',
    country: 'US',
    state: 'California',
    applicable_rules: 'Applicable to all digital and SaaS recurring subscriptions delivered in California.',
  };

  const createTaxRes = await request(app)
    .post('/api/v1/taxes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(taxData);
  assert(createTaxRes.status === 201, 'Admin created Tax rule with applicable rules (201)');
  const tax = createTaxRes.body.data;
  assert(tax.applicable_rules.includes('California'), 'Applicable tax rules stored properly');
  const taxId = tax.id;

  // 4d. Update Tax
  const updateTaxRes = await request(app)
    .put(`/api/v1/taxes/${taxId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      rate: 18.500,
      applicable_rules: 'Updated rules: 18.5% effective Q4.',
    });
  assert(updateTaxRes.status === 200, 'Admin updated tax rule (200)');
  assert(updateTaxRes.body.data.rate === '18.500' || updateTaxRes.body.data.rate === 18.5, 'Updated tax rate reflected');

  // =================================================================
  // 5. DISCOUNT CONFIGURATION (PERCENTAGE, FIXED, PRODUCT-SPECIFIC & USAGE)
  // =================================================================
  console.log('\n[5. Discount Configuration & Validation]');

  // 5a. Reject value <= 0 or percentage > 100
  const badDiscountRes = await request(app)
    .post('/api/v1/discounts')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      code: 'ZERO-OFF',
      name: 'Zero Discount',
      discount_type: 'percentage',
      value: 0,
    });
  assert(badDiscountRes.status === 400, 'Reject discount value <= 0 (400)');

  const discountOver100Res = await request(app)
    .post('/api/v1/discounts')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      code: 'OVER-100',
      name: 'Over 100 Discount',
      discount_type: 'percentage',
      value: 120,
    });
  assert(discountOver100Res.status === 400, 'Reject percentage discount > 100% (400)');

  // 5b. Customer forbidden from creating discounts
  const customerDiscountRes = await request(app)
    .post('/api/v1/discounts')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      code: 'HACK-50',
      name: 'Unauthorized Discount',
      discount_type: 'percentage',
      value: 50,
    });
  assert(customerDiscountRes.status === 403, 'Customer forbidden from configuring discounts (403)');

  // 5c. Admin creates Subscription-wide percentage discount with limits & dates
  const subDiscountData = {
    code: 'WELCOME20',
    name: 'New Customer Welcome Promo',
    discount_type: 'percentage',
    value: 20.00,
    min_purchase_amount: 100.00,
    min_quantity: 1,
    valid_from: '2026-01-01T00:00:00Z',
    valid_until: '2026-12-31T23:59:59Z',
    max_redemptions: 500,
    times_redeemed: 0,
    target_scope: 'subscription',
  };

  const createSubDiscRes = await request(app)
    .post('/api/v1/discounts')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(subDiscountData);
  assert(createSubDiscRes.status === 201, 'Admin created subscription-wide discount (201)');
  const subDiscount = createSubDiscRes.body.data;
  assert(subDiscount.max_redemptions === 500, 'Usage limit max_redemptions 500 stored');
  assert(subDiscount.times_redeemed === 0, 'Usage count initialized to 0');
  assert(subDiscount.min_purchase_amount === '100.00' || subDiscount.min_purchase_amount === 100, 'Minimum purchase stored');
  const subDiscountId = subDiscount.id;

  // 5d. Admin creates Product-specific fixed-amount discount
  const prodDiscountData = {
    code: 'CLOUD50OFF',
    name: '$50 Off Cloud Infrastructure',
    discount_type: 'fixed_amount',
    value: 50.00,
    min_purchase_amount: 200.00,
    min_quantity: 2,
    target_scope: 'product',
    product_id: productId,
  };

  const createProdDiscRes = await request(app)
    .post('/api/v1/discounts')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(prodDiscountData);
  assert(createProdDiscRes.status === 201, 'Admin created product-specific discount (201)');
  const prodDiscount = createProdDiscRes.body.data;
  assert(prodDiscount.target_scope === 'product', 'target_scope is "product"');
  assert(prodDiscount.product_id === productId, 'product_id foreign key matches');

  // 5e. Update Discount
  const updateDiscRes = await request(app)
    .put(`/api/v1/discounts/${subDiscountId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      max_redemptions: 1000,
      name: 'Extended Customer Welcome Promo',
    });
  assert(updateDiscRes.status === 200, 'Admin updated discount usage limits (200)');
  assert(updateDiscRes.body.data.max_redemptions === 1000, 'Updated max_redemptions 1000 reflected');

  // 5f. Delete Discount
  const deleteDiscRes = await request(app)
    .delete(`/api/v1/discounts/${subDiscountId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert(deleteDiscRes.status === 200, 'Admin deleted discount (200)');

  // 5g. Delete Tax
  const deleteTaxRes = await request(app)
    .delete(`/api/v1/taxes/${taxId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert(deleteTaxRes.status === 200, 'Admin deleted tax (200)');

  console.log('\n=======================================================');
  console.log('  🎉 ALL PHASE 2 CATALOG & PRICING TESTS PASSED!');
  console.log('=======================================================\n');
}

runTests().catch(err => {
  console.error('Phase 2 test execution failed:', err);
  process.exit(1);
});

