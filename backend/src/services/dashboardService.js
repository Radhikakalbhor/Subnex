const { query } = require('../config/db');

function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

async function getDashboardStats(filters = {}, user) {
  const isCustomer = user && user.role === 'customer';
  const customerId = isCustomer ? user.id : (filters.customer_id || null);
  const fromDate = filters.from_date ? new Date(filters.from_date).toISOString() : null;
  const toDate = filters.to_date ? new Date(filters.to_date).toISOString() : null;
  const statusFilter = filters.status || null;

  const validInvoiceStatuses = ['draft', 'confirmed', 'open', 'paid', 'void', 'uncollectible'];
  const validSubStatuses = ['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed', 'trialing', 'past_due', 'cancelled', 'expired'];

  // 1. Subscriptions stats
  const subWhere = [];
  const subParams = [];
  if (customerId) {
    subParams.push(customerId);
    subWhere.push(`customer_id = $${subParams.length}`);
  }
  if (fromDate) {
    subParams.push(fromDate);
    subWhere.push(`created_at >= $${subParams.length}`);
  }
  if (toDate) {
    subParams.push(toDate);
    subWhere.push(`created_at <= $${subParams.length}`);
  }
  if (statusFilter && statusFilter !== 'all' && validSubStatuses.includes(statusFilter)) {
    subParams.push(statusFilter);
    subWhere.push(`status = $${subParams.length}`);
  }
  const subWhereStr = subWhere.length > 0 ? `WHERE ${subWhere.join(' AND ')}` : '';

  const subStatsSql = `
    SELECT 
      COUNT(*) as total_subscriptions,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
      COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_subscriptions,
      COUNT(CASE WHEN status = 'quotation' THEN 1 END) as quotation_subscriptions,
      COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_subscriptions,
      COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_subscriptions,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_subscriptions,
      COUNT(CASE WHEN status = 'past_due' THEN 1 END) as past_due_subscriptions,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
      COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_subscriptions,
      COALESCE(SUM(CASE WHEN status = 'active' THEN total_amount ELSE 0 END), 0) as mrr_estimate
    FROM subscriptions
    ${subWhereStr}
  `;
  const subStatsRes = await query(subStatsSql, subParams);
  const subStats = subStatsRes.rows[0];

  // 2. Payments (Revenue received)
  const payWhere = ["status = 'successful'"];
  const payParams = [];
  if (customerId) {
    payParams.push(customerId);
    payWhere.push(`customer_id = $${payParams.length}`);
  }
  if (fromDate) {
    payParams.push(fromDate);
    payWhere.push(`payment_date >= $${payParams.length}`);
  }
  if (toDate) {
    payParams.push(toDate);
    payWhere.push(`payment_date <= $${payParams.length}`);
  }
  const payWhereStr = `WHERE ${payWhere.join(' AND ')}`;

  const payStatsSql = `
    SELECT 
      COALESCE(SUM(amount), 0) as total_revenue,
      COUNT(*) as total_successful_payments,
      COALESCE(SUM(CASE WHEN payment_method = 'credit_card' THEN amount ELSE 0 END), 0) as cc_revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'bank_transfer' THEN amount ELSE 0 END), 0) as bank_revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'upi' THEN amount ELSE 0 END), 0) as upi_revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash_revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'manual' THEN amount ELSE 0 END), 0) as manual_revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'check' THEN amount ELSE 0 END), 0) as check_revenue
    FROM payments
    ${payWhereStr}
  `;
  const payStatsRes = await query(payStatsSql, payParams);
  const payStats = payStatsRes.rows[0];

  // 3. Invoices (Outstanding, Overdue, Status breakdown)
  const invWhere = ["status NOT IN ('void', 'uncollectible')"];
  const invParams = [];
  if (customerId) {
    invParams.push(customerId);
    invWhere.push(`customer_id = $${invParams.length}`);
  }
  if (fromDate) {
    invParams.push(fromDate);
    invWhere.push(`issue_date >= $${invParams.length}`);
  }
  if (toDate) {
    invParams.push(toDate);
    invWhere.push(`issue_date <= $${invParams.length}`);
  }
  if (statusFilter && statusFilter !== 'all' && validInvoiceStatuses.includes(statusFilter)) {
    invParams.push(statusFilter);
    invWhere.push(`status = $${invParams.length}`);
  }
  const invWhereStr = `WHERE ${invWhere.join(' AND ')}`;

  const nowIso = new Date().toISOString();
  invParams.push(nowIso);
  const nowIdx = invParams.length;

  const invStatsSql = `
    SELECT 
      COUNT(*) as total_invoices,
      COALESCE(SUM(total_amount), 0) as total_invoiced,
      COALESCE(SUM(amount_paid), 0) as total_paid,
      COALESCE(SUM(amount_remaining), 0) as total_outstanding,
      COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices_count,
      COUNT(CASE WHEN status IN ('confirmed', 'open') AND amount_remaining > 0 THEN 1 END) as open_invoices_count,
      COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_invoices_count,
      COUNT(CASE WHEN due_date < $${nowIdx} AND status NOT IN ('paid', 'void', 'uncollectible') AND amount_remaining > 0 THEN 1 END) as overdue_invoices_count,
      COALESCE(SUM(CASE WHEN due_date < $${nowIdx} AND status NOT IN ('paid', 'void', 'uncollectible') AND amount_remaining > 0 THEN amount_remaining ELSE 0 END), 0) as total_overdue_amount
    FROM invoices
    ${invWhereStr}
  `;
  const invStatsRes = await query(invStatsSql, invParams);
  const invStats = invStatsRes.rows[0];

  // 4. Recent Invoices
  const recentInvSql = `
    SELECT i.id, i.invoice_number, i.total_amount, i.amount_paid, i.amount_remaining,
           i.status, i.currency, i.due_date, i.issue_date,
           u.full_name as customer_name, u.email as customer_email
    FROM invoices i
    JOIN users u ON u.id = i.customer_id
    ${customerId ? 'WHERE i.customer_id = $1' : ''}
    ORDER BY i.created_at DESC
    LIMIT 6
  `;
  const recentInvRes = await query(recentInvSql, customerId ? [customerId] : []);

  // 5. Recent Payments
  const recentPaySql = `
    SELECT p.id, p.payment_reference, p.amount, p.currency, p.payment_method,
           p.status, p.payment_date, p.notes,
           i.invoice_number,
           u.full_name as customer_name, u.email as customer_email
    FROM payments p
    JOIN invoices i ON i.id = p.invoice_id
    JOIN users u ON u.id = p.customer_id
    ${customerId ? 'WHERE p.customer_id = $1' : ''}
    ORDER BY p.payment_date DESC, p.created_at DESC
    LIMIT 6
  `;
  const recentPayRes = await query(recentPaySql, customerId ? [customerId] : []);

  // 6. Customers list for filters (if Staff or Admin)
  let customerList = [];
  if (!isCustomer) {
    const custRes = await query(
      `SELECT id, full_name, email, company_name FROM users WHERE role = 'customer' ORDER BY full_name ASC`
    );
    customerList = custRes.rows;
  }

  return {
    kpis: {
      active_subscriptions: parseInt(subStats.active_subscriptions, 10),
      total_revenue: round2(Number(payStats.total_revenue)),
      total_outstanding: round2(Number(invStats.total_outstanding)),
      overdue_invoices_count: parseInt(invStats.overdue_invoices_count, 10),
      total_overdue_amount: round2(Number(invStats.total_overdue_amount)),
      total_invoiced: round2(Number(invStats.total_invoiced)),
      total_subscriptions: parseInt(subStats.total_subscriptions, 10),
      total_invoices: parseInt(invStats.total_invoices, 10),
      total_successful_payments: parseInt(payStats.total_successful_payments, 10),
      mrr_estimate: round2(Number(subStats.mrr_estimate)),
    },
    subscription_statistics: {
      total: parseInt(subStats.total_subscriptions, 10),
      active: parseInt(subStats.active_subscriptions, 10),
      draft: parseInt(subStats.draft_subscriptions, 10),
      quotation: parseInt(subStats.quotation_subscriptions, 10),
      confirmed: parseInt(subStats.confirmed_subscriptions, 10),
      paused: parseInt(subStats.paused_subscriptions, 10),
      closed: parseInt(subStats.closed_subscriptions, 10),
      past_due: parseInt(subStats.past_due_subscriptions, 10),
      cancelled: parseInt(subStats.cancelled_subscriptions, 10),
      expired: parseInt(subStats.expired_subscriptions, 10),
    },
    payment_method_breakdown: {
      credit_card: round2(Number(payStats.cc_revenue)),
      bank_transfer: round2(Number(payStats.bank_revenue)),
      upi: round2(Number(payStats.upi_revenue)),
      cash: round2(Number(payStats.cash_revenue)),
      manual: round2(Number(payStats.manual_revenue)),
      check: round2(Number(payStats.check_revenue)),
    },
    invoice_status_breakdown: {
      paid: parseInt(invStats.paid_invoices_count, 10),
      open: parseInt(invStats.open_invoices_count, 10),
      draft: parseInt(invStats.draft_invoices_count, 10),
      overdue: parseInt(invStats.overdue_invoices_count, 10),
    },
    recent_invoices: recentInvRes.rows.map(inv => ({
      ...inv,
      is_overdue: Boolean(
        inv.status !== 'paid' &&
        inv.status !== 'void' &&
        inv.status !== 'uncollectible' &&
        Number(inv.amount_remaining) > 0 &&
        new Date(inv.due_date) < new Date()
      ),
      total_amount: round2(Number(inv.total_amount)),
      amount_paid: round2(Number(inv.amount_paid)),
      amount_remaining: round2(Number(inv.amount_remaining)),
    })),
    recent_payments: recentPayRes.rows.map(pay => ({
      ...pay,
      amount: round2(Number(pay.amount)),
    })),
    filter_options: {
      customers: customerList,
      statuses: ['all', 'active', 'paused', 'past_due', 'closed', 'cancelled'],
    },
  };
}

module.exports = {
  getDashboardStats,
};
