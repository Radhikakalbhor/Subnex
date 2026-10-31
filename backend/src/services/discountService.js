const { query } = require('../config/db');
const { getProductById } = require('./productService');

const VALID_DISCOUNT_TYPES = ['percentage', 'fixed_amount'];
const VALID_SCOPES = ['subscription', 'product', 'plan', 'invoice'];

async function createDiscount({
  code,
  name,
  discount_type,
  value,
  min_purchase_amount = 0,
  min_quantity = 0,
  valid_from,
  valid_until,
  max_redemptions = null,
  times_redeemed = 0,
  target_scope = 'subscription',
  product_id = null,
  is_active = true,
}) {
  if (!VALID_DISCOUNT_TYPES.includes(discount_type)) {
    const error = new Error(`Invalid discount_type '${discount_type}'. Supported: ${VALID_DISCOUNT_TYPES.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }

  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue <= 0) {
    const error = new Error('Discount value must be greater than zero.');
    error.statusCode = 400;
    throw error;
  }

  if (discount_type === 'percentage' && numValue > 100) {
    const error = new Error('Percentage discount cannot exceed 100%.');
    error.statusCode = 400;
    throw error;
  }

  if (!VALID_SCOPES.includes(target_scope)) {
    const error = new Error(`Invalid target_scope '${target_scope}'. Supported: ${VALID_SCOPES.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }

  // If product-specific discount, ensure product exists
  if (target_scope === 'product') {
    if (!product_id) {
      const error = new Error('A product_id is required when target_scope is set to "product".');
      error.statusCode = 400;
      throw error;
    }
    await getProductById(product_id);
  }

  const normalizedCode = code.trim().toUpperCase();

  const existing = await query('SELECT id FROM discounts WHERE code = $1', [normalizedCode]);
  if (existing.rows.length > 0) {
    const error = new Error(`Discount code '${normalizedCode}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const sql = `
    INSERT INTO discounts (
      code, name, discount_type, value, min_purchase_amount,
      min_quantity, valid_from, valid_until, max_redemptions,
      times_redeemed, target_scope, product_id, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;

  const result = await query(sql, [
    normalizedCode,
    name.trim(),
    discount_type,
    numValue,
    parseFloat(min_purchase_amount) || 0.00,
    parseInt(min_quantity, 10) || 0,
    valid_from ? new Date(valid_from) : null,
    valid_until ? new Date(valid_until) : null,
    max_redemptions !== null && max_redemptions !== undefined ? parseInt(max_redemptions, 10) : null,
    parseInt(times_redeemed, 10) || 0,
    target_scope,
    product_id || null,
    is_active !== undefined ? is_active : true,
  ]);

  return result.rows[0];
}

async function listDiscounts({ target_scope, is_active, product_id }) {
  const conditions = [];
  const params = [];

  if (target_scope) {
    params.push(target_scope);
    conditions.push(`d.target_scope = $${params.length}`);
  }

  if (is_active !== undefined) {
    params.push(is_active === 'true' || is_active === true);
    conditions.push(`d.is_active = $${params.length}`);
  }

  if (product_id) {
    params.push(product_id);
    conditions.push(`d.product_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT d.*, prod.name as product_name
    FROM discounts d
    LEFT JOIN products prod ON prod.id = d.product_id
    ${whereClause}
    ORDER BY d.created_at DESC
  `;

  const result = await query(sql, params);
  return result.rows;
}

async function getDiscountById(id) {
  const sql = `
    SELECT d.*, prod.name as product_name
    FROM discounts d
    LEFT JOIN products prod ON prod.id = d.product_id
    WHERE d.id = $1
  `;
  const result = await query(sql, [id]);

  if (result.rows.length === 0) {
    const error = new Error(`Discount with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

async function updateDiscount(id, fields) {
  await getDiscountById(id);

  if (fields.code) {
    const normalizedCode = fields.code.trim().toUpperCase();
    const existing = await query('SELECT id FROM discounts WHERE code = $1 AND id != $2', [normalizedCode, id]);
    if (existing.rows.length > 0) {
      const error = new Error(`Discount code '${normalizedCode}' already exists.`);
      error.statusCode = 409;
      throw error;
    }
    fields.code = normalizedCode;
  }

  if (fields.discount_type && !VALID_DISCOUNT_TYPES.includes(fields.discount_type)) {
    const error = new Error(`Invalid discount_type '${fields.discount_type}'. Supported: ${VALID_DISCOUNT_TYPES.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }

  if (fields.value !== undefined) {
    const numValue = parseFloat(fields.value);
    if (isNaN(numValue) || numValue <= 0) {
      const error = new Error('Discount value must be greater than zero.');
      error.statusCode = 400;
      throw error;
    }
    if ((fields.discount_type === 'percentage' || !fields.discount_type) && numValue > 100) {
      const error = new Error('Percentage discount cannot exceed 100%.');
      error.statusCode = 400;
      throw error;
    }
    fields.value = numValue;
  }

  if (fields.target_scope === 'product' && fields.product_id) {
    await getProductById(fields.product_id);
  }

  const allowedFields = [
    'code', 'name', 'discount_type', 'value', 'min_purchase_amount',
    'min_quantity', 'valid_from', 'valid_until', 'max_redemptions',
    'times_redeemed', 'target_scope', 'product_id', 'is_active'
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
    return getDiscountById(id);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  const sql = `
    UPDATE discounts
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING *
  `;

  const result = await query(sql, params);
  return result.rows[0];
}

async function deleteDiscount(id) {
  await getDiscountById(id);
  await query('DELETE FROM discounts WHERE id = $1', [id]);
  return { message: 'Discount deleted successfully.' };
}

module.exports = {
  createDiscount,
  listDiscounts,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
};

