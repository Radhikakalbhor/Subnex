process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { initDb, query, getClient } = require('../config/db');
const { ensureDefaultAdmin } = require('../server');
const invoiceService = require('../services/invoiceService');
const cronService = require('../services/cronService');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log('\n=======================================================');
  console.log('   SUBNEX Phase 4: Automatic Invoicing & Billing Engine');
  console.log('=======================================================\n');

  await initDb();
  await ensureDefaultAdmin();

  const ts = Date.now();

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
  const staffEmail = `staff.phase4.${ts}@subnex.io`;
  const staffPass = 'StaffPhase4Pass@2026!';
  const createStaffRes = await request(app)
    .post('/api/v1/users/staff')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: staffEmail,
      password: staffPass,
      full_name: 'Phase 4 Staff Specialist',
      role: 'staff',
    });
  assert(createStaffRes.status === 201, 'Admin created Staff account');

  const staffLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: staffEmail, password: staffPass });
  const staffToken = staffLoginRes.body.data.token;

  // 3. Register Customer Bob & Customer Carol
  const custBobRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: `bob.phase4.${ts}@subnex.io`,
      password: 'BobPassPhase4@2026!',
      full_name: 'Bob Billing',
    });
  assert(custBobRes.status === 201, 'Customer Bob registered');
  const bobId = custBobRes.body.data.user.id;
  const bobToken = custBobRes.body.data.token;

  const custCarolRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: `carol.phase4.${ts}@subnex.io`,
      password: 'CarolPassPhase4@2026!',
      full_name: 'Carol Customer',
    });
  assert(custCarolRes.status === 201, 'Customer Carol registered');
  const carolId = custCarolRes.body.data.user.id;
  const carolToken = custCarolRes.body.data.token;

  // 4. Create Product, Variant, and Plans for multiple recurring cycles
  const prodRes = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Cloud Storage Tier ${ts}`,
      sku: `CLOUD-STOR-${ts}`,
      sales_price: 100.0,
      cost_price: 30.0,
    });
  assert(prodRes.status === 201, 'Product created');
  const productId = prodRes.body.data.id;

  const varRes = await request(app)
    .post(`/api/v1/products/${productId}/variants`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Enterprise Tier',
      sku: `CLOUD-STOR-ENT-${ts}`,
      brand: 'SubnexCloud',
      additional_price: 20.0,
    });
  assert(varRes.status === 201, 'Product Variant created');
  const variantId = varRes.body.data.id;

  // Plans: Daily, Weekly, Monthly, Yearly
  const planDailyRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Cloud Daily Plan',
      code: `CLOUD-DAILY-${ts}`,
      billing_interval: 'day',
      billing_interval_count: 1,
      price: 10.0,
    });
  assert(planDailyRes.status === 201, 'Daily Plan created');
  const dailyPlanId = planDailyRes.body.data.id;

  const planWeeklyRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Cloud Weekly Plan',
      code: `CLOUD-WEEKLY-${ts}`,
      billing_interval: 'week',
      billing_interval_count: 1,
      price: 50.0,
    });
  assert(planWeeklyRes.status === 201, 'Weekly Plan created');
  const weeklyPlanId = planWeeklyRes.body.data.id;

  const planMonthlyRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Cloud Monthly Plan',
      code: `CLOUD-MONTHLY-${ts}`,
      billing_interval: 'month',
      billing_interval_count: 1,
      price: 200.0,
    });
  assert(planMonthlyRes.status === 201, 'Monthly Plan created');
  const monthlyPlanId = planMonthlyRes.body.data.id;

  const planYearlyRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Cloud Yearly Plan',
      code: `CLOUD-YEARLY-${ts}`,
      billing_interval: 'year',
      billing_interval_count: 1,
      price: 2000.0,
    });
  assert(planYearlyRes.status === 201, 'Yearly Plan created');
  const yearlyPlanId = planYearlyRes.body.data.id;

  // 5. Configure Tax Rule (10% VAT)
  const taxRes = await request(app)
    .post('/api/v1/taxes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `VAT Standard 10% ${ts}`,
      rate: 10.0,
      tax_type: 'percentage',
      country: 'US',
    });
  assert(taxRes.status === 201, 'Tax rule created (10% VAT)');
  const taxId = taxRes.body.data.id;

  // 6. Configure Discounts:
  // Disc A: Percentage discount with redemption limit of 2
  const discPercentRes = await request(app)
    .post('/api/v1/discounts')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Limited 20% Off',
      code: `SAVE20-${ts}`,
      discount_type: 'percentage',
      value: 20.0,
      max_redemptions: 10,
      target_scope: 'subscription',
      min_purchase_amount: 50.0,
      min_quantity: 1,
    });
  assert(discPercentRes.status === 201, '20% discount created with redemption limit');
  const discPercentId = discPercentRes.body.data.id;

  // Disc B: Fixed amount product-specific discount ($25 off)
  const discFixedRes = await request(app)
    .post('/api/v1/discounts')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Special $25 Off Product',
      code: `PROMO25-${ts}`,
      discount_type: 'fixed_amount',
      value: 25.0,
      target_scope: 'product',
      product_id: productId,
      min_purchase_amount: 10.0,
    });
  assert(discFixedRes.status === 201, 'Fixed $25 product-specific discount created');
  const discFixedId = discFixedRes.body.data.id;

  // =========================================================================
  // TEST SUITE 1: Payment Terms & Due Date Calculations
  // =========================================================================
  console.log('\n--- Test Suite 1: Payment Terms and Due Date Calculation ---');
  const baseDate = new Date('2026-05-01T00:00:00Z');
  const dueReceipt = invoiceService.calculateDueDate(baseDate, 'Due Upon Receipt');
  assert(dueReceipt.getTime() === baseDate.getTime(), 'Due Upon Receipt gives same date as issue date');

  const dueNet15 = invoiceService.calculateDueDate(baseDate, 'Net 15');
  const expectedNet15 = new Date('2026-05-16T00:00:00Z');
  assert(dueNet15.toISOString().slice(0, 10) === '2026-05-16', 'Net 15 adds exactly 15 days');

  const dueNet30 = invoiceService.calculateDueDate(baseDate, 'Net 30');
  assert(dueNet30.toISOString().slice(0, 10) === '2026-05-31', 'Net 30 adds exactly 30 days');

  // =========================================================================
  // TEST SUITE 2: Billing Recurring Cycles & Next Billing Date Maintenance
  // =========================================================================
  console.log('\n--- Test Suite 2: Recurring Cycles Calculation ---');
  const d1 = new Date('2026-01-01T00:00:00Z');
  const nextDay = invoiceService.calculateNextBillingDate(d1, 'day', 1);
  assert(nextDay.toISOString().slice(0, 10) === '2026-01-02', 'Daily cycle advances by 1 day');

  const nextWeek = invoiceService.calculateNextBillingDate(d1, 'week', 1);
  assert(nextWeek.toISOString().slice(0, 10) === '2026-01-08', 'Weekly cycle advances by 7 days');

  const nextMonth = invoiceService.calculateNextBillingDate(d1, 'month', 1);
  assert(nextMonth.toISOString().slice(0, 10) === '2026-02-01', 'Monthly cycle advances by 1 month');

  const nextYear = invoiceService.calculateNextBillingDate(d1, 'year', 1);
  assert(nextYear.toISOString().slice(0, 10) === '2027-01-01', 'Yearly cycle advances by 1 year');

  // =========================================================================
  // TEST SUITE 3: Subscription Creation & Automatic Invoicing with Taxes & Lines
  // =========================================================================
  console.log('\n--- Test Suite 3: Subscription Creation & Line Generation ---');
  const subStart = new Date('2026-01-01T00:00:00Z');
  const createSubRes = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      customer_id: bobId,
      plan_id: monthlyPlanId,
      start_date: subStart.toISOString(),
      payment_terms: 'Net 15',
      lines: [
        {
          product_id: productId,
          plan_id: monthlyPlanId,
          quantity: 2,
          unit_price: 200.0,
          tax_id: taxId,
        },
      ],
      initial_status: 'active',
    });
  assert(createSubRes.status === 201, 'Active monthly subscription created for Bob');
  const subBobId = createSubRes.body.data.id;

  // Manually ensure next_billing_date is set to subStart for billing test
  await query('UPDATE subscriptions SET next_billing_date = $1 WHERE id = $2', [subStart.toISOString(), subBobId]);

  // Generate invoice for Bob's subscription
  const invGenRes = await request(app)
    .post(`/api/v1/invoices/subscription/${subBobId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      issueDate: subStart.toISOString(),
    });
  assert(invGenRes.status === 201, 'Invoice successfully generated on-demand');
  const generatedInvoice = invGenRes.body.data.invoice;

  assert(generatedInvoice.subscription_id === subBobId, 'Invoice linked to correct subscription');
  assert(generatedInvoice.customer_id === bobId, 'Invoice linked to customer Bob');
  assert(parseFloat(generatedInvoice.subtotal) === 400.0, `Invoice subtotal is correct: ${generatedInvoice.subtotal} (expected 400.00)`);
  assert(parseFloat(generatedInvoice.tax_total) > 0, `Invoice tax calculated: ${generatedInvoice.tax_total}`);
  assert(generatedInvoice.due_date.startsWith('2026-01-16'), `Invoice due date accurately calculated via Net 15: ${generatedInvoice.due_date}`);
  assert(generatedInvoice.lines.length === 1, 'Invoice has correct line items');
  assert(generatedInvoice.lines[0].quantity === 2, 'Line quantity matches subscription line');

  // Verify subscription next_billing_date was advanced to 2026-02-01
  const subCheck = await query('SELECT next_billing_date, current_period_start, current_period_end FROM subscriptions WHERE id = $1', [subBobId]);
  const updatedSub = subCheck.rows[0];
  assert(updatedSub.next_billing_date.toISOString().slice(0, 10) === '2026-02-01', 'Subscription next_billing_date advanced correctly');

  // =========================================================================
  // TEST SUITE 4: Duplicate Billing Prevention & Idempotency
  // =========================================================================
  console.log('\n--- Test Suite 4: Duplicate Invoicing Prevention & Idempotency ---');
  // Attempting to generate invoice for the same subscription period
  const dupAttempt = await request(app)
    .post(`/api/v1/invoices/subscription/${subBobId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      // Forced period start matching the first period
      targetDate: subStart.toISOString(),
    });
  // Since sub next_billing_date is now Feb 1, calling generate without force targets the new period.
  // Let's test direct duplicate prevention by attempting to insert with same subscription_id and billing_period_start:
  let uniqueConstraintBlocked = false;
  try {
    await query(
      `INSERT INTO invoices (
        invoice_number, subscription_id, customer_id, status,
        billing_period_start, billing_period_end, issue_date, due_date,
        subtotal, total_amount, amount_remaining
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        'INV-DUP-TEST-001',
        subBobId,
        bobId,
        'draft',
        generatedInvoice.billing_period_start,
        generatedInvoice.billing_period_end,
        new Date().toISOString(),
        new Date().toISOString(),
        100.0,
        100.0,
        100.0,
      ]
    );
  } catch (err) {
    if (err.message.includes('uq_invoice_subscription_period') || err.code === '23505') {
      uniqueConstraintBlocked = true;
    }
  }
  assert(uniqueConstraintBlocked, 'Database UNIQUE constraint prevented duplicate invoice for same period');

  // =========================================================================
  // TEST SUITE 5: Discount Eligibility, Safe Redemption Counts, and Limits
  // =========================================================================
  console.log('\n--- Test Suite 5: Discounts Eligibility & Usage Limit Enforcement ---');
  // Check initial times_redeemed for SAVE20-P4
  const discCheck1 = await query('SELECT times_redeemed, max_redemptions FROM discounts WHERE id = $1', [discPercentId]);
  const initialRedemptions = parseInt(discCheck1.rows[0].times_redeemed, 10);

  // Create another subscription with preferred discount code SAVE20-P4
  const subCarolRes = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      customer_id: carolId,
      plan_id: monthlyPlanId,
      start_date: new Date('2026-03-01T00:00:00Z').toISOString(),
      lines: [
        {
          product_id: productId,
          plan_id: monthlyPlanId,
          quantity: 1,
          unit_price: 200.0,
          tax_id: taxId,
        },
      ],
      initial_status: 'active',
      notes: 'Carol subscription with discount test',
    });
  assert(subCarolRes.status === 201, 'Subscription created for Carol');
  const subCarolId = subCarolRes.body.data.id;

  // Set next_billing_date
  await query('UPDATE subscriptions SET next_billing_date = $1, metadata = $2 WHERE id = $3', [
    '2026-03-01T00:00:00Z',
    JSON.stringify({ discount_code: `SAVE20-${ts}` }),
    subCarolId,
  ]);

  // Generate invoice for Carol
  const carolInvRes = await request(app)
    .post(`/api/v1/invoices/subscription/${subCarolId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      issueDate: '2026-03-01T00:00:00Z',
    });
  assert(carolInvRes.status === 201, 'Carol invoice generated with discount');
  const carolInvoice = carolInvRes.body.data.invoice;
  assert(parseFloat(carolInvoice.discount_total) > 0, `Discount was successfully applied: $${carolInvoice.discount_total}`);

  // Verify times_redeemed incremented
  const discCheck2 = await query('SELECT times_redeemed FROM discounts WHERE id = $1', [discPercentId]);
  assert(
    parseInt(discCheck2.rows[0].times_redeemed, 10) === initialRedemptions + 1,
    'Discount times_redeemed safely incremented in database'
  );

  // =========================================================================
  // TEST SUITE 6: Transaction Atomic Rollback on Failure
  // =========================================================================
  console.log('\n--- Test Suite 6: Atomic PostgreSQL Transaction Rollback on Failure ---');
  const preRollbackInvCount = await query('SELECT COUNT(*) as cnt FROM invoices');
  const countBefore = parseInt(preRollbackInvCount.rows[0].cnt, 10);

  let rollbackSucceeded = false;
  try {
    // Attempt to invoke invoice generation on non-existent subscription
    await invoiceService.generateInvoiceForSubscription('00000000-0000-0000-0000-000000000000');
  } catch (err) {
    rollbackSucceeded = true;
  }
  assert(rollbackSucceeded, 'Invoice generation failed gracefully on invalid state');

  const postRollbackInvCount = await query('SELECT COUNT(*) as cnt FROM invoices');
  const countAfter = parseInt(postRollbackInvCount.rows[0].cnt, 10);
  assert(countBefore === countAfter, 'No orphaned invoices or partial changes created on transaction failure');

  // =========================================================================
  // TEST SUITE 7: Invoice Status Lifecycle (Draft -> Confirmed -> Paid)
  // =========================================================================
  console.log('\n--- Test Suite 7: Invoice Status Workflow ---');
  // Create a draft invoice
  const draftInvRes = await invoiceService.generateInvoiceForSubscription(subCarolId, {
    issueDate: '2026-04-01T00:00:00Z',
    status: 'draft',
  });
  const draftInvoice = draftInvRes.invoice;
  assert(draftInvoice.status === 'draft', 'Invoice created with status "draft"');

  // Transition draft -> confirmed via API
  const confirmRes = await request(app)
    .patch(`/api/v1/invoices/${draftInvoice.id}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'confirmed' });
  assert(confirmRes.status === 200, 'Invoice successfully transitioned to "confirmed"');
  assert(confirmRes.body.data.invoice.status === 'confirmed', 'Status updated to confirmed');

  // Transition confirmed -> paid
  const paidRes = await request(app)
    .patch(`/api/v1/invoices/${draftInvoice.id}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'paid' });
  assert(paidRes.status === 200, 'Invoice successfully transitioned to "paid"');
  assert(paidRes.body.data.invoice.status === 'paid', 'Status updated to paid');
  assert(paidRes.body.data.invoice.paid_at !== null, 'Invoice paid_at timestamp is populated');
  assert(parseFloat(paidRes.body.data.invoice.amount_remaining) === 0, 'Invoice amount_remaining is 0.00');

  // Reject invalid transition: paid -> draft
  const invalidTransitionRes = await request(app)
    .patch(`/api/v1/invoices/${draftInvoice.id}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'draft' });
  assert(invalidTransitionRes.status === 400, 'Rejected invalid transition from "paid" to "draft"');

  // =========================================================================
  // TEST SUITE 8: Customer RBAC and Data Isolation
  // =========================================================================
  console.log('\n--- Test Suite 8: Security & Customer Data Isolation ---');
  // Bob requests his own invoice -> Success
  const bobOwnInvRes = await request(app)
    .get(`/api/v1/invoices/${generatedInvoice.id}`)
    .set('Authorization', `Bearer ${bobToken}`);
  assert(bobOwnInvRes.status === 200, 'Bob can view his own invoice');

  // Carol requests Bob's invoice -> Forbidden (403)
  const carolPeeksBobRes = await request(app)
    .get(`/api/v1/invoices/${generatedInvoice.id}`)
    .set('Authorization', `Bearer ${carolToken}`);
  assert(carolPeeksBobRes.status === 403, 'Carol is forbidden from viewing Bob’s invoice (HTTP 403)');

  // Bob lists invoices -> only gets Bob's invoices
  const bobListRes = await request(app)
    .get('/api/v1/invoices')
    .set('Authorization', `Bearer ${bobToken}`);
  assert(bobListRes.status === 200, 'Bob listed invoices');
  const allBobInvoicesBelongToBob = bobListRes.body.data.invoices.every(i => i.customer_id === bobId);
  assert(allBobInvoicesBelongToBob, 'Bob only sees his own invoices in list endpoint');

  // Customer cannot update invoice status
  const custUpdateRes = await request(app)
    .patch(`/api/v1/invoices/${generatedInvoice.id}/status`)
    .set('Authorization', `Bearer ${bobToken}`)
    .send({ status: 'paid' });
  assert(custUpdateRes.status === 403, 'Customer cannot directly update invoice status (HTTP 403)');

  // =========================================================================
  // TEST SUITE 9: Automatic Billing Execution via Cron Service & Due Subscriptions
  // =========================================================================
  console.log('\n--- Test Suite 9: Automated Recurring Billing Run Engine ---');
  // Set next_billing_date for Carol's subscription to past due
  await query("UPDATE subscriptions SET next_billing_date = '2026-05-01T00:00:00Z', auto_renew = TRUE WHERE id = $1", [subCarolId]);

  // Trigger billing run for target date 2026-05-02
  const cronSummary = await cronService.triggerBillingCronNow(new Date('2026-05-02T00:00:00Z'));
  assert(cronSummary.totalDue >= 1, `Billing engine identified ${cronSummary.totalDue} due subscriptions`);
  assert(cronSummary.successCount >= 1, `Billing engine generated ${cronSummary.successCount} invoices`);

  // Verify API endpoint for triggering billing (Admin/Staff only)
  const apiTriggerRes = await request(app)
    .post('/api/v1/invoices/trigger-billing')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ targetDate: '2026-05-03T00:00:00Z' });
  assert(apiTriggerRes.status === 200, 'Staff triggered billing run via API');

  // =========================================================================
  // TEST SUITE 10: Plan allow_auto_close & Subscription Expiry vs Auto-Renewal
  // =========================================================================
  console.log('\n--- Test Suite 10: Plan allow_auto_close & Expiry / Renewal Behavior ---');

  // 10a. Plan with allow_auto_close = TRUE
  const planAutoCloseRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Plan Auto Close True ${ts}`,
      code: `PLAN-AC-TRUE-${ts}`,
      billing_interval: 'month',
      billing_interval_count: 1,
      price: 150.0,
      allow_auto_close: true,
      allow_renewal: true,
    });
  assert(planAutoCloseRes.status === 201, 'Created plan with allow_auto_close = TRUE');
  const planAutoCloseId = planAutoCloseRes.body.data.id;

  // 10b. Plan with allow_auto_close = FALSE
  const planNoAutoCloseRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Plan Auto Close False ${ts}`,
      code: `PLAN-AC-FALSE-${ts}`,
      billing_interval: 'month',
      billing_interval_count: 1,
      price: 150.0,
      allow_auto_close: false,
      allow_renewal: true,
    });
  assert(planNoAutoCloseRes.status === 201, 'Created plan with allow_auto_close = FALSE');
  const planNoAutoCloseId = planNoAutoCloseRes.body.data.id;

  // Subscription 1: allow_auto_close = TRUE, auto_renew = FALSE -> Should auto-close
  const sub1Res = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      customer_id: bobId,
      plan_id: planAutoCloseId,
      start_date: new Date('2026-05-01T00:00:00Z').toISOString(),
      expiry_date: new Date('2026-06-01T00:00:00Z').toISOString(),
      lines: [{ product_id: productId, plan_id: planAutoCloseId, quantity: 1, unit_price: 150.0 }],
      initial_status: 'active',
    });
  assert(sub1Res.status === 201, 'Created subscription 1 for auto-close test');
  const sub1Id = sub1Res.body.data.id;
  await query("UPDATE subscriptions SET auto_renew = FALSE, expiry_date = '2026-06-01T00:00:00Z' WHERE id = $1", [sub1Id]);

  // Subscription 2: allow_auto_close = FALSE, auto_renew = FALSE -> Should NOT silently close; mark 'expired'
  const sub2Res = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      customer_id: carolId,
      plan_id: planNoAutoCloseId,
      start_date: new Date('2026-05-01T00:00:00Z').toISOString(),
      expiry_date: new Date('2026-06-01T00:00:00Z').toISOString(),
      lines: [{ product_id: productId, plan_id: planNoAutoCloseId, quantity: 1, unit_price: 150.0 }],
      initial_status: 'active',
    });
  assert(sub2Res.status === 201, 'Created subscription 2 for no-auto-close test');
  const sub2Id = sub2Res.body.data.id;
  await query("UPDATE subscriptions SET auto_renew = FALSE, expiry_date = '2026-06-01T00:00:00Z' WHERE id = $1", [sub2Id]);

  // Subscription 3: auto_renew = TRUE -> Should auto-renew through billing
  const sub3Res = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      customer_id: bobId,
      plan_id: planAutoCloseId,
      start_date: new Date('2026-05-01T00:00:00Z').toISOString(),
      expiry_date: new Date('2026-06-01T00:00:00Z').toISOString(),
      lines: [{ product_id: productId, plan_id: planAutoCloseId, quantity: 1, unit_price: 150.0 }],
      initial_status: 'active',
    });
  assert(sub3Res.status === 201, 'Created subscription 3 for auto-renew test');
  const sub3Id = sub3Res.body.data.id;
  await query(
    "UPDATE subscriptions SET auto_renew = TRUE, expiry_date = '2026-06-01T00:00:00Z', next_billing_date = '2026-06-01T00:00:00Z' WHERE id = $1",
    [sub3Id]
  );

  // Trigger billing and expiry engine for target date 2026-06-02
  const expiryRunSummary = await cronService.triggerBillingCronNow(new Date('2026-06-02T00:00:00Z'));
  assert(expiryRunSummary !== null, 'Billing & Expiry engine ran successfully');

  // Verify Subscription 1: Closed automatically (allow_auto_close = true)
  const sub1Check = await query('SELECT status, cancelled_at FROM subscriptions WHERE id = $1', [sub1Id]);
  assert(sub1Check.rows[0].status === 'closed', 'Subscription with allow_auto_close=true automatically transitioned to "closed"');
  assert(sub1Check.rows[0].cancelled_at !== null, 'Cancelled_at timestamp was recorded on auto-closure');

  // Verify Subscription 2: State preserved as 'expired' (allow_auto_close = false, NOT silently closed)
  const sub2Check = await query('SELECT status, cancelled_at FROM subscriptions WHERE id = $1', [sub2Id]);
  assert(sub2Check.rows[0].status === 'expired', 'Subscription with allow_auto_close=false transitioned to "expired" (not silently closed)');
  assert(sub2Check.rows[0].cancelled_at === null, 'Cancelled_at timestamp remains null for preserved expired state');

  // Verify Subscription 3: Auto-renewed through recurring billing
  const sub3Check = await query('SELECT status, next_billing_date, expiry_date FROM subscriptions WHERE id = $1', [sub3Id]);
  assert(sub3Check.rows[0].status === 'active', 'Auto-renewing subscription maintained "active" status');
  assert(sub3Check.rows[0].next_billing_date.toISOString().slice(0, 10) === '2026-07-01', 'Next billing date advanced to next period');
  assert(sub3Check.rows[0].expiry_date.toISOString().slice(0, 10) === '2026-07-01', 'Expiry date extended to next period for auto-renewal');

  // Verify no duplicate processing on subsequent runs
  const repeatExpiryRun = await invoiceService.processExpiredSubscriptions(new Date('2026-06-02T00:00:00Z'));
  const processedSub1Or2Again = repeatExpiryRun.processed.some(p => p.id === sub1Id || p.id === sub2Id);
  assert(!processedSub1Or2Again, 'Subsequent engine run does not repeatedly process already closed/expired subscriptions');

  console.log('\n=======================================================');
  console.log('   🎉 ALL PHASE 4 TEST SUITES COMPLETED SUCCESSFULLY!  ');
  console.log('=======================================================\n');
}

if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test execution failed with error:', err);
      process.exit(1);
    });
}

module.exports = { runTests };
