const { query } = require('../config/db');

/**
 * ==============================================================================
 * PRODUCT SERVICE
 * ==============================================================================
 */

async function createProduct({ name, type = 'service', sales_price = 0, cost_price = 0, notes, sku, description, is_active = true, metadata = {} }) {
  const normalizedSku = sku ? sku.trim().toUpperCase() : `PROD-${Date.now()}`;
  
  // Check unique SKU
  const existing = await query('SELECT id FROM products WHERE sku = $1', [normalizedSku]);
  if (existing.rows.length > 0) {
    const error = new Error(`Product with SKU '${normalizedSku}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const sql = `
    INSERT INTO products (name, type, sales_price, cost_price, notes, sku, description, is_active, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const result = await query(sql, [
    name.trim(),
    type.trim(),
    parseFloat(sales_price) || 0.00,
    parseFloat(cost_price) || 0.00,
    notes || null,
    normalizedSku,
    description || null,
    is_active !== undefined ? is_active : true,
    JSON.stringify(metadata || {}),
  ]);

  return result.rows[0];
}

async function listProducts({ search, type, is_active, page = 1, limit = 50 }) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length})`);
  }

  if (type) {
    params.push(type.trim());
    conditions.push(`type = $${params.length}`);
  }

  if (is_active !== undefined) {
    params.push(is_active === 'true' || is_active === true);
    conditions.push(`is_active = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  
  params.push(parseInt(limit, 10));
  params.push(offset);

  const sql = `
    SELECT * FROM products
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const result = await query(sql, params);
  return result.rows;
}

async function getProductById(id) {
  const productResult = await query('SELECT * FROM products WHERE id = $1', [id]);
  if (productResult.rows.length === 0) {
    const error = new Error(`Product with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  const product = productResult.rows[0];

  // Fetch variants and plans
  const variantsResult = await query(
    'SELECT * FROM variants WHERE product_id = $1 ORDER BY created_at ASC',
    [id]
  );

  const variants = variantsResult.rows;

  if (variants.length > 0) {
    const variantIds = variants.map(v => v.id);
    const plansResult = await query(
      `SELECT * FROM plans WHERE variant_id = ANY($1::uuid[]) ORDER BY price ASC`,
      [variantIds]
    );

    const plansByVariant = {};
    for (const plan of plansResult.rows) {
      if (!plansByVariant[plan.variant_id]) {
        plansByVariant[plan.variant_id] = [];
      }
      plansByVariant[plan.variant_id].push(plan);
    }

    for (const v of variants) {
      v.plans = plansByVariant[v.id] || [];
    }
  }

  product.variants = variants;
  return product;
}

async function updateProduct(id, fields) {
  await getProductById(id);

  if (fields.sku) {
    const normalizedSku = fields.sku.trim().toUpperCase();
    const existing = await query('SELECT id FROM products WHERE sku = $1 AND id != $2', [normalizedSku, id]);
    if (existing.rows.length > 0) {
      const error = new Error(`Product with SKU '${normalizedSku}' already exists.`);
      error.statusCode = 409;
      throw error;
    }
    fields.sku = normalizedSku;
  }

  const allowedFields = ['name', 'type', 'sales_price', 'cost_price', 'notes', 'sku', 'description', 'is_active', 'metadata'];
  const updates = [];
  const params = [id];

  for (const key of allowedFields) {
    if (fields[key] !== undefined) {
      params.push(key === 'metadata' ? JSON.stringify(fields[key]) : fields[key]);
      updates.push(`${key} = $${params.length}`);
    }
  }

  if (updates.length === 0) {
    return getProductById(id);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  const sql = `
    UPDATE products
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING *
  `;

  const result = await query(sql, params);
  return result.rows[0];
}

async function deleteProduct(id) {
  await getProductById(id);
  // Hard delete if no subscriptions link to it, or cascade delete
  await query('DELETE FROM products WHERE id = $1', [id]);
  return { message: 'Product and associated variants/plans deleted successfully.' };
}

/**
 * ==============================================================================
 * PRODUCT VARIANT SERVICE
 * ==============================================================================
 */

async function createVariant({ product_id, name, brand, additional_price = 0, sku, attributes = {}, is_active = true }) {
  // Ensure product exists
  await getProductById(product_id);

  const normalizedSku = sku ? sku.trim().toUpperCase() : `VAR-${Date.now()}`;

  const existing = await query('SELECT id FROM variants WHERE sku = $1', [normalizedSku]);
  if (existing.rows.length > 0) {
    const error = new Error(`Variant with SKU '${normalizedSku}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const sql = `
    INSERT INTO variants (product_id, name, brand, additional_price, sku, attributes, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const result = await query(sql, [
    product_id,
    name.trim(),
    brand ? brand.trim() : null,
    parseFloat(additional_price) || 0.00,
    normalizedSku,
    JSON.stringify(attributes || {}),
    is_active !== undefined ? is_active : true,
  ]);

  return result.rows[0];
}

async function getVariantById(id) {
  const result = await query('SELECT * FROM variants WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    const error = new Error(`Variant with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
}

async function listVariants({ product_id, is_active }) {
  const conditions = [];
  const params = [];

  if (product_id) {
    params.push(product_id);
    conditions.push(`product_id = $${params.length}`);
  }

  if (is_active !== undefined) {
    params.push(is_active === 'true' || is_active === true);
    conditions.push(`is_active = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM variants ${whereClause} ORDER BY created_at ASC`;

  const result = await query(sql, params);
  return result.rows;
}

async function updateVariant(id, fields) {
  await getVariantById(id);

  if (fields.sku) {
    const normalizedSku = fields.sku.trim().toUpperCase();
    const existing = await query('SELECT id FROM variants WHERE sku = $1 AND id != $2', [normalizedSku, id]);
    if (existing.rows.length > 0) {
      const error = new Error(`Variant with SKU '${normalizedSku}' already exists.`);
      error.statusCode = 409;
      throw error;
    }
    fields.sku = normalizedSku;
  }

  const allowedFields = ['name', 'brand', 'additional_price', 'sku', 'attributes', 'is_active'];
  const updates = [];
  const params = [id];

  for (const key of allowedFields) {
    if (fields[key] !== undefined) {
      params.push(key === 'attributes' ? JSON.stringify(fields[key]) : fields[key]);
      updates.push(`${key} = $${params.length}`);
    }
  }

  if (updates.length === 0) {
    return getVariantById(id);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  const sql = `
    UPDATE variants
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING *
  `;

  const result = await query(sql, params);
  return result.rows[0];
}

async function deleteVariant(id) {
  await getVariantById(id);
  await query('DELETE FROM variants WHERE id = $1', [id]);
  return { message: 'Variant and its plans deleted successfully.' };
}

module.exports = {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  createVariant,
  getVariantById,
  listVariants,
  updateVariant,
  deleteVariant,
};

