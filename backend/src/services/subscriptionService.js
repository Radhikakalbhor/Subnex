const crypto = require('crypto');
const { query } = require('../config/db');
const { getTemplateById } = require('./quotationTemplateService');

/**
 * Valid workflow state transitions
 * Draft → Quotation → Confirmed → Active → Closed
 * (and Active ↔ Paused)
 */
const ALLOWED_TRANSITIONS = {
  draft: ['quotation', 'confirmed', 'closed'],
  quotation: ['confirmed', 'closed'],
  confirmed: ['active', 'closed'],
  active: ['paused', 'closed'],
  paused: ['active', 'closed'],
  closed: [], // Terminal state
};

function generateSubscriptionNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SUB-${dateStr}-${randomStr}`;
}

function calculateExpiryDate(startDate, billingInterval, intervalCount = 1) {
  const d = new Date(startDate);
  switch (billingInterval) {
    case 'day':
      d.setDate(d.getDate() + intervalCount);
      break;
    case 'week':
      d.setDate(d.getDate() + (7 * intervalCount));
      break;
    case 'year':
      d.setFullYear(d.getFullYear() + intervalCount);
      break;
    case 'month':
    default:
      d.setMonth(d.getMonth() + intervalCount);
      break;
  }
  return d;
}

/**
 * 1. Subscription Creation
 */
async function createSubscription({
  customer_id,
  plan_id,
  start_date = new Date(),
  expiry_date,
  payment_terms = 'Net 30',
  currency = 'USD',
  notes,
  lines = [],
  quotation_template_id = null,
  initial_status = 'draft',
}) {
  // Verify customer exists
  const userResult = await query('SELECT id, role, is_active FROM users WHERE id = $1', [customer_id]);
  if (userResult.rows.length === 0) {
    const error = new Error(`Customer with ID '${customer_id}' does not exist.`);
    error.statusCode = 404;
    throw error;
  }

  // If no lines provided, must have plan_id
  let processedLines = [...lines];
  let primaryPlanId = plan_id;

  if (processedLines.length === 0) {
    if (!primaryPlanId) {
      const error = new Error('Subscription requires either a plan_id or at least one subscription line.');
      error.statusCode = 400;
      throw error;
    }
    processedLines.push({ plan_id: primaryPlanId, quantity: 1 });
  }

  if (!primaryPlanId && processedLines.length > 0) {
    primaryPlanId = processedLines[0].plan_id;
  }

  // Fetch and validate all plans in the lines
  const calculatedLines = [];
  let subtotalSum = 0;
  let taxSum = 0;

  for (const line of processedLines) {
    const planResult = await query(
      `SELECT p.*, v.product_id, prod.name as product_name
       FROM plans p
       JOIN variants v ON v.id = p.variant_id
       JOIN products prod ON prod.id = v.product_id
       WHERE p.id = $1`,
      [line.plan_id]
    );

    if (planResult.rows.length === 0) {
      const error = new Error(`Plan with ID '${line.plan_id}' does not exist.`);
      error.statusCode = 404;
      throw error;
    }

    const plan = planResult.rows[0];
    const qty = parseInt(line.quantity, 10) || 1;
    if (qty < 1) {
      const error = new Error(`Quantity for plan '${plan.name}' must be at least 1.`);
      error.statusCode = 400;
      throw error;
    }

    if (plan.minimum_quantity && qty < plan.minimum_quantity) {
      const error = new Error(`Plan '${plan.name}' requires a minimum quantity of ${plan.minimum_quantity}.`);
      error.statusCode = 400;
      throw error;
    }

    const unitPrice = line.unit_price !== undefined ? parseFloat(line.unit_price) : parseFloat(plan.price);
    if (unitPrice < 0) {
      const error = new Error('Unit price cannot be negative.');
      error.statusCode = 400;
      throw error;
    }

    const lineSubtotal = Math.round(qty * unitPrice * 100) / 100;
    let lineTaxAmount = 0;
    let lineTaxRate = 0;
    let lineTaxId = null;

    if (line.tax_id) {
      const taxResult = await query('SELECT * FROM taxes WHERE id = $1', [line.tax_id]);
      if (taxResult.rows.length > 0) {
        const tax = taxResult.rows[0];
        lineTaxId = tax.id;
        lineTaxRate = parseFloat(tax.rate);
        if (tax.tax_type === 'percentage') {
          lineTaxAmount = Math.round(lineSubtotal * (lineTaxRate / 100) * 100) / 100;
        } else {
          lineTaxAmount = Math.round(lineTaxRate * 100) / 100;
        }
      }
    }

    const lineTotal = Math.round((lineSubtotal + lineTaxAmount) * 100) / 100;

    subtotalSum += lineSubtotal;
    taxSum += lineTaxAmount;

    calculatedLines.push({
      product_id: plan.product_id,
      plan_id: plan.id,
      quantity: qty,
      unit_price: unitPrice,
      tax_id: lineTaxId,
      tax_rate: lineTaxRate,
      tax_amount: lineTaxAmount,
      subtotal: lineSubtotal,
      total_amount: lineTotal,
      plan,
    });
  }

  const grandTotal = Math.round((subtotalSum + taxSum) * 100) / 100;
  const startDateObj = new Date(start_date);
  
  // Determine expiry date
  let expiryDateObj;
  if (expiry_date) {
    expiryDateObj = new Date(expiry_date);
  } else {
    const primaryPlan = calculatedLines[0].plan;
    expiryDateObj = calculateExpiryDate(startDateObj, primaryPlan.billing_interval, primaryPlan.billing_interval_count);
  }

  const subscriptionNumber = generateSubscriptionNumber();

  // Insert Subscription Header
  const insertSubSql = `
    INSERT INTO subscriptions (
      subscription_number, customer_id, plan_id, quotation_template_id, status,
      currency, start_date, expiry_date, payment_terms,
      current_period_start, current_period_end, next_billing_date, billing_cycle_anchor,
      subtotal, tax_total, total_amount, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `;

  const subResult = await query(insertSubSql, [
    subscriptionNumber,
    customer_id,
    primaryPlanId,
    quotation_template_id,
    initial_status,
    currency.toUpperCase(),
    startDateObj,
    expiryDateObj,
    payment_terms,
    startDateObj,
    expiryDateObj,
    expiryDateObj,
    startDateObj,
    subtotalSum,
    taxSum,
    grandTotal,
    notes || null,
  ]);

  const newSub = subResult.rows[0];

  // Insert Subscription Lines
  const insertedLines = [];
  for (const line of calculatedLines) {
    const insertLineSql = `
      INSERT INTO subscription_lines (
        subscription_id, product_id, plan_id, quantity, unit_price,
        tax_id, tax_rate, tax_amount, subtotal, total_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const lineRes = await query(insertLineSql, [
      newSub.id,
      line.product_id,
      line.plan_id,
      line.quantity,
      line.unit_price,
      line.tax_id,
      line.tax_rate,
      line.tax_amount,
      line.subtotal,
      line.total_amount,
    ]);

    insertedLines.push(lineRes.rows[0]);
  }

  newSub.lines = insertedLines;
  return newSub;
}

