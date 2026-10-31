const { query } = require('../config/db');
const { getVariantById } = require('./productService');

const VALID_INTERVALS = ['day', 'week', 'month', 'year'];

async function createPlan({
  variant_id,
  name,
  code,
  billing_interval = 'month',
  billing_interval_count = 1,
  trial_period_days = 0,
  price,
  currency = 'USD',
  minimum_quantity = 1,
  available_from,
  available_until,
  allow_auto_close = false,
  allow_pause = true,
  allow_renewal = true,
  allow_early_close = true,
  is_active = true,
}) {
  // Ensure variant exists
  await getVariantById(variant_id);

  if (!VALID_INTERVALS.includes(billing_interval)) {
    const error = new Error(`Invalid billing_interval '${billing_interval}'. Supported: ${VALID_INTERVALS.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedCode = code ? code.trim().toUpperCase() : `PLAN-${Date.now()}`;

  const existing = await query('SELECT id FROM plans WHERE code = $1', [normalizedCode]);
  if (existing.rows.length > 0) {
    const error = new Error(`Plan with code '${normalizedCode}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const sql = `
    INSERT INTO plans (
      variant_id, name, code, billing_interval, billing_interval_count,
      trial_period_days, price, currency, minimum_quantity,
      available_from, available_until, allow_auto_close, allow_pause,
      allow_renewal, allow_early_close, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *
  `;

  const result = await query(sql, [
    variant_id,
    name.trim(),
    normalizedCode,
    billing_interval,
    parseInt(billing_interval_count, 10) || 1,
    parseInt(trial_period_days, 10) || 0,
    parseFloat(price),
    currency.toUpperCase(),
    parseInt(minimum_quantity, 10) || 1,
    available_from ? new Date(available_from) : null,
    available_until ? new Date(available_until) : null,
    allow_auto_close !== undefined ? allow_auto_close : false,
    allow_pause !== undefined ? allow_pause : true,
    allow_renewal !== undefined ? allow_renewal : true,
    allow_early_close !== undefined ? allow_early_close : true,
    is_active !== undefined ? is_active : true,
  ]);

  return result.rows[0];
}

async function listPlans({ variant_id, billing_interval, is_active }) {
  const conditions = [];
  const params = [];

  if (variant_id) {
    params.push(variant_id);
    conditions.push(`p.variant_id = $${params.length}`);
  }

  if (billing_interval) {
    params.push(billing_interval);
    conditions.push(`p.billing_interval = $${params.length}`);
  }

  if (is_active !== undefined) {
    params.push(is_active === 'true' || is_active === true);
    conditions.push(`p.is_active = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT p.*, v.name as variant_name, v.brand as variant_brand, prod.name as product_name, prod.id as product_id
    FROM plans p
    JOIN variants v ON v.id = p.variant_id
    JOIN products prod ON prod.id = v.product_id
    ${whereClause}
    ORDER BY p.price ASC
  `;

  const result = await query(sql, params);
  return result.rows;
}

async function getPlanById(id) {
  const sql = `
    SELECT p.*, v.name as variant_name, v.brand as variant_brand, prod.name as product_name, prod.id as product_id
    FROM plans p
    JOIN variants v ON v.id = p.variant_id
    JOIN products prod ON prod.id = v.product_id
    WHERE p.id = $1
  `;
  const result = await query(sql, [id]);

  if (result.rows.length === 0) {
    const error = new Error(`Plan with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

async function updatePlan(id, fields) {
  await getPlanById(id);

  if (fields.billing_interval && !VALID_INTERVALS.includes(fields.billing_interval)) {
    const error = new Error(`Invalid billing_interval '${fields.billing_interval}'. Supported: ${VALID_INTERVALS.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }

  if (fields.code) {
    const normalizedCode = fields.code.trim().toUpperCase();
    const existing = await query('SELECT id FROM plans WHERE code = $1 AND id != $2', [normalizedCode, id]);
    if (existing.rows.length > 0) {
      const error = new Error(`Plan with code '${normalizedCode}' already exists.`);
      error.statusCode = 409;
      throw error;
    }
    fields.code = normalizedCode;
  }

  const allowedFields = [
    'name', 'code', 'billing_interval', 'billing_interval_count', 'trial_period_days',
    'price', 'currency', 'minimum_quantity', 'available_from', 'available_until',
    'allow_auto_close', 'allow_pause', 'allow_renewal', 'allow_early_close', 'is_active'
  ];

  const updates = [];
  const params = [id];

  for (const key of allowedFields) {
    if (fields[key] !== undefined) {
      params.push(fields[key]);
      updates.push(`${key} = $${params.length}`);
    }
  }

  if (updates.length === 0) {
    return getPlanById(id);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  const sql = `
    UPDATE plans
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING *
  `;

  const result = await query(sql, params);
  return result.rows[0];
}

async function deletePlan(id) {
  await getPlanById(id);
  await query('DELETE FROM plans WHERE id = $1', [id]);
  return { message: 'Plan deleted successfully.' };
}

module.exports = {
  createPlan,
  listPlans,
  getPlanById,
  updatePlan,
  deletePlan,
};

