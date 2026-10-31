const bcrypt = require('bcrypt');
const { query } = require('../config/db');
const { validatePassword } = require('../utils/passwordValidator');

const SALT_ROUNDS = 10;

/**
 * 9. Only Admin can create staff accounts
 */
async function createStaffAccount({ email, password, full_name, role = 'staff', phone, company_name }, creatorUser) {
  if (!creatorUser || creatorUser.role !== 'admin') {
    const error = new Error('Access forbidden: Only system administrators can create staff accounts.');
    error.statusCode = 403;
    throw error;
  }

  const allowedRoles = ['staff', 'admin'];
  if (!allowedRoles.includes(role)) {
    const error = new Error(`Invalid role '${role}'. Only 'staff' or 'admin' accounts may be created.`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Validate password complexity
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.isValid) {
    const error = new Error(passwordCheck.message);
    error.statusCode = 400;
    throw error;
  }

  // Check unique email
  const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length > 0) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const insertQuery = `
    INSERT INTO users (email, password_hash, full_name, company_name, phone, role, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, TRUE)
    RETURNING id, email, full_name, company_name, role, phone, is_active, created_at
  `;

  const result = await query(insertQuery, [
    normalizedEmail,
    passwordHash,
    full_name.trim(),
    company_name || null,
    phone || null,
    role,
  ]);

  return result.rows[0];
}

/**
 * 10. Customers must access only their own data
 */
async function getUserById(targetUserId, requestingUser) {
  // If customer is requesting another customer's data
  if (requestingUser.role === 'customer' && requestingUser.id !== targetUserId) {
    const error = new Error('Access denied: customers are strictly restricted to their own data.');
    error.statusCode = 403;
    throw error;
  }

  const result = await query(
    'SELECT id, email, full_name, company_name, role, phone, address_line1, city, state, postal_code, country, is_active, created_at, updated_at FROM users WHERE id = $1',
    [targetUserId]
  );

  if (result.rows.length === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

/**
 * List all users (Staff / Admin only)
 */
async function listUsers({ role, page = 1, limit = 20 }, requestingUser) {
  if (requestingUser.role === 'customer') {
    const error = new Error('Access denied: customers cannot view the user registry.');
    error.statusCode = 403;
    throw error;
  }

  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const params = [];
  let whereClause = '';

  if (role) {
    params.push(role);
    whereClause = `WHERE role = $${params.length}`;
  }

  params.push(parseInt(limit, 10));
  params.push(offset);

  const sql = `
    SELECT id, email, full_name, company_name, role, phone, is_active, created_at
    FROM users
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const result = await query(sql, params);
  return result.rows;
}

module.exports = {
  createStaffAccount,
  getUserById,
  listUsers,
};