/**
 * 5. Quotation creation from quotation template
 */
async function createQuotation({
  customer_id,
  quotation_template_id,
  plan_id,
  lines = [],
  validity_days,
  notes,
}) {
  const template = await getTemplateById(quotation_template_id);
  const days = parseInt(validity_days, 10) || template.default_validity_days || 30;

  const validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const sub = await createSubscription({
    customer_id,
    plan_id,
    lines,
    payment_terms: template.default_payment_terms || 'Net 30',
    quotation_template_id,
    initial_status: 'quotation',
    notes: notes || template.description,
  });

  // Set quotation validity date and terms
  await query(
    'UPDATE subscriptions SET quotation_valid_until = $1 WHERE id = $2',
    [validUntil, sub.id]
  );
  sub.quotation_valid_until = validUntil;

  return sub;
}

/**
 * 8. Centralized status transitions workflow:
 * Draft → Quotation → Confirmed → Active → Closed
 * (and Active ↔ Paused)
 */
async function transitionStatus(subscriptionId, targetStatus, user) {
  const sub = await getSubscriptionById(subscriptionId, user);
  const currentStatus = sub.status;

  if (currentStatus === targetStatus) {
    return sub;
  }

  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    const error = new Error(
      `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions from '${currentStatus}': [${allowedNext.join(', ')}].`
    );
    error.statusCode = 400;
    throw error;
  }

  // 10. Implement pause, resume, renewal and early closure plan permission checks
  const primaryPlan = sub.lines && sub.lines.length > 0 ? sub.lines[0].plan : null;

  // PAUSE CHECK
  if (targetStatus === 'paused') {
    if (primaryPlan && primaryPlan.allow_pause === false) {
      const error = new Error(
        `Subscription cannot be paused: Plan '${primaryPlan.name}' does not permit pausing.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // EARLY CLOSURE CHECK
  if (targetStatus === 'closed' && currentStatus === 'active') {
    const now = new Date();
    const expiry = sub.expiry_date ? new Date(sub.expiry_date) : null;
    const isEarly = expiry && now < expiry;

    if (isEarly && primaryPlan && primaryPlan.allow_early_close === false) {
      const error = new Error(
        `Subscription cannot be closed early: Plan '${primaryPlan.name}' does not permit early closure.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Apply State Modifiers
  const updates = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [targetStatus, subscriptionId];

  if (targetStatus === 'paused') {
    updates.push('pause_start = CURRENT_TIMESTAMP');
  } else if (currentStatus === 'paused' && targetStatus === 'active') {
    updates.push('pause_end = CURRENT_TIMESTAMP');
  } else if (targetStatus === 'closed') {
    updates.push('cancelled_at = CURRENT_TIMESTAMP');
  }

  const updateSql = `
    UPDATE subscriptions
    SET ${updates.join(', ')}
    WHERE id = $2
    RETURNING *
  `;

  await query(updateSql, params);
  return getSubscriptionById(subscriptionId, user);
}

/**
 * 10. Renewal under plan permissions
 */
async function renewSubscription(subscriptionId, user) {
  const sub = await getSubscriptionById(subscriptionId, user);

  if (sub.status !== 'active' && sub.status !== 'confirmed') {
    const error = new Error(`Only active or confirmed subscriptions can be renewed. Current status: '${sub.status}'.`);
    error.statusCode = 400;
    throw error;
  }

  const primaryPlan = sub.lines && sub.lines.length > 0 ? sub.lines[0].plan : null;

  if (primaryPlan && primaryPlan.allow_renewal === false) {
    const error = new Error(
      `Subscription cannot be renewed: Plan '${primaryPlan.name}' does not permit renewal.`
    );
    error.statusCode = 400;
    throw error;
  }

  const baseDate = sub.expiry_date ? new Date(sub.expiry_date) : new Date();
  const interval = primaryPlan ? primaryPlan.billing_interval : 'month';
  const count = primaryPlan ? primaryPlan.billing_interval_count : 1;
  const newExpiry = calculateExpiryDate(baseDate, interval, count);

  const updateSql = `
    UPDATE subscriptions
    SET expiry_date = $1, current_period_end = $1, next_billing_date = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;

  await query(updateSql, [newExpiry, subscriptionId]);
  return getSubscriptionById(subscriptionId, user);
}

/**
 * Get Subscription by ID (Customer isolation enforced)
 */
async function getSubscriptionById(id, requestingUser) {
  const subResult = await query(
    `SELECT s.*, u.full_name as customer_name, u.email as customer_email, qt.name as quotation_template_name
     FROM subscriptions s
     JOIN users u ON u.id = s.customer_id
     LEFT JOIN quotation_templates qt ON qt.id = s.quotation_template_id
     WHERE s.id = $1`,
    [id]
  );

  if (subResult.rows.length === 0) {
    const error = new Error(`Subscription with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  const subscription = subResult.rows[0];

  // Enforce customer data isolation
  if (requestingUser.role === 'customer' && requestingUser.id !== subscription.customer_id) {
    const error = new Error('Access denied: Customers can only access their own subscriptions.');
    error.statusCode = 403;
    throw error;
  }

  // Fetch lines
  const linesResult = await query(
    `SELECT sl.*, p.name as plan_name, p.billing_interval, p.allow_pause, p.allow_renewal, p.allow_early_close, prod.name as product_name
     FROM subscription_lines sl
     JOIN plans p ON p.id = sl.plan_id
     LEFT JOIN products prod ON prod.id = sl.product_id
     WHERE sl.subscription_id = $1`,
    [id]
  );

  subscription.lines = linesResult.rows.map(line => ({
    ...line,
    plan: {
      id: line.plan_id,
      name: line.plan_name,
      billing_interval: line.billing_interval,
      allow_pause: line.allow_pause,
      allow_renewal: line.allow_renewal,
      allow_early_close: line.allow_early_close,
    },
  }));

  return subscription;
}

/**
 * List Subscriptions (Filtered for customers)
 */
async function listSubscriptions({ customer_id, status, page = 1, limit = 50 }, requestingUser) {
  const conditions = [];
  const params = [];

  // Customer restricted strictly to own subscriptions
  if (requestingUser.role === 'customer') {
    params.push(requestingUser.id);
    conditions.push(`s.customer_id = $${params.length}`);
  } else if (customer_id) {
    params.push(customer_id);
    conditions.push(`s.customer_id = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`s.status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

  params.push(parseInt(limit, 10));
  params.push(offset);

  const sql = `
    SELECT s.*, u.full_name as customer_name, u.email as customer_email
    FROM subscriptions s
    JOIN users u ON u.id = s.customer_id
    ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const result = await query(sql, params);
  return result.rows;
}

module.exports = {
  createSubscription,
  createQuotation,
  transitionStatus,
  renewSubscription,
  getSubscriptionById,
  listSubscriptions,
  ALLOWED_TRANSITIONS,
};

