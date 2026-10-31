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
  console.log('   SUBNEX Phase 3: Subscriptions & Quotation Engine');
  console.log('=======================================================\n');

  await initDb();
  await ensureDefaultAdmin();

  // 1. Authenticate Admin
  const adminLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@subnex.io',
      password: 'Admin@Subnex2026!',
    });
  assert(adminLoginRes.status === 200, 'Admin successfully authenticated');
  const adminToken = adminLoginRes.body.data.token;

  // 2. Create Staff user
  const staffEmail = 'staff.phase3@subnex.io';
  const staffPass = 'StaffPhase3Pass@2026!';
  const createStaffRes = await request(app)
    .post('/api/v1/users/staff')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: staffEmail,
      password: staffPass,
      full_name: 'Phase 3 Staff Officer',
      role: 'staff',
    });
  assert(createStaffRes.status === 201, 'Admin created Staff account');
  const staffLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: staffEmail, password: staffPass });
  const staffToken = staffLoginRes.body.data.token;

  // 3. Register Customer A (Alice)
  const customerARes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: 'customer.alice.p3@subnex.io',
      password: 'AlicePass@2026!',
      full_name: 'Alice Phase3',
    });
  assert(customerARes.status === 201, 'Customer Alice registered');
  const customerAToken = customerARes.body.data.token;
  const customerAId = customerARes.body.data.user.id;

  // 4. Register Customer B (Bob)
  const customerBRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: 'customer.bob.p3@subnex.io',
      password: 'BobPass@2026!',
      full_name: 'Bob Phase3',
    });
  assert(customerBRes.status === 201, 'Customer Bob registered');
  const customerBToken = customerBRes.body.data.token;
  const customerBId = customerBRes.body.data.user.id;

  // 5. Setup Catalog: Product, Variant, Tax, and Plans (with different permission flags)
  const prodRes = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Managed Kubernetes Cluster',
      type: 'saas',
      sales_price: 199.00,
      cost_price: 50.00,
      sku: 'PROD-K8S-P3',
    });
  const productId = prodRes.body.data.id;

  const varRes = await request(app)
    .post(`/api/v1/products/${productId}/variants`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'High Memory K8s Node',
      brand: 'Subnex K8s',
      sku: 'VAR-K8S-HM',
      additional_price: 100.00,
    });
  const variantId = varRes.body.data.id;

  // Tax rule (10%)
  const taxRes = await request(app)
    .post('/api/v1/taxes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Service Tax 10%',
      rate: 10.00,
      tax_type: 'percentage',
    });
  const taxId = taxRes.body.data.id;

  // Plan 1: Full Permissions (Allows pause, renewal, early close)
  const planFullPermRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'K8s Monthly Standard',
      code: 'PLAN-K8S-STANDARD',
      billing_interval: 'month',
      billing_interval_count: 1,
      price: 200.00,
      allow_pause: true,
      allow_renewal: true,
      allow_early_close: true,
    });
  const planFullPermId = planFullPermRes.body.data.id;

  // Plan 2: Restricted Permissions (NO pause, NO renewal, NO early close)
  const planRestrictedRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'K8s Annual Locked',
      code: 'PLAN-K8S-LOCKED',
      billing_interval: 'year',
      billing_interval_count: 1,
      price: 2000.00,
      allow_pause: false,
      allow_renewal: false,
      allow_early_close: false,
    });
  const planRestrictedId = planRestrictedRes.body.data.id;

  // =================================================================
  // TEST 1: Quotation Template Creation & Quotation
  // =================================================================
  console.log('\n[1. Quotation Templates & Quotation Generation]');

  const templateRes = await request(app)
    .post('/api/v1/quotations')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Enterprise Cloud Agreement 2026',
      code: 'QT-ENTERPRISE-2026',
      description: 'Standard SLA terms with 45-day validity and Net 30 payment terms.',
      terms_and_conditions: 'Services are billed monthly in advance. 99.9% uptime SLA.',
      default_validity_days: 45,
      default_payment_terms: 'Net 30',
    });
  assert(templateRes.status === 201, 'Quotation template successfully created (201)');
  const templateId = templateRes.body.data.id;

  // Create Quotation from Template for Alice
  const quoteRes = await request(app)
    .post('/api/v1/subscriptions/quote')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      customer_id: customerAId,
      quotation_template_id: templateId,
      plan_id: planFullPermId,
      lines: [
        {
          plan_id: planFullPermId,
          quantity: 2,
          unit_price: 200.00,
          tax_id: taxId,
        },
      ],
      validity_days: 30,
    });
  assert(quoteRes.status === 201, 'Quotation successfully generated (201)');
  const quote = quoteRes.body.data;
  assert(quote.status === 'quotation', 'Initial status is "quotation"');
  assert(!!quote.subscription_number, 'Unique subscription number generated');
  assert(quote.payment_terms === 'Net 30', 'Payment terms inherited from template');
  assert(!!quote.quotation_valid_until, 'Quotation validity date set');
  assert(quote.subtotal === '400.00' || quote.subtotal === 400, 'Subtotal: 2 * 200 = 400.00');
  assert(quote.tax_total === '40.00' || quote.tax_total === 40, 'Tax total: 10% of 400 = 40.00');
  assert(quote.total_amount === '440.00' || quote.total_amount === 440, 'Total amount: 400 + 40 = 440.00');
  const quoteId = quote.id;

  // =================================================================
  // TEST 2: Subscription Creation with Lines, Taxes, and Totals
  // =================================================================
  console.log('\n[2. Direct Subscription Creation with Lines & Taxes]');

  // Non-staff/customer forbidden from creating subscriptions
  const customerCreateSubRes = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${customerAToken}`)
    .send({
      customer_id: customerAId,
      plan_id: planFullPermId,
    });
  assert(customerCreateSubRes.status === 403, 'Customer forbidden from creating subscription directly (403)');

  // Staff creates Draft subscription for Bob
  const directSubRes = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      customer_id: customerBId,
      plan_id: planFullPermId,
      payment_terms: 'Due Upon Receipt',
      lines: [
        {
          plan_id: planFullPermId,
          quantity: 3,
          unit_price: 200.00,
          tax_id: taxId,
        },
      ],
    });
  assert(directSubRes.status === 201, 'Staff created draft subscription (201)');
  const bobSub = directSubRes.body.data;
  assert(bobSub.status === 'draft', 'Initial status is "draft"');
  assert(bobSub.subtotal === '600.00' || bobSub.subtotal === 600, 'Subtotal: 3 * 200 = 600.00');
  assert(bobSub.tax_total === '60.00' || bobSub.tax_total === 60, 'Tax: 10% of 600 = 60.00');
  assert(bobSub.total_amount === '660.00' || bobSub.total_amount === 660, 'Total: 660.00');
  assert(bobSub.lines.length === 1, 'Line item created');
  assert(bobSub.lines[0].product_id === productId, 'Line product_id resolved from plan variant');
  const bobSubId = bobSub.id;

  // =================================================================
  // TEST 3: Status Transition Workflow: Draft → Quotation → Confirmed → Active → Closed
  // =================================================================
  console.log('\n[3. Status Transition Workflow: Draft → Quotation → Confirmed → Active → Closed]');

  // 3a. Draft → Quotation
  const toQuoteRes = await request(app)
    .patch(`/api/v1/subscriptions/${bobSubId}/status`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ status: 'quotation' });
  assert(toQuoteRes.status === 200, 'Draft → Quotation succeeded (200)');
  assert(toQuoteRes.body.data.status === 'quotation', 'Status is "quotation"');

  // 3b. Quotation → Confirmed
  const toConfirmedRes = await request(app)
    .patch(`/api/v1/subscriptions/${bobSubId}/status`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ status: 'confirmed' });
  assert(toConfirmedRes.status === 200, 'Quotation → Confirmed succeeded (200)');
  assert(toConfirmedRes.body.data.status === 'confirmed', 'Status is "confirmed"');

  // 3c. Confirmed → Active
  const toActiveRes = await request(app)
    .patch(`/api/v1/subscriptions/${bobSubId}/status`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ status: 'active' });
  assert(toActiveRes.status === 200, 'Confirmed → Active succeeded (200)');
  assert(toActiveRes.body.data.status === 'active', 'Status is "active"');

  // 3d. Active → Closed
  const toClosedRes = await request(app)
    .patch(`/api/v1/subscriptions/${bobSubId}/status`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ status: 'closed' });
  assert(toClosedRes.status === 200, 'Active → Closed succeeded (200)');
  assert(toClosedRes.body.data.status === 'closed', 'Status is "closed"');

  // =================================================================
  // TEST 4: Reject Invalid Status Transitions
  // =================================================================
  console.log('\n[4. Rejection of Invalid Status Transitions]');

  // 4a. Transition from Closed (terminal state) to Active -> MUST FAIL (400)
  const closedToActiveRes = await request(app)
    .patch(`/api/v1/subscriptions/${bobSubId}/status`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ status: 'active' });
  assert(
    closedToActiveRes.status === 400 && closedToActiveRes.body.message.includes('Invalid status transition'),
    'Reject transition from Closed to Active (400)'
  );

  // 4b. Customer attempting to transition status -> MUST FAIL (403)
  const customerTransitionRes = await request(app)
    .patch(`/api/v1/subscriptions/${quoteId}/status`)
    .set('Authorization', `Bearer ${customerAToken}`)
    .send({ status: 'confirmed' });
  assert(customerTransitionRes.status === 403, 'Customer forbidden from transitioning subscription status (403)');

  // =================================================================
  // TEST 5: Pause, Resume, Renewal & Early Close Plan Permissions
  // =================================================================
  console.log('\n[5. Pause, Resume, Renewal & Early Close Plan Permission Enforcement]');

  // 5a. Create Active Subscription on Restricted Plan (NO pause, NO renewal, NO early close)
  const lockedSubRes = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      customer_id: customerAId,
      plan_id: planRestrictedId,
      lines: [{ plan_id: planRestrictedId, quantity: 1, unit_price: 2000.00 }],
    });
  const lockedSubId = lockedSubRes.body.data.id;

  // Activate locked subscription (draft -> confirmed -> active)
  await request(app).patch(`/api/v1/subscriptions/${lockedSubId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'confirmed' });
  await request(app).patch(`/api/v1/subscriptions/${lockedSubId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'active' });

  // 5b. Attempt Pause on Locked Plan -> MUST FAIL (400)
  const lockedPauseRes = await request(app)
    .patch(`/api/v1/subscriptions/${lockedSubId}/pause`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert(
    lockedPauseRes.status === 400 && lockedPauseRes.body.message.includes('does not permit pausing'),
    'Reject pause when plan.allow_pause is false (400)'
  );

  // 5c. Attempt Renewal on Locked Plan -> MUST FAIL (400)
  const lockedRenewRes = await request(app)
    .patch(`/api/v1/subscriptions/${lockedSubId}/renew`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert(
    lockedRenewRes.status === 400 && lockedRenewRes.body.message.includes('does not permit renewal'),
    'Reject renewal when plan.allow_renewal is false (400)'
  );

  // 5d. Attempt Early Close on Locked Plan -> MUST FAIL (400)
  const lockedCloseRes = await request(app)
    .patch(`/api/v1/subscriptions/${lockedSubId}/close`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert(
    lockedCloseRes.status === 400 && lockedCloseRes.body.message.includes('does not permit early closure'),
    'Reject early closure when plan.allow_early_close is false (400)'
  );

  // 5e. Test Allowed Pause & Resume on Permitted Plan
  // Activate Alice's quote (quotation -> confirmed -> active)
  await request(app).patch(`/api/v1/subscriptions/${quoteId}/status`).set('Authorization', `Bearer ${staffToken}`).send({ status: 'confirmed' });
  await request(app).patch(`/api/v1/subscriptions/${quoteId}/status`).set('Authorization', `Bearer ${staffToken}`).send({ status: 'active' });

  const pauseRes = await request(app)
    .patch(`/api/v1/subscriptions/${quoteId}/pause`)
    .set('Authorization', `Bearer ${staffToken}`);
  assert(pauseRes.status === 200, 'Pause succeeds when plan.allow_pause is true (200)');
  assert(pauseRes.body.data.status === 'paused', 'Status updated to "paused"');

  const resumeRes = await request(app)
    .patch(`/api/v1/subscriptions/${quoteId}/resume`)
    .set('Authorization', `Bearer ${staffToken}`);
  assert(resumeRes.status === 200, 'Resume succeeds from paused state (200)');
  assert(resumeRes.body.data.status === 'active', 'Status resumed to "active"');

  // 5f. Test Allowed Renewal on Permitted Plan
  const originalExpiry = resumeRes.body.data.expiry_date;
  const renewRes = await request(app)
    .patch(`/api/v1/subscriptions/${quoteId}/renew`)
    .set('Authorization', `Bearer ${staffToken}`);
  assert(renewRes.status === 200, 'Renewal succeeds when plan.allow_renewal is true (200)');
  assert(new Date(renewRes.body.data.expiry_date) > new Date(originalExpiry), 'Expiry date extended after renewal');

  // =================================================================
  // TEST 6: Customer Isolation Security
  // =================================================================
  console.log('\n[6. Customer Data Isolation Security]');

  // 6a. Alice tries to access Bob's subscription -> MUST FAIL (403)
  const aliceAccessBobSub = await request(app)
    .get(`/api/v1/subscriptions/${bobSubId}`)
    .set('Authorization', `Bearer ${customerAToken}`);
  assert(aliceAccessBobSub.status === 403, 'Customer Alice cannot access Bob subscription (403)');

  // 6b. Alice accesses her own subscription -> MUST SUCCEED (200)
  const aliceAccessOwnSub = await request(app)
    .get(`/api/v1/subscriptions/${quoteId}`)
    .set('Authorization', `Bearer ${customerAToken}`);
  assert(aliceAccessOwnSub.status === 200, 'Customer Alice can access her own subscription (200)');
  assert(aliceAccessOwnSub.body.data.customer_id === customerAId, 'Subscription belongs to Alice');

  // 6c. Alice lists subscriptions -> returns ONLY Alice subscriptions
  const aliceListSubs = await request(app)
    .get('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${customerAToken}`);
  assert(aliceListSubs.status === 200, 'Alice can list subscriptions (200)');
  assert(
    aliceListSubs.body.data.every(s => s.customer_id === customerAId),
    'Listed subscriptions exclusively belong to Alice'
  );

  // 6d. Staff lists subscriptions -> can view all
  const staffListSubs = await request(app)
    .get('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${staffToken}`);
  assert(staffListSubs.status === 200, 'Staff can list all subscriptions (200)');
  assert(staffListSubs.body.data.length >= 2, 'Staff sees subscriptions across all customers');

  console.log('\n=======================================================');
  console.log('  🎉 ALL PHASE 3 SUBSCRIPTION & QUOTATION TESTS PASSED!');
  console.log('=======================================================\n');
}

runTests().catch(err => {
  console.error('Phase 3 test execution failed:', err);
  process.exit(1);
});

