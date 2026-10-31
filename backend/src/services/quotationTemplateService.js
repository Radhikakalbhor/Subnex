const { query } = require('../config/db');

async function createTemplate({ name, code, description, terms_and_conditions, default_validity_days = 30, default_payment_terms = 'Net 30', is_active = true, metadata = {} }) {
  const normalizedCode = code ? code.trim().toUpperCase() : `QT-${Date.now()}`;

  const existing = await query('SELECT id FROM quotation_templates WHERE code = $1', [normalizedCode]);
  if (existing.rows.length > 0) {
    const error = new Error(`Quotation template with code '${normalizedCode}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const sql = `
    INSERT INTO quotation_templates (
      name, code, description, terms_and_conditions, default_validity_days,
      default_payment_terms, is_active, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const result = await query(sql, [
    name.trim(),
    normalizedCode,
    description || null,
    terms_and_conditions.trim(),
    parseInt(default_validity_days, 10) || 30,
    default_payment_terms.trim(),
    is_active !== undefined ? is_active : true,
    JSON.stringify(metadata || {}),
  ]);

  return result.rows[0];
}

async function listTemplates({ is_active }) {
  const conditions = [];
  const params = [];

  if (is_active !== undefined) {
    params.push(is_active === 'true' || is_active === true);
    conditions.push(`is_active = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM quotation_templates ${whereClause} ORDER BY created_at DESC`;

  const result = await query(sql, params);
  return result.rows;
}

async function getTemplateById(id) {
  const result = await query('SELECT * FROM quotation_templates WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    const error = new Error(`Quotation template with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
}

async function updateTemplate(id, fields) {
  await getTemplateById(id);

  if (fields.code) {
    const normalizedCode = fields.code.trim().toUpperCase();
    const existing = await query('SELECT id FROM quotation_templates WHERE code = $1 AND id != $2', [normalizedCode, id]);
    if (existing.rows.length > 0) {
      const error = new Error(`Quotation template with code '${normalizedCode}' already exists.`);
      error.statusCode = 409;
      throw error;
    }
    fields.code = normalizedCode;
  }

  const allowedFields = ['name', 'code', 'description', 'terms_and_conditions', 'default_validity_days', 'default_payment_terms', 'is_active', 'metadata'];
  const updates = [];
  const params = [id];

  for (const key of allowedFields) {
    if (fields[key] !== undefined) {
      params.push(key === 'metadata' ? JSON.stringify(fields[key]) : fields[key]);
      updates.push(`${key} = $${params.length}`);
    }
  }

  if (updates.length === 0) {
    return getTemplateById(id);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  const sql = `
    UPDATE quotation_templates
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING *
  `;

  const result = await query(sql, params);
  return result.rows[0];
}

async function deleteTemplate(id) {
  await getTemplateById(id);
  await query('DELETE FROM quotation_templates WHERE id = $1', [id]);
  return { message: 'Quotation template deleted successfully.' };
}

module.exports = {
  createTemplate,
  listTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
};

