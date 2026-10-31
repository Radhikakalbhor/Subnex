process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { initDb, query } = require('../config/db');
const { ensureDefaultSeedUsers } = require('../server');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log('\n=======================================================');
  console.log('   SUBNEX Phase 6: Dashboard, Portal & Staff Analytics');
  console.log('=======================================================\n');

  await initDb();
  await ensureDefaultSeedUsers();

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

  // 2. Authenticate Staff
  const staffLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'staff@subnex.io',
      password: 'Staff@Subnex2026!',
    });
  assert(staffLoginRes.status === 200, 'Staff successfully authenticated');
  const staffToken = staffLoginRes.body.data.token;

  // 3. Register Customer Alpha
  const alphaEmail = `cust.alpha.${ts}@subnex.io`;
  const alphaPass = 'AlphaPass@2026!';
  const alphaRegRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: alphaEmail,
      password: alphaPass,
      full_name: 'Customer Alpha Enterprises',
      company_name: 'Alpha Holdings LLC',
    });
  assert(alphaRegRes.status === 201, 'Customer Alpha registered');
  const alphaToken = alphaRegRes.body.data.token;
  const alphaId = alphaRegRes.body.data.user.id;

  // 4. Register Customer Beta
  const betaEmail = `cust.beta.${ts}@subnex.io`;
  const betaPass = 'BetaPass@2026!';
  const betaRegRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: betaEmail,
      password: betaPass,
      full_name: 'Customer Beta Solutions',
      company_name: 'Beta Global Inc',
    });
  assert(betaRegRes.status === 201, 'Customer Beta registered');
  const betaToken = betaRegRes.body.data.token;
  const betaId = betaRegRes.body.data.user.id;

  // 5. Seed Catalog (Product -> Variant -> Plan)
  const productRes = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Cloud Infrastructure SaaS ${ts}`,
      type: 'saas',
      sales_price: 150.00,
      cost_price: 40.00,
      sku: `PROD-P6-${ts}`,
    });
  assert(productRes.status === 201, 'Product created');
  const productId = productRes.body.data.id;

  const variantRes = await request(app)
    .post(`/api/v1/products/${productId}/variants`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'High Performance Node',
      brand: 'Subnex Cloud',
      sku: `VAR-P6-${ts}`,
      additional_price: 50.00,
    });
  assert(variantRes.status === 201, 'Product variant created');
  const variantId = variantRes.body.data.id;

  const planRes = await request(app)
    .post(`/api/v1/variants/${variantId}/plans`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Pro Monthly Tier ${ts}`,
      code: `PLAN-P6-${ts}`,
      billing_interval: 'month',
      billing_interval_count: 1,
      price: 150.00,
      allow_pause: true,
      allow_renewal: true,
      allow_early_close: true,
    });
  assert(planRes.status === 201, 'Billing plan created');
  const planId = planRes.body.data.id;

  // 6. Create Subscriptions
  // Alpha Sub 1 (active)
  const alphaSubRes = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      customer_id: alphaId,
      plan_id: planId,
      lines: [
        {
          plan_id: planId,
          quantity: 2,
          unit_price: 150.00,
        },
      ],
    });
  assert(alphaSubRes.status === 201, 'Customer Alpha Subscription created');
  const alphaSubId = alphaSubRes.body.data.id;

  // Confirm and activate Alpha Sub
  await request(app)
    .patch(`/api/v1/subscriptions/${alphaSubId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'confirmed' });
  await request(app)
    .patch(`/api/v1/subscriptions/${alphaSubId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'active' });

  // Beta Sub 1 (paused)
  const betaSubRes = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      customer_id: betaId,
      plan_id: planId,
      lines: [
        {
          plan_id: planId,
          quantity: 1,
          unit_price: 200.00,
        },
      ],
    });
  assert(betaSubRes.status === 201, 'Customer Beta Subscription created');
  const betaSubId = betaSubRes.body.data.id;

  await request(app)
    .patch(`/api/v1/subscriptions/${betaSubId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'confirmed' });
  await request(app)
    .patch(`/api/v1/subscriptions/${betaSubId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'active' });
  await request(app)
    .patch(`/api/v1/subscriptions/${betaSubId}/pause`)
    .set('Authorization', `Bearer ${adminToken}`);

  // 7. Seed Invoices & Overdue Invoice
  // Invoice 1 for Alpha: $300.00, overdue (due date past)
  const inv1Res = await query(
    `INSERT INTO invoices (
      invoice_number, customer_id, subscription_id, status,
      subtotal, tax_total, total_amount, amount_paid, amount_remaining,
      billing_period_start, billing_period_end, issue_date, due_date
    ) VALUES (
      $1, $2, $3, 'confirmed',
      300.00, 0.00, 300.00, 0.00, 300.00,
      '2026-01-01', '2026-01-31', '2026-01-01', '2026-01-15'
    ) RETURNING id`,
    [`INV-P6-1-${ts}`, alphaId, alphaSubId]
  );
  const inv1Id = inv1Res.rows[0].id;

  // Invoice 2 for Beta: $200.00, confirmed with partial payment
  const inv2Res = await query(
    `INSERT INTO invoices (
      invoice_number, customer_id, subscription_id, status,
      subtotal, tax_total, total_amount, amount_paid, amount_remaining,
      billing_period_start, billing_period_end, issue_date, due_date
    ) VALUES (
      $1, $2, $3, 'confirmed',
      200.00, 0.00, 200.00, 50.00, 150.00,
      '2026-02-01', '2026-02-28', '2026-02-01', '2026-12-31'
    ) RETURNING id`,
    [`INV-P6-2-${ts}`, betaId, betaSubId]
  );
  const inv2Id = inv2Res.rows[0].id;

  // Record initial partial payment of $50 for Beta
  await query(
    `INSERT INTO payments (
      payment_reference, invoice_id, customer_id, amount,
      currency, payment_method, status, payment_date, notes
    ) VALUES (
      $1, $2, $3, 50.00,
      'USD', 'bank_transfer', 'successful', '2026-02-05', 'Initial partial payment'
    )`,
    [`PAY-P6-INIT-${ts}`, inv2Id, betaId]
  );

  console.log('\n--- Test Suite 1: Admin Dashboard Real Data Metrics ---');
  const adminStatsRes = await request(app)
    .get('/api/v1/dashboard/stats')
    .set('Authorization', `Bearer ${adminToken}`);

  assert(adminStatsRes.status === 200, 'Admin successfully retrieved /dashboard/stats');
  const adminData = adminStatsRes.body.data;
  const kpis = adminData.kpis;

  // Requirement 1: Total active subscriptions
  assert(kpis.active_subscriptions >= 1, `Active subscriptions count >= 1 (got ${kpis.active_subscriptions})`);

  // Requirement 2: Total revenue received
  assert(Number(kpis.total_revenue) >= 50.00, `Total revenue reflects payments (got ${kpis.total_revenue})`);

  // Requirement 3: Outstanding payment amount
  assert(Number(kpis.total_outstanding) >= 450.00, `Outstanding balance reflects unpaid invoices (got ${kpis.total_outstanding})`);

  // Requirement 4: Number of overdue invoices
  assert(kpis.overdue_invoices_count >= 1, `Overdue invoices count >= 1 (got ${kpis.overdue_invoices_count})`);
  assert(Number(kpis.total_overdue_amount) >= 300.00, `Overdue amount reflects overdue invoice 1 (got ${kpis.total_overdue_amount})`);

  // Requirement 5: Subscription statistics
  assert(adminData.subscription_statistics !== undefined, 'Subscription status statistics returned');
  assert(adminData.subscription_statistics.active >= 1, `Subscription statistics reflect active subscription (got ${adminData.subscription_statistics.active})`);

  // Requirement 6: Payment and invoice summaries
  assert(adminData.payment_method_breakdown !== undefined, 'Payment method breakdown summary returned');
  assert(adminData.invoice_status_breakdown !== undefined, 'Invoice status breakdown summary returned');
  assert(Array.isArray(adminData.recent_invoices), 'Recent invoices summary list returned');
  assert(Array.isArray(adminData.recent_payments), 'Recent payments summary list returned');

  console.log('\n--- Test Suite 2: Admin Dashboard Filtering Capabilities ---');
  // Requirement 7: Filter by customer
  const filteredByAlphaRes = await request(app)
    .get(`/api/v1/dashboard/stats?customer_id=${alphaId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert(filteredByAlphaRes.status === 200, 'Filtered dashboard by customer Alpha');
  const alphaMetrics = filteredByAlphaRes.body.data.kpis;
  assert(Number(alphaMetrics.total_outstanding) === 300.00, `Alpha filtered outstanding balance is exactly $300.00 (got ${alphaMetrics.total_outstanding})`);

  // Filter by status
  const filteredActiveSubRes = await request(app)
    .get('/api/v1/dashboard/stats?status=active')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(filteredActiveSubRes.status === 200, 'Filtered dashboard by status active');

  // Filter by date range
  const filteredByDateRes = await request(app)
    .get('/api/v1/dashboard/stats?from_date=2026-01-01&to_date=2026-01-31')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(filteredByDateRes.status === 200, 'Filtered dashboard by date range Jan 2026');

  console.log('\n--- Test Suite 3: Pagination Across Datasets ---');
  // Requirement 8: Pagination for large datasets
  const paginatedInvoicesRes = await request(app)
    .get('/api/v1/invoices?limit=1&offset=0')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(paginatedInvoicesRes.status === 200, 'Paginated invoices request succeeded');
  assert(paginatedInvoicesRes.body.data.invoices.length === 1, 'Invoices limit=1 returns exactly 1 item');
  assert(paginatedInvoicesRes.body.data.total >= 2, 'Total record count returned for pagination');

  const paginatedPaymentsRes = await request(app)
    .get('/api/v1/payments?limit=1&offset=0')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(paginatedPaymentsRes.status === 200, 'Paginated payments request succeeded');
  assert(paginatedPaymentsRes.body.data.payments.length === 1, 'Payments limit=1 returns exactly 1 item');

  console.log('\n--- Test Suite 4: Customer Portal Data Isolation & Self-Service ---');
  // Customer Alpha views own dashboard stats
  const alphaPortalStats = await request(app)
    .get('/api/v1/dashboard/stats')
    .set('Authorization', `Bearer ${alphaToken}`);
  assert(alphaPortalStats.status === 200, 'Customer Alpha fetched own portal stats');
  assert(Number(alphaPortalStats.body.data.kpis.total_outstanding) === 300.00, 'Customer Alpha portal displays only own outstanding balance ($300.00)');
  assert(alphaPortalStats.body.data.kpis.active_subscriptions === 1, 'Customer Alpha sees only own 1 active subscription');

  // Customer Alpha views own subscriptions
  const alphaSubs = await request(app)
    .get('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${alphaToken}`);
  assert(alphaSubs.status === 200, 'Customer Alpha fetched subscriptions');
  assert(alphaSubs.body.data.length === 1, 'Customer Alpha sees only 1 subscription');
  assert(alphaSubs.body.data[0].id === alphaSubId, 'Returned subscription belongs to Alpha');

  // Customer Alpha views own invoices
  const alphaInvs = await request(app)
    .get('/api/v1/invoices')
    .set('Authorization', `Bearer ${alphaToken}`);
  assert(alphaInvs.status === 200, 'Customer Alpha fetched invoices');
  assert(alphaInvs.body.data.invoices.every(i => i.customer_id === alphaId), 'All invoices strictly belong to Customer Alpha');

  // Customer Alpha attempts to record manual payment -> 403 Forbidden
  const alphaCustPayRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${alphaToken}`)
    .send({
      invoice_id: inv1Id,
      amount: 150.00,
      payment_method: 'bank_transfer',
      notes: 'Customer Alpha unauthorized direct payment attempt',
    });
  assert(alphaCustPayRes.status === 403, 'Customer Alpha strictly forbidden from recording payments directly (HTTP 403)');

  // Staff records verified payment against Customer Alpha invoice
  const staffPayRes = await request(app)
    .post('/api/v1/payments')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      invoice_id: inv1Id,
      amount: 150.00,
      payment_method: 'bank_transfer',
      notes: 'Staff verified payment for Customer Alpha',
    });
  assert(staffPayRes.status === 201, 'Staff verified manual payment recorded');
  assert(Number(staffPayRes.body.data.invoice.amount_remaining) === 150.00, 'Invoice balance updated to $150.00');

  // Customer Beta cannot see Alpha's payment or invoices
  const betaPaymentsRes = await request(app)
    .get('/api/v1/payments')
    .set('Authorization', `Bearer ${betaToken}`);
  assert(betaPaymentsRes.status === 200, 'Customer Beta fetched payments');
  assert(betaPaymentsRes.body.data.payments.every(p => p.customer_id === betaId), 'Customer Beta sees only their own payments');

  console.log('\n--- Test Suite 5: Staff Panel Permissions & Access Control ---');
  // Staff can view dashboard overview
  const staffDashboardRes = await request(app)
    .get('/api/v1/dashboard/stats')
    .set('Authorization', `Bearer ${staffToken}`);
  assert(staffDashboardRes.status === 200, 'Staff can view system dashboard overview');

  // Staff can view customer registry
  const staffUsersRes = await request(app)
    .get('/api/v1/users')
    .set('Authorization', `Bearer ${staffToken}`);
  assert(staffUsersRes.status === 200, 'Staff has read access to customer registry');
  assert(Array.isArray(staffUsersRes.body.data), 'Staff received user registry list');

  // Staff is forbidden from refunding payments (Admin only)
  const staffRefundRes = await request(app)
    .post(`/api/v1/payments/${staffPayRes.body.data.payment.id}/refund`)
    .set('Authorization', `Bearer ${staffToken}`);
  assert(staffRefundRes.status === 403, 'Staff is strictly forbidden from refunding payments (HTTP 403)');

  // Staff is forbidden from creating staff accounts (Admin only)
  const staffCreateStaffRes = await request(app)
    .post('/api/v1/users/staff')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      email: `fake.staff.${ts}@subnex.io`,
      password: 'FakePass123!@#',
      full_name: 'Imposter Staff',
      role: 'staff',
    });
  assert(staffCreateStaffRes.status === 403, 'Staff is strictly forbidden from creating other staff (HTTP 403)');

  console.log('\n=======================================================');
  console.log('   🎉 ALL PHASE 6 TEST SUITES COMPLETED SUCCESSFULLY!  ');
  console.log('=======================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
