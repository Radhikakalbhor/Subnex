const { query } = require('../config/db');

const VALID_TAX_TYPES = ['percentage', 'flat'];

async function createTax({ name, rate, tax_type = 'percentage', country, state, applicable_rules, is_active = true }) {
  if (!VALID_TAX_TYPES.includes(tax_type)) {
    const error = new Error(`Invalid tax_type '${tax_type}'. Supported: ${VALID_TAX_TYPES.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }

  const numericRate = parseFloat(rate);
  if (isNaN(numericRate) || numericRate < 0) {
    const error = new Error('Tax rate must be a non-negative number.');
    error.statusCode = 400;
    throw error;
  }

  if (tax_type === 'percentage' && numericRate > 100) {
    const error = new Error('Percentage tax rate cannot exceed 100%.');
    error.statusCode = 400;
    throw error;
  }

  const sql = `
    INSERT INTO taxes (name, rate, tax_type, country, state, applicable_rules, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const result = await query(sql, [
    name.trim(),
    numericRate,
    tax_type,
    country ? country.trim().toUpperCase() : null,
    state ? state.trim() : null,
    applicable_rules || null,
    is_active !== undefined ? is_active : true,
  ]);

  return result.rows[0];
}

async function listTaxes({ is_active, country }) {
  const conditions = [];
  const params = [];

  if (is_active !== undefined) {
    params.push(is_active === 'true' || is_active === true);
    conditions.push(`is_active = $${params.length}`);
  }

  if (country) {
    params.push(country.trim().toUpperCase());
    conditions.push(`country = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM taxes ${whereClause} ORDER BY created_at DESC`;

  const result = await query(sql, params);
  return result.rows;
}

async function getTaxById(id) {
  const result = await query('SELECT * FROM taxes WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    const error = new Error(`Tax rule with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
}

async function updateTax(id, fields) {
  await getTaxById(id);

  if (fields.tax_type && !VALID_TAX_TYPES.includes(fields.tax_type)) {
    const error = new Error(`Invalid tax_type '${fields.tax_type}'. Supported: ${VALID_TAX_TYPES.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }

  if (fields.rate !== undefined) {
    const rate = parseFloat(fields.rate);
    if (isNaN(rate) || rate < 0) {
      const error = new Error('Tax rate must be a non-negative number.');
      error.statusCode = 400;
      throw error;
    }
    if ((fields.tax_type === 'percentage' || !fields.tax_type) && rate > 100) {
      const error = new Error('Percentage tax rate cannot exceed 100%.');
      error.statusCode = 400;
      throw error;
    }
    fields.rate = rate;
  }

  if (fields.country) {
    fields.country = fields.country.trim().toUpperCase();
  }

  const allowedFields = ['name', 'rate', 'tax_type', 'country', 'state', 'applicable_rules', 'is_active'];
  const updates = [];
  const params = [id];

  for (const key of allowedFields) {
    if (fields[key] !== undefined) {
      params.push(fields[key]);
      updates.push(`${key} = $${params.length}`);
    }
  }

  if (updates.length === 0) {
    return getTaxById(id);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  const sql = `
    UPDATE taxes
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING *
  `;

  const result = await query(sql, params);
  return result.rows[0];
}

async function deleteTax(id) {
  await getTaxById(id);
  await query('DELETE FROM taxes WHERE id = $1', [id]);
  return { message: 'Tax configuration deleted successfully.' };
}

module.exports = {
  createTax,
  listTaxes,
  getTaxById,
  updateTax,
  deleteTax,
};

