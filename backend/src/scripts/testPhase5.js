process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { initDb, query, getClient } = require('../config/db');
const { ensureDefaultAdmin } = require('../server');
const invoiceService = require('../services/invoiceService');
const paymentService = require('../services/paymentService');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log('\n=======================================================');
  console.log('   SUBNEX Phase 5: Manual Payment Recording Engine');
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
  const staffEmail = `staff.phase5.${ts}@subnex.io`;
  const staffPass = 'StaffPhase5Pass@2026!';
  const createStaffRes = await request(app)
    .post('/api/v1/users/staff')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: staffEmail,
      password: staffPass,
      full_name: 'Phase 5 Staff Specialist',
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
      email: `bob.phase5.${ts}@subnex.io`,
      password: 'BobPassPhase5@2026!',
      full_name: 'Bob Payments',
    });
  assert(custBobRes.status === 201, 'Customer Bob registered');
  const bobId = custBobRes.body.data.user.id;
  const bobToken = custBobRes.body.data.token;

  const custCarolRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: `carol.phase5.${ts}@subnex.io`,
      password: 'CarolPassPhase5@2026!',
      full_name: 'Carol Payments',
    });
  assert(custCarolRes.status === 201, 'Customer Carol registered');
  const carolId = custCarolRes.body.data.user.id;
  const carolToken = custCarolRes.body.data.token;

  // 4. Setup Catalog (Product, Variant, Plan)
  const prodRes = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Cloud Platform P5 ${ts}`,
      sku: `PROD-P5-${ts}`,
      type: 'service',
      sales_price: 200.0,
      cost_price: 50.0,
    });
  assert(prodRes.status === 201, 'Product created');
  const productId = prodRes.body.data.id;

  const varRes = await request(app)
    .post(`/api/v1/products/${productId}/variants`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Pro Tier',
      sku: `VAR-P5-PRO-${ts}`,
      additional_price: 50.0,
    });
  assert(varRes.status === 201, 'Product Variant created');
  const variantId = varRes.body.data.id;

  const planRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Monthly Pro Plan',
      code: `PLAN-P5-PRO-${ts}`,
      price: 250.0,
      billing_interval: 'month',
      billing_interval_count: 1,
    });
  assert(planRes.status === 201, 'Monthly Plan created ($250/mo)');
  const planId = planRes.body.data.id;

  // Create Tax rule: 10% VAT
  const taxRes = await request(app)
    .post('/api/v1/taxes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'VAT 10%',
      rate: 10.0,
      tax_type: 'percentage',
    });
  assert(taxRes.status === 201, 'Tax rule created (10% VAT)');
  const taxId = taxRes.body.data.id;

  // Create Subscription for Bob ($250 plan x 2 qty = $500 subtotal + $50 tax = $550 total)
  const bobSubRes = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      customer_id: bobId,
      plan_id: planId,
      start_date: new Date('2026-01-01').toISOString(),
      initial_status: 'active',
      lines: [
        {
          plan_id: planId,
          product_id: productId,
          tax_id: taxId,
          quantity: 2,
          unit_price: 250.0,
        },
      ],
    });
  assert(bobSubRes.status === 201, 'Subscription created for Bob');
  const bobSubId = bobSubRes.body.data.id;

  // Manually align next_billing_date for test
  await query('UPDATE subscriptions SET next_billing_date = $1 WHERE id = $2', [
    '2026-02-01T00:00:00.000Z',
    bobSubId,
  ]);

  // Generate Invoice #1 for Bob ($550 total, confirmed)
  const genInvRes = await request(app)
    .post(`/api/v1/invoices/subscription/${bobSubId}`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      issueDate: '2026-02-01T00:00:00.000Z',
      targetDate: '2026-02-01T00:00:00.000Z',
      status: 'confirmed',
    });
  assert(genInvRes.status === 201, 'Invoice #1 generated for Bob');
  const bobInvoice1 = genInvRes.body.data.invoice;
  const bobInv1Id = bobInvoice1.id;
  assert(Number(bobInvoice1.total_amount) === 550, 'Bob Invoice #1 total is $550.00');
  assert(Number(bobInvoice1.amount_paid) === 0, 'Bob Invoice #1 initial amount_paid is $0.00');
  assert(Number(bobInvoice1.amount_remaining) === 550, 'Bob Invoice #1 initial amount_remaining is $550.00');
  assert(bobInvoice1.status === 'confirmed', 'Bob Invoice #1 initial status is confirmed');

  // =========================================================================
  // TEST SUITE 1: Multiple Partial Payments & Total Received Calculation
  // =========================================================================
  console.log('\n--- Test Suite 1: Multiple Partial Payments & Total Received Calculation ---');

  // Customer Bob attempts to record payment -> 403 Forbidden
  const bobDirectPayRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${bobToken}`)
    .send({
      invoice_id: bobInv1Id,
      payment_method: 'bank_transfer',
      amount: 150.0,
      payment_date: '2026-02-05T10:00:00.000Z',
      note: 'Customer unauthorized payment attempt',
    });
  assert(bobDirectPayRes.status === 403, 'Customer forbidden from recording manual payments directly (HTTP 403)');

  // Partial Payment 1: $150 via bank_transfer recorded by Staff
  const pay1Date = '2026-02-05T10:00:00.000Z';
  const pay1Res = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      invoice_id: bobInv1Id,
      payment_method: 'bank_transfer',
      amount: 150.0,
      payment_date: pay1Date,
      note: 'Partial payment 1 via Wire',
    });
  assert(pay1Res.status === 201, 'Staff submitted partial payment 1 ($150)');
  assert(pay1Res.body.data.is_fully_paid === false, 'Invoice is not fully paid after payment 1');
  assert(pay1Res.body.data.invoice.status === 'confirmed', 'Invoice remains confirmed');
  assert(Number(pay1Res.body.data.invoice.amount_paid) === 150, 'Invoice amount_paid updated to $150.00');
  assert(Number(pay1Res.body.data.invoice.amount_remaining) === 400, 'Invoice amount_remaining is $400.00');
  const pay1Record = pay1Res.body.data.payment;
  assert(pay1Record.invoice_id === bobInv1Id, 'Payment 1 correctly linked to Invoice ID');
  assert(pay1Record.customer_id === bobId, 'Payment 1 correctly linked to Bob Customer ID');
  assert(pay1Record.payment_method === 'bank_transfer', 'Payment 1 method recorded as bank_transfer');
  assert(pay1Record.notes === 'Partial payment 1 via Wire', 'Payment 1 optional note recorded');
  assert(pay1Record.status === 'successful', 'Payment 1 status is successful');

  // Partial Payment 2: $200 via upi by Staff on behalf of Bob
  const pay2Res = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      invoice_id: bobInv1Id,
      payment_method: 'upi',
      amount: '200.00',
      payment_date: '2026-02-07T14:30:00.000Z',
      note: 'UPI ref #987654321',
    });
  assert(pay2Res.status === 201, 'Staff submitted partial payment 2 ($200)');
  assert(pay2Res.body.data.is_fully_paid === false, 'Invoice is not fully paid after payment 2');
  assert(Number(pay2Res.body.data.invoice.amount_paid) === 350, 'Invoice amount_paid is $350.00 ($150 + $200)');
  assert(Number(pay2Res.body.data.invoice.amount_remaining) === 200, 'Invoice amount_remaining is $200.00');

  // Query invoice payment history & total calculation
  const invPaymentsRes = await request(app)
    .get(`/api/v1/invoices/${bobInv1Id}/payments`)
    .set('Authorization', `Bearer ${bobToken}`);
  assert(invPaymentsRes.status === 200, 'Fetched payments history for Invoice #1');
  assert(invPaymentsRes.body.data.payment_count === 2, 'History records 2 partial payments');
  assert(invPaymentsRes.body.data.total_payments_received === 350, 'total_payments_received calculated as $350.00');
  assert(invPaymentsRes.body.data.amount_remaining === 200, 'Outstanding balance calculated as $200.00');
  assert(invPaymentsRes.body.data.is_fully_paid === false, 'is_fully_paid flag is false');

  // =========================================================================
  // TEST SUITE 2: Full Payment & Automatic Transition to Paid
  // =========================================================================
  console.log('\n--- Test Suite 2: Full Payment & Automatic Transition to Paid ---');

  // Final Payment 3: Exact remaining balance ($200) via credit_card recorded by Staff
  const pay3Date = '2026-02-10T16:00:00.000Z';
  const pay3Res = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      invoice_id: bobInv1Id,
      payment_method: 'credit_card',
      amount: 200.0,
      payment_date: pay3Date,
      note: 'Final settlement via Credit Card',
    });
  assert(pay3Res.status === 201, 'Staff submitted final payment of remaining balance ($200)');
  assert(pay3Res.body.data.is_fully_paid === true, 'is_fully_paid is true');
  assert(pay3Res.body.data.invoice.status === 'paid', 'Invoice automatically marked as paid');
  assert(Number(pay3Res.body.data.invoice.amount_paid) === 550, 'Invoice amount_paid equals full $550.00');
  assert(Number(pay3Res.body.data.invoice.amount_remaining) === 0, 'Invoice amount_remaining is $0.00');
  assert(pay3Res.body.data.invoice.paid_at !== null, 'Invoice paid_at timestamp is populated');

  // Re-fetch invoice details directly
  const getBobInvRes = await request(app)
    .get(`/api/v1/invoices/${bobInv1Id}`)
    .set('Authorization', `Bearer ${bobToken}`);
  assert(getBobInvRes.status === 200, 'Re-fetched Invoice #1');
  const fetchedBobInv = getBobInvRes.body.data.invoice;
  assert(fetchedBobInv.status === 'paid', 'Verified persisted status is paid');
  assert(Number(fetchedBobInv.amount_remaining) === 0, 'Verified persisted remaining balance is 0.00');
  assert(fetchedBobInv.payments.length === 3, 'Invoice details include 3 payments in payment history');
  assert(fetchedBobInv.total_paid === 550, 'Invoice total_paid equals 550.00');

  // =========================================================================
  // TEST SUITE 3: Overpayment Prevention
  // =========================================================================
  console.log('\n--- Test Suite 3: Overpayment Prevention ---');

  // 1. Attempt to pay on already fully paid invoice
  const overpayPaidInvRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      invoice_id: bobInv1Id,
      payment_method: 'cash',
      amount: 50.0,
    });
  assert(overpayPaidInvRes.status === 400, 'Prevented payment on already paid invoice (HTTP 400)');
  assert(
    overpayPaidInvRes.body.message.includes('fully paid'),
    'Error message clearly states invoice is already fully paid'
  );

  // 2. Create fresh subscription & invoice #2 for Carol ($250)
  const carolSubRes = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      customer_id: carolId,
      plan_id: planId,
      start_date: new Date('2026-02-01').toISOString(),
      initial_status: 'active',
      lines: [
        {
          plan_id: planId,
          product_id: productId,
          quantity: 1,
          unit_price: 250.0,
        },
      ],
    });
  assert(carolSubRes.status === 201, 'Subscription created for Carol');
  const carolSubId = carolSubRes.body.data.id;

  await query('UPDATE subscriptions SET next_billing_date = $1 WHERE id = $2', [
    '2026-02-01T00:00:00.000Z',
    carolSubId,
  ]);

  const carolInvRes = await request(app)
    .post(`/api/v1/invoices/subscription/${carolSubId}`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      issueDate: '2026-02-01T00:00:00.000Z',
      targetDate: '2026-02-01T00:00:00.000Z',
      status: 'confirmed',
    });
  assert(carolInvRes.status === 201, 'Invoice generated for Carol ($250)');
  const carolInvId = carolInvRes.body.data.invoice.id;

  // 3. Attempt payment exceeding balance ($300 on $250 balance)
  const overpayExcessRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      invoice_id: carolInvId,
      payment_method: 'bank_transfer',
      amount: 300.0,
      note: 'Overpayment attempt',
    });
  assert(overpayExcessRes.status === 400, 'Prevented payment exceeding remaining balance (HTTP 400)');
  assert(
    overpayExcessRes.body.message.includes('exceeds invoice remaining balance'),
    'Error message explains amount exceeds remaining balance'
  );

  // Verify Carol invoice balance remains completely untouched
  const getCarolInvRes = await request(app)
    .get(`/api/v1/invoices/${carolInvId}`)
    .set('Authorization', `Bearer ${carolToken}`);
  assert(Number(getCarolInvRes.body.data.invoice.amount_paid) === 0, 'Carol invoice amount_paid remains 0');
  assert(Number(getCarolInvRes.body.data.invoice.amount_remaining) === 250, 'Carol invoice amount_remaining remains 250');
  assert(getCarolInvRes.body.data.invoice.payments.length === 0, 'No payment record was inserted');

  // =========================================================================
  // TEST SUITE 4: Invalid Amounts & Method Validation
  // =========================================================================
  console.log('\n--- Test Suite 4: Invalid Amounts & Input Validation ---');

  // Zero amount
  const zeroPayRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      invoice_id: carolInvId,
      payment_method: 'cash',
      amount: 0,
    });
  assert(zeroPayRes.status === 400, 'Rejected zero payment amount (HTTP 400)');

  // Negative amount
  const negPayRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      invoice_id: carolInvId,
      payment_method: 'cash',
      amount: -25.5,
    });
  assert(negPayRes.status === 400, 'Rejected negative payment amount (HTTP 400)');

  // Non-numeric amount string
  const strPayRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      invoice_id: carolInvId,
      payment_method: 'cash',
      amount: 'invalid_number',
    });
  assert(strPayRes.status === 400, 'Rejected non-numeric payment amount (HTTP 400)');

  // Invalid payment method
  const badMethodRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      invoice_id: carolInvId,
      payment_method: 'crypto_token',
      amount: 50.0,
    });
  assert(badMethodRes.status === 400, 'Rejected unsupported payment method (HTTP 400)');

  // Missing invoice ID
  const noInvRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      payment_method: 'manual',
      amount: 50.0,
    });
  assert(noInvRes.status === 400, 'Rejected missing invoice ID (HTTP 400)');

  // Non-existent invoice ID
  const nonExistentInvRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      invoice_id: '00000000-0000-0000-0000-000000000000',
      payment_method: 'manual',
      amount: 50.0,
    });
  assert(nonExistentInvRes.status === 404, 'Rejected payment for non-existent invoice (HTTP 404)');

  // Draft invoice payment attempt
  const draftInvRes = await query(
    `INSERT INTO invoices (
      invoice_number, customer_id, status, billing_period_start, billing_period_end,
      due_date, total_amount, amount_paid, amount_remaining
    ) VALUES ($1, $2, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 100, 0, 100)
    RETURNING id`,
    [`INV-DRAFT-${ts}`, bobId]
  );
  const draftInvId = draftInvRes.rows[0].id;
  const payDraftRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      invoice_id: draftInvId,
      payment_method: 'manual',
      amount: 50.0,
    });
  assert(payDraftRes.status === 400, 'Rejected payment on draft invoice (HTTP 400)');

  // =========================================================================
  // TEST SUITE 5: Identifying Outstanding Balances
  // =========================================================================
  console.log('\n--- Test Suite 5: Identifying Outstanding Balances ---');

  // Partial payment on Carol's invoice: $100 of $250 -> remaining $150
  const carolPartPayRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      invoice_id: carolInvId,
      payment_method: 'check',
      amount: 100.0,
      note: 'Check #5544',
    });
  assert(carolPartPayRes.status === 201, 'Staff recorded partial payment of $100 via check on Carol invoice');
  assert(Number(carolPartPayRes.body.data.invoice.amount_remaining) === 150, 'Carol remaining balance is $150.00');

  // Query outstanding invoices endpoint
  const outstandingRes = await request(app)
    .get('/api/v1/invoices/outstanding')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(outstandingRes.status === 200, 'Admin fetched outstanding invoices');
  const outstandingInvoices = outstandingRes.body.data.invoices;
  assert(outstandingInvoices.length >= 1, 'Outstanding invoices list is populated');
  const carolFoundInOutstanding = outstandingInvoices.find(i => i.id === carolInvId);
  assert(carolFoundInOutstanding !== undefined, 'Carol invoice ($150 remaining) appears in outstanding list');
  const bobFoundInOutstanding = outstandingInvoices.find(i => i.id === bobInv1Id);
  assert(bobFoundInOutstanding === undefined, 'Bob invoice #1 (paid, $0 remaining) is excluded from outstanding list');

  // Customer Carol querying outstanding invoices
  const carolOutstandingRes = await request(app)
    .get('/api/v1/invoices/outstanding')
    .set('Authorization', `Bearer ${carolToken}`);
  assert(carolOutstandingRes.status === 200, 'Carol fetched own outstanding invoices');
  assert(
    carolOutstandingRes.body.data.invoices.every(i => i.customer_id === carolId),
    'Carol only sees her own outstanding invoices'
  );

  // Payment summary endpoint
  const summaryRes = await request(app)
    .get('/api/v1/payments/summary')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(summaryRes.status === 200, 'Admin fetched payment summary');
  assert(summaryRes.body.data.total_payments_received >= 650, 'Payment summary reflects total payments received ($550 + $100)');
  assert(summaryRes.body.data.total_outstanding >= 150, 'Payment summary reflects total outstanding balance');

  // =========================================================================
  // TEST SUITE 6: Identifying Overdue Invoices
  // =========================================================================
  console.log('\n--- Test Suite 6: Identifying Overdue Invoices ---');

  // Setup 3 distinct test invoices for Bob:
  // Invoice A: due_date is 10 days ago, status 'confirmed', unpaid balance -> OVERDUE
  const pastDueDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const invARes = await query(
    `INSERT INTO invoices (
      invoice_number, customer_id, status, billing_period_start, billing_period_end,
      issue_date, due_date, total_amount, amount_paid, amount_remaining
    ) VALUES ($1, $2, 'confirmed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3, 300.00, 50.00, 250.00)
    RETURNING id`,
    [`INV-OVERDUE-A-${ts}`, bobId, pastDueDate]
  );
  const overdueInvId = invARes.rows[0].id;

  // Invoice B: due_date is 15 days in future, status 'confirmed', unpaid balance -> NOT OVERDUE
  const futureDueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
  const invBRes = await query(
    `INSERT INTO invoices (
      invoice_number, customer_id, status, billing_period_start, billing_period_end,
      issue_date, due_date, total_amount, amount_paid, amount_remaining
    ) VALUES ($1, $2, 'confirmed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3, 300.00, 0.00, 300.00)
    RETURNING id`,
    [`INV-FUTURE-B-${ts}`, bobId, futureDueDate]
  );
  const futureInvId = invBRes.rows[0].id;

  // Invoice C: due_date is 10 days ago, BUT status is 'paid', amount_remaining is 0 -> NOT OVERDUE
  const invCRes = await query(
    `INSERT INTO invoices (
      invoice_number, customer_id, status, billing_period_start, billing_period_end,
      issue_date, due_date, total_amount, amount_paid, amount_remaining, paid_at
    ) VALUES ($1, $2, 'paid', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3, 300.00, 300.00, 0.00, CURRENT_TIMESTAMP)
    RETURNING id`,
    [`INV-PAID-C-${ts}`, bobId, pastDueDate]
  );
  const paidPastInvId = invCRes.rows[0].id;

  // Query single invoice A (should have is_overdue: true)
  const getInvARes = await request(app)
    .get(`/api/v1/invoices/${overdueInvId}`)
    .set('Authorization', `Bearer ${bobToken}`);
  assert(getInvARes.body.data.invoice.is_overdue === true, 'Invoice A with past due date & unpaid status is identified as overdue');

  // Query single invoice B (future due date -> is_overdue: false)
  const getInvBRes = await request(app)
    .get(`/api/v1/invoices/${futureInvId}`)
    .set('Authorization', `Bearer ${bobToken}`);
  assert(getInvBRes.body.data.invoice.is_overdue === false, 'Invoice B with future due date is NOT overdue');

  // Query single invoice C (past due date but status 'paid' -> is_overdue: false)
  const getInvCRes = await request(app)
    .get(`/api/v1/invoices/${paidPastInvId}`)
    .set('Authorization', `Bearer ${bobToken}`);
  assert(getInvCRes.body.data.invoice.is_overdue === false, 'Invoice C with status paid is NOT overdue even if due date passed');

  // Query dedicated /invoices/overdue endpoint
  const overdueListRes = await request(app)
    .get('/api/v1/invoices/overdue')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(overdueListRes.status === 200, 'Admin fetched overdue invoices list');
  const overdueInvoices = overdueListRes.body.data.invoices;
  assert(overdueInvoices.some(i => i.id === overdueInvId), 'Overdue invoice A appears in overdue list');
  assert(!overdueInvoices.some(i => i.id === futureInvId), 'Future invoice B is excluded from overdue list');
  assert(!overdueInvoices.some(i => i.id === paidPastInvId), 'Paid invoice C is excluded from overdue list');

  // Point-in-time calculation with asOfDate (e.g. 20 days ago before invoice A was due)
  const historicalDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
  const histOverdueRes = await request(app)
    .get(`/api/v1/invoices/overdue?asOfDate=${historicalDate}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert(!histOverdueRes.body.data.invoices.some(i => i.id === overdueInvId), 'Invoice A was not yet overdue as of 20 days ago');

  // Customer Bob listing overdue invoices
  const bobOverdueRes = await request(app)
    .get('/api/v1/invoices/overdue')
    .set('Authorization', `Bearer ${bobToken}`);
  assert(bobOverdueRes.status === 200, 'Bob fetched own overdue invoices');
  assert(
    bobOverdueRes.body.data.invoices.every(i => i.customer_id === bobId),
    'Bob only sees his own overdue invoices'
  );

  // =========================================================================
  // TEST SUITE 7: Maintain Accurate Payment History
  // =========================================================================
  console.log('\n--- Test Suite 7: Maintain Accurate Payment History ---');

  // List all payments
  const allPaymentsRes = await request(app)
    .get('/api/v1/payments')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(allPaymentsRes.status === 200, 'Admin fetched payments history list');
  assert(allPaymentsRes.body.data.total >= 4, 'Payment history records at least 4 payments');
  const paymentsList = allPaymentsRes.body.data.payments;

  // Check required attributes on every payment
  for (const p of paymentsList) {
    assert(p.id !== undefined, 'Payment has ID');
    assert(p.payment_reference !== undefined, 'Payment has unique payment_reference');
    assert(p.invoice_id !== undefined, 'Payment contains invoice_id');
    assert(p.payment_method !== undefined, 'Payment contains payment_method');
    assert(Number(p.amount) > 0, 'Payment contains positive amount');
    assert(p.payment_date !== undefined, 'Payment contains payment_date');
    assert(p.status !== undefined, 'Payment contains status');
  }

  // Filter payments by payment_method
  const upiPaymentsRes = await request(app)
    .get('/api/v1/payments?payment_method=upi')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(upiPaymentsRes.status === 200, 'Filtered payments by method upi');
  assert(
    upiPaymentsRes.body.data.payments.every(p => p.payment_method === 'upi'),
    'All returned records have payment_method=upi'
  );

  // Filter payments by invoice_id
  const invPaymentsListRes = await request(app)
    .get(`/api/v1/payments?invoice_id=${bobInv1Id}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert(invPaymentsListRes.status === 200, 'Filtered payments by invoice_id');
  assert(invPaymentsListRes.body.data.payments.length === 3, 'Found exactly 3 payments for Bob Invoice #1');

  // Fetch individual payment by ID
  const singlePaymentRes = await request(app)
    .get(`/api/v1/payments/${pay1Record.id}`)
    .set('Authorization', `Bearer ${bobToken}`);
  assert(singlePaymentRes.status === 200, 'Bob fetched Payment 1 details');
  assert(singlePaymentRes.body.data.payment.id === pay1Record.id, 'Payment detail matches expected ID');
  assert(singlePaymentRes.body.data.payment.invoice_number !== undefined, 'Payment detail includes linked invoice_number');
  assert(singlePaymentRes.body.data.payment.customer_name === 'Bob Payments', 'Payment detail includes customer_name');

  // =========================================================================
  // TEST SUITE 8: Proper Authorization & Customer Isolation
  // =========================================================================
  console.log('\n--- Test Suite 8: Proper Authorization & Customer Data Isolation ---');

  // 1. Customer Bob attempts to record payment on own invoice -> 403 Forbidden
  const bobUnauthorizedPayRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${bobToken}`)
    .send({
      invoice_id: overdueInvId,
      payment_method: 'manual',
      amount: 50.0,
    });
  assert(bobUnauthorizedPayRes.status === 403, 'Customer Bob strictly forbidden from recording payments directly (HTTP 403)');

  // Customer Carol attempts to pay Bob's overdue invoice -> 403 Forbidden
  const unauthorizedPayRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${carolToken}`)
    .send({
      invoice_id: overdueInvId, // Belongs to Bob
      payment_method: 'manual',
      amount: 50.0,
    });
  assert(unauthorizedPayRes.status === 403, 'Carol forbidden from recording payment on Bob invoice (HTTP 403)');

  // 2. Customer Carol attempts to view Bob's payment -> 403 Forbidden
  const unauthorizedViewRes = await request(app)
    .get(`/api/v1/payments/${pay1Record.id}`)
    .set('Authorization', `Bearer ${carolToken}`);
  assert(unauthorizedViewRes.status === 403, 'Carol forbidden from viewing Bob payment record (HTTP 403)');

  // 3. Customer Bob lists payments -> only sees his own
  const bobPaymentsRes = await request(app)
    .get('/api/v1/payments')
    .set('Authorization', `Bearer ${bobToken}`);
  assert(bobPaymentsRes.status === 200, 'Bob listed payments');
  assert(
    bobPaymentsRes.body.data.payments.every(p => p.customer_id === bobId),
    'Bob only sees his own payments'
  );

  // 4. Customer Carol lists payments -> only sees her own
  const carolPaymentsRes = await request(app)
    .get('/api/v1/payments')
    .set('Authorization', `Bearer ${carolToken}`);
  assert(carolPaymentsRes.status === 200, 'Carol listed payments');
  assert(
    carolPaymentsRes.body.data.payments.every(p => p.customer_id === carolId),
    'Carol only sees her own payments'
  );

  // 5. Staff and Admin can view payments across all customers
  const staffAllPaymentsRes = await request(app)
    .get('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`);
  assert(staffAllPaymentsRes.status === 200, 'Staff listed all payments');
  const staffCustomerIds = new Set(staffAllPaymentsRes.body.data.payments.map(p => p.customer_id));
  assert(staffCustomerIds.has(bobId) && staffCustomerIds.has(carolId), 'Staff can view payments across both Bob and Carol');

  // =========================================================================
  // TEST SUITE 9: PostgreSQL Transaction Atomicity & Admin Refund
  // =========================================================================
  console.log('\n--- Test Suite 9: Transaction Atomicity & Admin Refund ---');

  // Create Invoice D for Bob ($100)
  const invDRes = await query(
    `INSERT INTO invoices (
      invoice_number, customer_id, status, billing_period_start, billing_period_end,
      due_date, total_amount, amount_paid, amount_remaining
    ) VALUES ($1, $2, 'confirmed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 100.00, 0.00, 100.00)
    RETURNING id`,
    [`INV-TX-D-${ts}`, bobId]
  );
  const invDId = invDRes.rows[0].id;

  // Record payment of $100 on Invoice D by Staff
  const payDRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      invoice_id: invDId,
      payment_method: 'bank_transfer',
      amount: 100.0,
      note: 'Payment to be refunded',
    });
  assert(payDRes.status === 201, 'Payment of $100 recorded on Invoice D by Staff');
  const payDId = payDRes.body.data.payment.id;
  assert(payDRes.body.data.invoice.status === 'paid', 'Invoice D marked as paid');

  // Customer Carol attempts to refund -> 403 Forbidden
  const custRefundRes = await request(app)
    .post(`/api/v1/payments/${payDId}/refund`)
    .set('Authorization', `Bearer ${carolToken}`);
  assert(custRefundRes.status === 403, 'Customer forbidden from issuing refund (HTTP 403)');

  // Admin refunds payment
  const adminRefundRes = await request(app)
    .post(`/api/v1/payments/${payDId}/refund`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert(adminRefundRes.status === 200, 'Admin successfully refunded payment');
  assert(adminRefundRes.body.data.payment.status === 'refunded', 'Payment status updated to refunded');
  assert(adminRefundRes.body.data.invoice.status === 'confirmed', 'Invoice D reverted from paid to confirmed');
  assert(adminRefundRes.body.data.invoice.amount_remaining === 100, 'Invoice D amount_remaining restored to $100.00');
  assert(adminRefundRes.body.data.invoice.amount_paid === 0, 'Invoice D amount_paid reset to $0.00');

  // Attempt duplicate refund on already refunded payment -> 400 Bad Request
  const dupRefundRes = await request(app)
    .post(`/api/v1/payments/${payDId}/refund`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert(dupRefundRes.status === 400, 'Prevented duplicate refund on already refunded payment (HTTP 400)');

  console.log('\n=======================================================');
  console.log('   🎉 ALL PHASE 5 TEST SUITES COMPLETED SUCCESSFULLY!  ');
  console.log('=======================================================\n');

  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
