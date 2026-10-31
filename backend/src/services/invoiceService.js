const crypto = require('crypto');
const { query, getClient } = require('../config/db');

/**
 * Valid transitions for Invoices:
 * draft -> confirmed, void
 * confirmed -> paid, void, uncollectible
 * paid -> (terminal)
 */
const ALLOWED_INVOICE_TRANSITIONS = {
  draft: ['confirmed', 'void'],
  confirmed: ['paid', 'void', 'uncollectible'],
  open: ['paid', 'void', 'uncollectible'],
  paid: [],
  void: [],
  uncollectible: [],
};

function generateInvoiceNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${dateStr}-${randomStr}`;
}

/**
 * Calculate invoice due date based on issue date and payment terms
 * E.g., 'Due Upon Receipt' -> issueDate
 *       'Net 15' -> issueDate + 15 days
 *       'Net 30' -> issueDate + 30 days
 */
function calculateDueDate(issueDate, paymentTerms = 'Net 30') {
  const due = new Date(issueDate);
  if (!paymentTerms || paymentTerms.toLowerCase().includes('receipt')) {
    return due;
  }
  const match = paymentTerms.match(/(\d+)/);
  const days = match ? parseInt(match[1], 10) : 30;
  due.setDate(due.getDate() + days);
  return due;
}

/**
 * Calculate next billing date / period end based on interval & interval count
 */
function calculateNextBillingDate(startDate, interval = 'month', count = 1) {
  const d = new Date(startDate);
  const intervalCount = parseInt(count, 10) || 1;

  switch (interval) {
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
 * Helper to round numeric values to 2 decimal places safely
 */
function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Find active subscriptions that are due for billing
 */
async function findDueSubscriptions(targetDate = new Date(), executor = null) {
  const db = executor || { query };
  const targetIso = new Date(targetDate).toISOString();

  const sql = `
    SELECT s.id, s.subscription_number, s.customer_id, s.next_billing_date,
           COALESCE(p.billing_interval, 'month') as billing_interval,
           COALESCE(p.billing_interval_count, 1) as billing_interval_count
    FROM subscriptions s
    LEFT JOIN plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
      AND s.auto_renew = TRUE
      AND s.next_billing_date <= $1
    ORDER BY s.next_billing_date ASC
  `;
  const result = await db.query(sql, [targetIso]);
  return result.rows;
}

/**
 * Evaluate and apply discounts for a subscription
 */
async function evaluateEligibleDiscounts({
  subscriptionId,
  customerId,
  lines,
  subtotal,
  issueDate = new Date(),
  preferredDiscountCode = null,
  executor,
}) {
  const db = executor;
  const issueDateIso = new Date(issueDate).toISOString();

  // Find candidate discounts: either specifically referenced by preferredDiscountCode,
  // or active general discounts
  let discountRows = [];
  if (preferredDiscountCode) {
    const res = await db.query(
      `SELECT * FROM discounts 
       WHERE UPPER(code) = UPPER($1) AND is_active = TRUE`,
      [preferredDiscountCode.trim()]
    );
    discountRows = res.rows;
  } else {
    const res = await db.query(
      `SELECT * FROM discounts
       WHERE is_active = TRUE
         AND (valid_from IS NULL OR valid_from <= $1)
         AND (valid_until IS NULL OR valid_until >= $1)
         AND (max_redemptions IS NULL OR times_redeemed < max_redemptions)`,
      [issueDateIso]
    );
    discountRows = res.rows;
  }

  const applications = [];
  let totalDiscountAmount = 0;
  const lineDiscounts = {}; // lineId -> discount_amount

  const totalQuantity = lines.reduce((sum, l) => sum + parseInt(l.quantity, 10), 0);

  for (const disc of discountRows) {
    // 1. Date window validation
    if (disc.valid_from && new Date(disc.valid_from) > new Date(issueDate)) continue;
    if (disc.valid_until && new Date(disc.valid_until) < new Date(issueDate)) continue;

    // 2. Max redemptions validation
    if (disc.max_redemptions !== null && disc.times_redeemed >= disc.max_redemptions) continue;

    const discValue = parseFloat(disc.value);
    const minPurchase = parseFloat(disc.min_purchase_amount || 0);
    const minQty = parseInt(disc.min_quantity || 0, 10);

    if (disc.target_scope === 'product') {
      // Find matching line for product
      const matchingLines = lines.filter(l => l.product_id === disc.product_id);
      for (const line of matchingLines) {
        const lineQty = parseInt(line.quantity, 10);
        const lineSubtotal = parseFloat(line.subtotal);

        if (lineQty < minQty || lineSubtotal < minPurchase) continue;

        let calculatedAmount = 0;
        if (disc.discount_type === 'percentage') {
          calculatedAmount = round2(lineSubtotal * (discValue / 100));
        } else {
          // fixed_amount
          calculatedAmount = round2(Math.min(discValue, lineSubtotal));
        }

        // Prevent discount from exceeding line subtotal
        calculatedAmount = Math.min(calculatedAmount, lineSubtotal);

        if (calculatedAmount > 0) {
          applications.push({
            discount_id: disc.id,
            discount_code: disc.code,
            subscription_id: subscriptionId,
            subscription_line_id: line.id,
            calculated_amount: calculatedAmount,
            target_scope: 'product',
          });
          lineDiscounts[line.id] = (lineDiscounts[line.id] || 0) + calculatedAmount;
          totalDiscountAmount = round2(totalDiscountAmount + calculatedAmount);
          break; // Apply once per discount rule
        }
      }
    } else {
      // Subscription or Invoice-wide discount
      if (totalQuantity < minQty || subtotal < minPurchase) continue;

      let calculatedAmount = 0;
      if (disc.discount_type === 'percentage') {
        calculatedAmount = round2(subtotal * (discValue / 100));
      } else {
        // fixed_amount
        calculatedAmount = round2(Math.min(discValue, subtotal));
      }

      calculatedAmount = Math.min(calculatedAmount, subtotal - totalDiscountAmount);

      if (calculatedAmount > 0) {
        applications.push({
          discount_id: disc.id,
          discount_code: disc.code,
          subscription_id: subscriptionId,
          subscription_line_id: null,
          calculated_amount: calculatedAmount,
          target_scope: disc.target_scope,
        });
        totalDiscountAmount = round2(totalDiscountAmount + calculatedAmount);
        // Only apply one subscription-wide discount per invoice
        break;
      }
    }
  }

  return { applications, totalDiscountAmount, lineDiscounts };
}

/**
 * Generate an invoice for a specific subscription within a safe PostgreSQL transaction.
 * Idempotent: respects unique constraint (subscription_id, billing_period_start).
 */
async function generateInvoiceForSubscription(subscriptionId, options = {}) {
  const {
    targetDate = new Date(),
    issueDate = new Date(),
    status = 'confirmed',
    force = false,
  } = options;

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Lock and fetch subscription with current status
    const subRes = await client.query(
      `SELECT * FROM subscriptions 
       WHERE id = $1 
       FOR UPDATE`,
      [subscriptionId]
    );

    if (subRes.rows.length === 0) {
      const err = new Error(`Subscription '${subscriptionId}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    const sub = subRes.rows[0];

    // Fetch plan billing interval and permissions info
    let billingInterval = 'month';
    let billingIntervalCount = 1;
    let allowAutoClose = false;
    let allowRenewal = true;

    if (sub.plan_id) {
      const planRes = await client.query(
        'SELECT billing_interval, billing_interval_count, allow_auto_close, allow_renewal FROM plans WHERE id = $1',
        [sub.plan_id]
      );
      if (planRes.rows.length > 0) {
        billingInterval = planRes.rows[0].billing_interval;
        billingIntervalCount = planRes.rows[0].billing_interval_count;
        allowAutoClose = planRes.rows[0].allow_auto_close === true;
        allowRenewal = planRes.rows[0].allow_renewal !== false;
      }
    } else {
      const linePlanRes = await client.query(
        `SELECT p.billing_interval, p.billing_interval_count, p.allow_auto_close, p.allow_renewal 
         FROM subscription_lines sl 
         JOIN plans p ON p.id = sl.plan_id 
         WHERE sl.subscription_id = $1 LIMIT 1`,
        [subscriptionId]
      );
      if (linePlanRes.rows.length > 0) {
        billingInterval = linePlanRes.rows[0].billing_interval;
        billingIntervalCount = linePlanRes.rows[0].billing_interval_count;
        allowAutoClose = linePlanRes.rows[0].allow_auto_close === true;
        allowRenewal = linePlanRes.rows[0].allow_renewal !== false;
      }
    }

    // Must be active unless explicitly forced
    if (sub.status !== 'active' && !force) {
      const err = new Error(`Subscription '${subscriptionId}' is not active (current status: '${sub.status}').`);
      err.statusCode = 400;
      throw err;
    }

    // 2. Determine billing period
    const periodStart = sub.next_billing_date 
      ? new Date(sub.next_billing_date) 
      : (sub.current_period_start ? new Date(sub.current_period_start) : new Date(sub.start_date));

    const periodEnd = calculateNextBillingDate(periodStart, billingInterval, billingIntervalCount);

    // 3. Idempotency Check: check if invoice for this period already exists
    const existingInvRes = await client.query(
      `SELECT * FROM invoices 
       WHERE subscription_id = $1 AND billing_period_start = $2`,
      [subscriptionId, periodStart.toISOString()]
    );

    if (existingInvRes.rows.length > 0) {
      await client.query('COMMIT');
      return {
        alreadyExists: true,
        invoice: existingInvRes.rows[0],
      };
    }

    // 4. Fetch subscription lines and tax rules
    const linesRes = await client.query(
      `SELECT sl.*, p.name as plan_name, prod.name as product_name, t.rate as tax_rule_rate, t.tax_type as tax_rule_type
       FROM subscription_lines sl
       JOIN plans p ON p.id = sl.plan_id
       LEFT JOIN products prod ON prod.id = sl.product_id
       LEFT JOIN taxes t ON t.id = sl.tax_id
       WHERE sl.subscription_id = $1`,
      [subscriptionId]
    );

    const lines = linesRes.rows;
    if (lines.length === 0) {
      const err = new Error(`Subscription '${subscriptionId}' has no subscription lines.`);
      err.statusCode = 400;
      throw err;
    }

    // 5. Calculate base subtotal
    let subtotal = 0;
    for (const line of lines) {
      const lineSubtotal = round2(parseFloat(line.unit_price) * parseInt(line.quantity, 10));
      subtotal = round2(subtotal + lineSubtotal);
    }

    // 6. Evaluate and calculate eligible discounts
    let preferredDiscountCode = options.discountCode || null;
    if (!preferredDiscountCode && sub.metadata) {
      if (typeof sub.metadata === 'string') {
        try {
          const parsed = JSON.parse(sub.metadata);
          preferredDiscountCode = parsed.discount_code || parsed.discountCode;
        } catch (e) {}
      } else if (typeof sub.metadata === 'object') {
        preferredDiscountCode = sub.metadata.discount_code || sub.metadata.discountCode;
      }
    }
    const { applications, totalDiscountAmount, lineDiscounts } = await evaluateEligibleDiscounts({
      subscriptionId,
      customerId: sub.customer_id,
      lines,
      subtotal,
      issueDate,
      preferredDiscountCode,
      executor: client,
    });

    // 7. Calculate line totals and taxes after discounts
    let calculatedTaxTotal = 0;
    const computedInvoiceLines = [];

    for (const line of lines) {
      const lineQty = parseInt(line.quantity, 10);
      const lineUnitPrice = parseFloat(line.unit_price);
      const lineSub = round2(lineUnitPrice * lineQty);
      const lineDisc = lineDiscounts[line.id] || 0;
      const taxableSubtotal = Math.max(0, round2(lineSub - lineDisc));

      let lineTax = 0;
      if (line.tax_id && line.tax_rule_rate !== null) {
        const rate = parseFloat(line.tax_rule_rate);
        if (line.tax_rule_type === 'percentage') {
          lineTax = round2(taxableSubtotal * (rate / 100));
        } else {
          // flat tax
          lineTax = round2(rate * lineQty);
        }
      } else if (line.tax_amount && parseFloat(line.tax_amount) > 0) {
        lineTax = parseFloat(line.tax_amount);
      }

      calculatedTaxTotal = round2(calculatedTaxTotal + lineTax);
      const lineTotal = round2(taxableSubtotal + lineTax);

      computedInvoiceLines.push({
        subscription_line_id: line.id,
        description: `${line.product_name || 'Subscription'} - ${line.plan_name}`,
        quantity: lineQty,
        unit_price: lineUnitPrice,
        subtotal: lineSub,
        discount_amount: lineDisc,
        tax_amount: lineTax,
        total: lineTotal,
      });
    }

    // If there is any subscription-wide discount that wasn't apportioned to lines, account for it
    const lineDiscountSum = Object.values(lineDiscounts).reduce((a, b) => a + b, 0);
    const remainingSubscriptionDiscount = Math.max(0, round2(totalDiscountAmount - lineDiscountSum));

    const finalSubtotal = subtotal;
    const finalDiscountTotal = totalDiscountAmount;
    const finalTaxTotal = calculatedTaxTotal;
    const finalTotalAmount = Math.max(0, round2(finalSubtotal - finalDiscountTotal + finalTaxTotal));

    // 8. Due date based on payment terms
    const dueDate = calculateDueDate(issueDate, sub.payment_terms);

    // 9. Generate Invoice Number & Insert Invoice
    const invoiceNumber = generateInvoiceNumber();

    const insertInvoiceSql = `
      INSERT INTO invoices (
        invoice_number,
        subscription_id,
        customer_id,
        status,
        billing_period_start,
        billing_period_end,
        issue_date,
        due_date,
        currency,
        subtotal,
        discount_total,
        tax_total,
        total_amount,
        amount_paid,
        amount_remaining,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    // Billing engine generates invoices in 'draft' or 'confirmed' state only (never 'paid' without a recorded payment)
    const initialInvoiceStatus = status === 'draft' ? 'draft' : 'confirmed';

    const invoiceRes = await client.query(insertInvoiceSql, [
      invoiceNumber,
      subscriptionId,
      sub.customer_id,
      initialInvoiceStatus,
      periodStart.toISOString(),
      periodEnd.toISOString(),
      new Date(issueDate).toISOString(),
      dueDate.toISOString(),
      sub.currency || 'USD',
      finalSubtotal,
      finalDiscountTotal,
      finalTaxTotal,
      finalTotalAmount,
      0.00,
      finalTotalAmount,
      sub.notes ? `Invoice for subscription ${sub.subscription_number}. ${sub.notes}` : `Invoice for subscription ${sub.subscription_number}`,
    ]);

    const createdInvoice = invoiceRes.rows[0];

    // 10. Insert Invoice Lines
    const insertedLines = [];
    for (const invLine of computedInvoiceLines) {
      const lineInsertSql = `
        INSERT INTO invoice_lines (
          invoice_id,
          subscription_line_id,
          description,
          quantity,
          unit_price,
          subtotal,
          discount_amount,
          tax_amount,
          total
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const lineRes = await client.query(lineInsertSql, [
        createdInvoice.id,
        invLine.subscription_line_id,
        invLine.description,
        invLine.quantity,
        invLine.unit_price,
        invLine.subtotal,
        invLine.discount_amount,
        invLine.tax_amount,
        invLine.total,
      ]);
      insertedLines.push(lineRes.rows[0]);
    }

    // 11. Record discount applications and safely increment discount times_redeemed
    for (const app of applications) {
      await client.query(
        `INSERT INTO discount_applications (
          discount_id,
          subscription_id,
          subscription_line_id,
          invoice_id,
          calculated_amount
        )
        VALUES ($1, $2, $3, $4, $5)`,
        [app.discount_id, subscriptionId, app.subscription_line_id, createdInvoice.id, app.calculated_amount]
      );

      // Safe atomic redemption update
      const updateDiscRes = await client.query(
        `UPDATE discounts
         SET times_redeemed = times_redeemed + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND (max_redemptions IS NULL OR times_redeemed < max_redemptions)
         RETURNING times_redeemed, max_redemptions`,
        [app.discount_id]
      );

      if (updateDiscRes.rows.length === 0) {
        const limitErr = new Error(`Discount redemption limit reached concurrently for discount '${app.discount_code}'.`);
        limitErr.statusCode = 409;
        throw limitErr;
      }
    }

    // 12. Advance subscription billing dates safely
    const nextNextBillingDate = periodEnd;
    const nextCurrentPeriodEnd = calculateNextBillingDate(periodEnd, billingInterval, billingIntervalCount);

    // Check expiry behavior based on auto_renew and plan allow_auto_close
    let newStatus = sub.status;
    let cancelledAt = sub.cancelled_at;
    let updatedExpiryDate = sub.expiry_date;

    const isExpiring = sub.expiry_date && new Date(periodEnd) >= new Date(sub.expiry_date);

    if (isExpiring) {
      if (sub.auto_renew && allowRenewal) {
        // Auto-renewing subscriptions continue recurring billing and extend expiry
        updatedExpiryDate = calculateNextBillingDate(sub.expiry_date, billingInterval, billingIntervalCount);
      } else {
        // Non-auto-renewing subscription reaching expiry
        if (allowAutoClose) {
          newStatus = 'closed';
          cancelledAt = new Date();
        } else {
          // Do not silently close: preserve state as 'expired'
          newStatus = 'expired';
        }
      }
    }

    await client.query(
      `UPDATE subscriptions
       SET current_period_start = $1,
           current_period_end = $2,
           next_billing_date = $3,
           status = $4,
           expiry_date = $5,
           cancelled_at = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        periodStart.toISOString(),
        periodEnd.toISOString(),
        nextNextBillingDate.toISOString(),
        newStatus,
        updatedExpiryDate ? new Date(updatedExpiryDate).toISOString() : null,
        cancelledAt ? new Date(cancelledAt).toISOString() : null,
        subscriptionId,
      ]
    );

    await client.query('COMMIT');

    createdInvoice.lines = insertedLines;
    createdInvoice.discount_applications = applications;

    return {
      alreadyExists: false,
      invoice: createdInvoice,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Process standing subscriptions that have reached expiry
 * - If allow_auto_close=true: automatically close subscription (status='closed', cancelled_at=NOW())
 * - If allow_auto_close=false: do not silently close; preserve state as status='expired'
 */
async function processExpiredSubscriptions(targetDate = new Date(), executor = null) {
  const db = executor || { query };
  const targetIso = new Date(targetDate).toISOString();

  // Find active subscriptions whose expiry_date has passed and auto_renew = false
  const sql = `
    SELECT s.id, s.subscription_number, s.status, s.expiry_date, s.auto_renew,
           COALESCE(p.allow_auto_close, FALSE) as allow_auto_close
    FROM subscriptions s
    LEFT JOIN plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
      AND s.auto_renew = FALSE
      AND s.expiry_date <= $1
  `;

  const result = await db.query(sql, [targetIso]);
  const expiredList = result.rows;
  const summary = {
    totalExpired: expiredList.length,
    closedCount: 0,
    expiredCount: 0,
    processed: [],
  };

  for (const sub of expiredList) {
    if (sub.allow_auto_close === true) {
      await db.query(
        `UPDATE subscriptions 
         SET status = 'closed', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [sub.id]
      );
      summary.closedCount++;
      summary.processed.push({ id: sub.id, number: sub.subscription_number, status: 'closed' });
    } else {
      await db.query(
        `UPDATE subscriptions 
         SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [sub.id]
      );
      summary.expiredCount++;
      summary.processed.push({ id: sub.id, number: sub.subscription_number, status: 'expired' });
    }
  }

  return summary;
}

/**
 * Process all active subscriptions whose next billing date is due
 */
async function processDueBilling(options = {}) {
  const targetDate = options.targetDate || new Date();

  // 1. Process standing expired subscriptions according to plan allow_auto_close
  const expirySummary = await processExpiredSubscriptions(targetDate);

  // 2. Process due recurring active subscriptions
  const dueSubscriptions = await findDueSubscriptions(targetDate);

  const results = {
    totalDue: dueSubscriptions.length,
    processedCount: 0,
    successCount: 0,
    failureCount: 0,
    invoices: [],
    errors: [],
    expirySummary,
  };

  for (const sub of dueSubscriptions) {
    try {
      const outcome = await generateInvoiceForSubscription(sub.id, {
        targetDate,
        issueDate: targetDate,
        status: options.status || 'confirmed',
      });

      results.processedCount++;
      results.successCount++;
      results.invoices.push(outcome.invoice);
    } catch (err) {
      results.processedCount++;
      results.failureCount++;
      results.errors.push({
        subscription_id: sub.id,
        subscription_number: sub.subscription_number,
        error: err.message,
      });
      console.error(`[Billing Engine Error] Failed for subscription ${sub.id}:`, err.message);
    }
  }

  return results;
}

/**
 * Get Invoice by ID (with authorization and customer data isolation)
 */
async function getInvoiceById(invoiceId, user) {
  const invRes = await query(
    `SELECT i.*, 
            u.full_name as customer_name, 
            u.email as customer_email,
            u.company_name as customer_company,
            s.subscription_number
     FROM invoices i
     JOIN users u ON u.id = i.customer_id
     LEFT JOIN subscriptions s ON s.id = i.subscription_id
     WHERE i.id = $1`,
    [invoiceId]
  );

  if (invRes.rows.length === 0) {
    const error = new Error(`Invoice with ID '${invoiceId}' does not exist.`);
    error.statusCode = 404;
    throw error;
  }

  const invoice = invRes.rows[0];

  // Customer isolation check
  if (user && user.role === 'customer' && invoice.customer_id !== user.id) {
    const error = new Error('Access denied: You do not have permission to view this invoice.');
    error.statusCode = 403;
    throw error;
  }

  // Get invoice lines
  const linesRes = await query(
    `SELECT * FROM invoice_lines WHERE invoice_id = $1 ORDER BY created_at ASC`,
    [invoiceId]
  );
  invoice.lines = linesRes.rows;

  // Get applied discounts
  const discRes = await query(
    `SELECT da.*, d.code as discount_code, d.name as discount_name, d.discount_type
     FROM discount_applications da
     JOIN discounts d ON d.id = da.discount_id
     WHERE da.invoice_id = $1`,
    [invoiceId]
  );
  invoice.discount_applications = discRes.rows;

  return invoice;
}

/**
 * List Invoices (with filtering and customer data isolation)
 */
async function listInvoices(filters = {}, user) {
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  // Customer role restriction
  if (user && user.role === 'customer') {
    conditions.push(`i.customer_id = $${paramIdx++}`);
    params.push(user.id);
  } else if (filters.customer_id) {
    conditions.push(`i.customer_id = $${paramIdx++}`);
    params.push(filters.customer_id);
  }

  if (filters.subscription_id) {
    conditions.push(`i.subscription_id = $${paramIdx++}`);
    params.push(filters.subscription_id);
  }

  if (filters.status) {
    conditions.push(`i.status = $${paramIdx++}`);
    params.push(filters.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(parseInt(filters.limit, 10) || 50, 100);
  const offset = parseInt(filters.offset, 10) || 0;

  const countSql = `SELECT COUNT(*) as total FROM invoices i ${whereClause}`;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0].total, 10);

  const sql = `
    SELECT i.*, 
           u.full_name as customer_name, 
           u.email as customer_email,
           s.subscription_number
    FROM invoices i
    JOIN users u ON u.id = i.customer_id
    LEFT JOIN subscriptions s ON s.id = i.subscription_id
    ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;

  const listRes = await query(sql, [...params, limit, offset]);

  return {
    total,
    limit,
    offset,
    invoices: listRes.rows,
  };
}

/**
 * Update Invoice Status: Draft -> Confirmed -> Paid
 */
async function updateInvoiceStatus(invoiceId, newStatus, user) {
  // Only Admin or Staff can update status
  if (user && user.role === 'customer') {
    const error = new Error('Access denied: Customers cannot update invoice status directly.');
    error.statusCode = 403;
    throw error;
  }

  const invoice = await getInvoiceById(invoiceId, user);
  const currentStatus = invoice.status;

  if (currentStatus === newStatus) {
    return invoice;
  }

  const allowedNext = ALLOWED_INVOICE_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(newStatus)) {
    const error = new Error(
      `Invalid invoice status transition from '${currentStatus}' to '${newStatus}'. Allowed: [${allowedNext.join(', ')}].`
    );
    error.statusCode = 400;
    throw error;
  }

  const updates = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [newStatus, invoiceId];

  if (newStatus === 'paid') {
    updates.push('paid_at = CURRENT_TIMESTAMP');
    updates.push('amount_paid = total_amount');
    updates.push('amount_remaining = 0.00');
  }

  const updateSql = `
    UPDATE invoices
    SET ${updates.join(', ')}
    WHERE id = $2
    RETURNING *
  `;

  const res = await query(updateSql, params);
  return getInvoiceById(invoiceId, user);
}

module.exports = {
  calculateDueDate,
  calculateNextBillingDate,
  findDueSubscriptions,
  evaluateEligibleDiscounts,
  generateInvoiceForSubscription,
  processDueBilling,
  processExpiredSubscriptions,
  getInvoiceById,
  listInvoices,
  updateInvoiceStatus,
  ALLOWED_INVOICE_TRANSITIONS,
};
