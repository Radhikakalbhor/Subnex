const crypto = require('crypto');
const { query, getClient } = require('../config/db');

function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

function generatePaymentReference() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PAY-${dateStr}-${randomStr}`;
}

const ALLOWED_PAYMENT_METHODS = ['credit_card', 'bank_transfer', 'upi', 'cash', 'manual', 'check', 'other'];

function normalizePaymentMethod(method) {
  if (!method || typeof method !== 'string') return null;
  const m = method.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (m === 'card' || m === 'debit_card') return 'credit_card';
  if (m === 'wire' || m === 'bank') return 'bank_transfer';
  if (m === 'cheque') return 'check';
  return m;
}

/**
 * Record a manual payment against an invoice (ACID Transaction)
 */
async function recordPayment(data, user) {
  const invoiceId = data.invoice_id || data.invoiceId;
  const rawMethod = data.payment_method || data.paymentMethod;
  const amount = data.amount;
  const paymentDate = data.payment_date || data.paymentDate;
  const notes = data.notes !== undefined ? data.notes : (data.note !== undefined ? data.note : null);
  const customRef = data.payment_reference || data.reference || data.paymentReference || null;

  if (!invoiceId) {
    const error = new Error('Invoice ID (invoice_id) is required.');
    error.statusCode = 400;
    throw error;
  }

  const paymentMethod = normalizePaymentMethod(rawMethod);
  if (!paymentMethod || !ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    const error = new Error(
      `Invalid payment method '${rawMethod}'. Allowed methods: [${ALLOWED_PAYMENT_METHODS.join(', ')}].`
    );
    error.statusCode = 400;
    throw error;
  }

  const parsedAmount = round2(Number(amount));
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    const error = new Error('Payment amount must be greater than zero.');
    error.statusCode = 400;
    throw error;
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Lock invoice row for atomic update
    const invRes = await client.query(
      `SELECT * FROM invoices WHERE id = $1 FOR UPDATE`,
      [invoiceId]
    );

    if (invRes.rows.length === 0) {
      const error = new Error(`Invoice with ID '${invoiceId}' does not exist.`);
      error.statusCode = 404;
      throw error;
    }

    const invoice = invRes.rows[0];

    // 2. Role authorization check: Only Admin and Staff can record successful payments
    if (user && user.role === 'customer') {
      const error = new Error(
        'Access denied: Only Admin and Staff can record manual payments. Customers cannot mark invoices as paid.'
      );
      error.statusCode = 403;
      throw error;
    }

    // 3. Invoice status checks
    if (invoice.status === 'draft') {
      const error = new Error(
        'Cannot record payment on a draft invoice. Please confirm or issue the invoice first.'
      );
      error.statusCode = 400;
      throw error;
    }

    if (invoice.status === 'void' || invoice.status === 'uncollectible') {
      const error = new Error(`Cannot record payment on a ${invoice.status} invoice.`);
      error.statusCode = 400;
      throw error;
    }

    const remainingBalance = round2(Number(invoice.amount_remaining));
    if (invoice.status === 'paid' || remainingBalance <= 0) {
      const error = new Error('Invoice is already fully paid.');
      error.statusCode = 400;
      throw error;
    }

    // 4. Overpayment prevention
    if (parsedAmount > remainingBalance) {
      const error = new Error(
        `Payment amount ($${parsedAmount.toFixed(2)}) exceeds invoice remaining balance ($${remainingBalance.toFixed(2)}).`
      );
      error.statusCode = 400;
      throw error;
    }

    // 5. Calculate new balances
    const currentPaid = round2(Number(invoice.amount_paid));
    const totalAmount = round2(Number(invoice.total_amount));
    const newAmountPaid = round2(currentPaid + parsedAmount);
    const newAmountRemaining = round2(Math.max(0, totalAmount - newAmountPaid));
    const isFullyPaid = newAmountRemaining <= 0;

    const effectivePaymentDate = paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString();
    const newStatus = isFullyPaid ? 'paid' : (invoice.status === 'open' ? 'open' : 'confirmed');
    const paidAt = isFullyPaid ? effectivePaymentDate : invoice.paid_at;

    // 6. Insert payment record
    const paymentReference = customRef || generatePaymentReference();
    const insertPaymentSql = `
      INSERT INTO payments (
        payment_reference,
        invoice_id,
        customer_id,
        amount,
        currency,
        payment_method,
        status,
        payment_date,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, 'successful', $7, $8)
      RETURNING *
    `;

    const paymentRes = await client.query(insertPaymentSql, [
      paymentReference,
      invoice.id,
      invoice.customer_id,
      parsedAmount,
      invoice.currency || 'USD',
      paymentMethod,
      effectivePaymentDate,
      notes || null,
    ]);

    const createdPayment = paymentRes.rows[0];

    // 7. Update invoice balances and status
    const updateInvoiceSql = `
      UPDATE invoices
      SET amount_paid = $1,
          amount_remaining = $2,
          status = $3,
          paid_at = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const updatedInvRes = await client.query(updateInvoiceSql, [
      newAmountPaid,
      newAmountRemaining,
      newStatus,
      paidAt,
      invoice.id,
    ]);

    const updatedInvoice = updatedInvRes.rows[0];

    // 8. If fully paid and attached to a subscription in 'past_due' status, restore subscription to 'active' if no other unpaid invoices
    if (isFullyPaid && invoice.subscription_id) {
      const unpaidCheckRes = await client.query(
        `SELECT COUNT(*) as unpaid_count FROM invoices
         WHERE subscription_id = $1 AND status NOT IN ('paid', 'void') AND id != $2`,
        [invoice.subscription_id, invoice.id]
      );
      const remainingUnpaidCount = parseInt(unpaidCheckRes.rows[0].unpaid_count, 10);
      if (remainingUnpaidCount === 0) {
        await client.query(
          `UPDATE subscriptions 
           SET status = 'active', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1 AND status = 'past_due'`,
          [invoice.subscription_id]
        );
      }
    }

    await client.query('COMMIT');

    return {
      payment: createdPayment,
      invoice: {
        id: updatedInvoice.id,
        invoice_number: updatedInvoice.invoice_number,
        status: updatedInvoice.status,
        currency: updatedInvoice.currency,
        total_amount: round2(Number(updatedInvoice.total_amount)),
        amount_paid: round2(Number(updatedInvoice.amount_paid)),
        amount_remaining: round2(Number(updatedInvoice.amount_remaining)),
        is_fully_paid: isFullyPaid,
        paid_at: updatedInvoice.paid_at,
      },
      is_fully_paid: isFullyPaid,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get payment details by ID (with authorization check)
 */
async function getPaymentById(paymentId, user) {
  const sql = `
    SELECT p.*,
           i.invoice_number,
           i.total_amount as invoice_total,
           i.amount_remaining as invoice_remaining,
           i.status as invoice_status,
           u.full_name as customer_name,
           u.email as customer_email
    FROM payments p
    JOIN invoices i ON i.id = p.invoice_id
    JOIN users u ON u.id = p.customer_id
    WHERE p.id = $1
  `;

  const res = await query(sql, [paymentId]);
  if (res.rows.length === 0) {
    const error = new Error(`Payment with ID '${paymentId}' does not exist.`);
    error.statusCode = 404;
    throw error;
  }

  const payment = res.rows[0];

  // Customer authorization check
  if (user && user.role === 'customer' && payment.customer_id !== user.id) {
    const error = new Error('Access denied: You do not have permission to view this payment.');
    error.statusCode = 403;
    throw error;
  }

  return payment;
}

/**
 * List payment records with filtering, pagination, and customer data isolation
 */
async function listPayments(filters = {}, user) {
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  // Customer data isolation
  if (user && user.role === 'customer') {
    conditions.push(`p.customer_id = $${paramIdx++}`);
    params.push(user.id);
  } else if (filters.customer_id) {
    conditions.push(`p.customer_id = $${paramIdx++}`);
    params.push(filters.customer_id);
  }

  if (filters.invoice_id) {
    conditions.push(`p.invoice_id = $${paramIdx++}`);
    params.push(filters.invoice_id);
  }

  if (filters.payment_method) {
    const norm = normalizePaymentMethod(filters.payment_method);
    conditions.push(`p.payment_method = $${paramIdx++}`);
    params.push(norm || filters.payment_method);
  }

  if (filters.status) {
    conditions.push(`p.status = $${paramIdx++}`);
    params.push(filters.status);
  }

  if (filters.from_date) {
    conditions.push(`p.payment_date >= $${paramIdx++}`);
    params.push(new Date(filters.from_date).toISOString());
  }

  if (filters.to_date) {
    conditions.push(`p.payment_date <= $${paramIdx++}`);
    params.push(new Date(filters.to_date).toISOString());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(parseInt(filters.limit, 10) || 50, 100);
  const offset = parseInt(filters.offset, 10) || 0;

  const countSql = `SELECT COUNT(*) as total FROM payments p ${whereClause}`;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0].total, 10);

  const sql = `
    SELECT p.*,
           i.invoice_number,
           u.full_name as customer_name,
           u.email as customer_email
    FROM payments p
    JOIN invoices i ON i.id = p.invoice_id
    JOIN users u ON u.id = p.customer_id
    ${whereClause}
    ORDER BY p.payment_date DESC, p.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;

  const listRes = await query(sql, [...params, limit, offset]);

  return {
    total,
    limit,
    offset,
    payments: listRes.rows,
  };
}

/**
 * Get all payments for a specific invoice, along with total payments received calculation
 */
async function getPaymentsByInvoiceId(invoiceId, user) {
  // First fetch invoice
  const invSql = `
    SELECT i.id, i.invoice_number, i.customer_id, i.total_amount, i.amount_paid,
           i.amount_remaining, i.status, i.currency, i.due_date, i.paid_at,
           u.full_name as customer_name, u.email as customer_email
    FROM invoices i
    JOIN users u ON u.id = i.customer_id
    WHERE i.id = $1
  `;
  const invRes = await query(invSql, [invoiceId]);
  if (invRes.rows.length === 0) {
    const error = new Error(`Invoice with ID '${invoiceId}' does not exist.`);
    error.statusCode = 404;
    throw error;
  }

  const invoice = invRes.rows[0];

  // Customer authorization check
  if (user && user.role === 'customer' && invoice.customer_id !== user.id) {
    const error = new Error('Access denied: You do not have permission to view payments for this invoice.');
    error.statusCode = 403;
    throw error;
  }

  // Get payments
  const paySql = `
    SELECT * FROM payments
    WHERE invoice_id = $1
    ORDER BY payment_date ASC, created_at ASC
  `;
  const payRes = await query(paySql, [invoiceId]);

  // Aggregate sum
  const sumSql = `
    SELECT COALESCE(SUM(amount), 0) as total_payments_received,
           COUNT(*) as payment_count
    FROM payments
    WHERE invoice_id = $1 AND status = 'successful'
  `;
  const sumRes = await query(sumSql, [invoiceId]);
  const totalReceived = round2(Number(sumRes.rows[0].total_payments_received));
  const paymentCount = parseInt(sumRes.rows[0].payment_count, 10);

  return {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    customer_id: invoice.customer_id,
    customer_name: invoice.customer_name,
    customer_email: invoice.customer_email,
    currency: invoice.currency,
    total_amount: round2(Number(invoice.total_amount)),
    total_payments_received: totalReceived,
    amount_paid: round2(Number(invoice.amount_paid)),
    amount_remaining: round2(Number(invoice.amount_remaining)),
    status: invoice.status,
    is_fully_paid: invoice.status === 'paid',
    due_date: invoice.due_date,
    paid_at: invoice.paid_at,
    payment_count: paymentCount,
    payments: payRes.rows,
  };
}

/**
 * Get aggregated payment summary and outstanding balance metrics
 */
async function getPaymentSummary(filters = {}, user) {
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (user && user.role === 'customer') {
    conditions.push(`customer_id = $${paramIdx++}`);
    params.push(user.id);
  } else if (filters.customer_id) {
    conditions.push(`customer_id = $${paramIdx++}`);
    params.push(filters.customer_id);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 1. Payments summary
  const paySumSql = `
    SELECT 
      COALESCE(SUM(amount), 0) as total_payments_received,
      COUNT(*) as total_successful_payments
    FROM payments
    ${whereClause ? whereClause + " AND status = 'successful'" : "WHERE status = 'successful'"}
  `;
  const paySumRes = await query(paySumSql, params);

  // 2. Invoices summary
  const invWhereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const invSumSql = `
    SELECT 
      COALESCE(SUM(total_amount), 0) as total_invoiced,
      COALESCE(SUM(amount_paid), 0) as total_paid,
      COALESCE(SUM(amount_remaining), 0) as total_outstanding,
      COUNT(*) as total_invoices
    FROM invoices
    ${invWhereClause ? invWhereClause + " AND status NOT IN ('void', 'uncollectible')" : "WHERE status NOT IN ('void', 'uncollectible')"}
  `;
  const invSumRes = await query(invSumSql, params);

  // 3. Overdue invoices summary
  const now = filters.asOfDate ? new Date(filters.asOfDate).toISOString() : new Date().toISOString();
  const overdueParams = [...params, now];
  const overdueWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
  const overdueSql = `
    SELECT 
      COALESCE(SUM(amount_remaining), 0) as total_overdue_amount,
      COUNT(*) as overdue_count
    FROM invoices
    WHERE due_date < $${overdueParams.length}
      AND status NOT IN ('paid', 'void', 'uncollectible')
      AND amount_remaining > 0
      ${overdueWhere}
  `;
  const overdueRes = await query(overdueSql, overdueParams);

  return {
    total_payments_received: round2(Number(paySumRes.rows[0].total_payments_received)),
    total_successful_payments: parseInt(paySumRes.rows[0].total_successful_payments, 10),
    total_invoiced: round2(Number(invSumRes.rows[0].total_invoiced)),
    total_paid: round2(Number(invSumRes.rows[0].total_paid)),
    total_outstanding: round2(Number(invSumRes.rows[0].total_outstanding)),
    total_invoices: parseInt(invSumRes.rows[0].total_invoices, 10),
    overdue_count: parseInt(overdueRes.rows[0].overdue_count, 10),
    total_overdue_amount: round2(Number(overdueRes.rows[0].total_overdue_amount)),
  };
}

/**
 * Refund a successful payment (Admin only, ACID Transaction)
 */
async function refundPayment(paymentId, user, options = {}) {
  if (user && user.role !== 'admin') {
    const error = new Error('Access denied: Only system administrators can process payment refunds.');
    error.statusCode = 403;
    throw error;
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const payRes = await client.query(
      `SELECT * FROM payments WHERE id = $1 FOR UPDATE`,
      [paymentId]
    );

    if (payRes.rows.length === 0) {
      const error = new Error(`Payment with ID '${paymentId}' does not exist.`);
      error.statusCode = 404;
      throw error;
    }

    const payment = payRes.rows[0];

    if (payment.status === 'refunded') {
      const error = new Error('Payment has already been refunded.');
      error.statusCode = 400;
      throw error;
    }

    if (payment.status !== 'successful') {
      const error = new Error(`Only successful payments can be refunded (current status: '${payment.status}').`);
      error.statusCode = 400;
      throw error;
    }

    const invRes = await client.query(
      `SELECT * FROM invoices WHERE id = $1 FOR UPDATE`,
      [payment.invoice_id]
    );

    if (invRes.rows.length === 0) {
      const error = new Error(`Associated invoice '${payment.invoice_id}' not found.`);
      error.statusCode = 404;
      throw error;
    }

    const invoice = invRes.rows[0];
    const refundAmount = round2(Number(payment.amount));
    const newAmountPaid = Math.max(0, round2(Number(invoice.amount_paid) - refundAmount));
    const newAmountRemaining = round2(Number(invoice.total_amount) - newAmountPaid);
    const newStatus = (invoice.status === 'paid' && newAmountRemaining > 0) ? 'confirmed' : invoice.status;
    const newPaidAt = newStatus === 'paid' ? invoice.paid_at : null;

    // Update payment record
    const updatedPayRes = await client.query(
      `UPDATE payments 
       SET status = 'refunded', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [paymentId]
    );

    // Update invoice record
    const updatedInvRes = await client.query(
      `UPDATE invoices 
       SET amount_paid = $1, amount_remaining = $2, status = $3, paid_at = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING *`,
      [newAmountPaid, newAmountRemaining, newStatus, newPaidAt, invoice.id]
    );

    await client.query('COMMIT');

    return {
      message: 'Payment refunded successfully.',
      payment: updatedPayRes.rows[0],
      invoice: {
        id: updatedInvRes.rows[0].id,
        status: updatedInvRes.rows[0].status,
        amount_paid: round2(Number(updatedInvRes.rows[0].amount_paid)),
        amount_remaining: round2(Number(updatedInvRes.rows[0].amount_remaining)),
        paid_at: updatedInvRes.rows[0].paid_at,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  recordPayment,
  getPaymentById,
  listPayments,
  getPaymentsByInvoiceId,
  getPaymentSummary,
  refundPayment,
  normalizePaymentMethod,
  ALLOWED_PAYMENT_METHODS,
};

