const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/db');
const config = require('../config/env');
const { validatePassword } = require('../utils/passwordValidator');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('./emailService');

const SALT_ROUNDS = 10;

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function sanitizeUser(user) {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

/**
 * 1. Customer signup
 */
async function registerCustomer({ email, password, full_name, phone, company_name, address_line1, city, state, postal_code, country }) {
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

  // Insert customer
  const insertQuery = `
    INSERT INTO users (
      email, password_hash, full_name, company_name, phone,
      address_line1, city, state, postal_code, country, role, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'customer', TRUE)
    RETURNING id, email, full_name, company_name, role, phone, is_active, created_at
  `;

  const result = await query(insertQuery, [
    normalizedEmail,
    passwordHash,
    full_name.trim(),
    company_name || null,
    phone || null,
    address_line1 || null,
    city || null,
    state || null,
    postal_code || null,
    country || null,
  ]);

  const newUser = result.rows[0];
  const token = generateToken(newUser);

  // Send non-blocking welcome email
  sendWelcomeEmail(normalizedEmail, newUser.full_name).catch(() => {});

  return {
    user: newUser,
    token,
  };
}

/**
 * 2. Login (Customer, Staff, Admin)
 */
async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const userResult = await query(
    'SELECT id, email, password_hash, full_name, company_name, role, phone, is_active, created_at FROM users WHERE email = $1',
    [normalizedEmail]
  );

  if (userResult.rows.length === 0) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const user = userResult.rows[0];

  if (!user.is_active) {
    const error = new Error('This account has been deactivated. Please contact support.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user);

  return {
    user: sanitizeUser(user),
    token,
  };
}

/**
 * 3. Forgot Password
 */
async function forgotPassword(email) {
  const normalizedEmail = email.trim().toLowerCase();

  const userResult = await query('SELECT id, email, full_name, is_active FROM users WHERE email = $1', [normalizedEmail]);

  // If email not found, return generic success message to prevent user enumeration
  if (userResult.rows.length === 0) {
    return {
      message: 'If that email is registered in our system, a password reset link has been dispatched.',
      tokenSent: false,
    };
  }

  const user = userResult.rows[0];
  if (!user.is_active) {
    const error = new Error('This account is deactivated. Contact support for assistance.');
    error.statusCode = 403;
    throw error;
  }

  // Generate a cryptographically secure reset token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

  // Invalidate any prior unused reset tokens for this user
  await query(
    'UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL',
    [user.id]
  );

  // Store new reset token
  await query(
    'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokenHash, expiresAt]
  );

  // Dispatch email via Nodemailer
  await sendPasswordResetEmail(user.email, rawToken, user.full_name);

  return {
    message: 'If that email is registered in our system, a password reset link has been dispatched.',
    tokenSent: true,
    // Return token in dev/testing mode only
    devToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined,
  };
}

/**
 * 4. Reset Password
 */
async function resetPassword({ token, newPassword }) {
  if (!token || typeof token !== 'string') {
    const error = new Error('Password reset token is required.');
    error.statusCode = 400;
    throw error;
  }

  // Validate new password complexity
  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.isValid) {
    const error = new Error(passwordCheck.message);
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

  // Verify token exists, is unexpired, and unused
  const resetQuery = `
    SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at, u.email, u.full_name
    FROM password_resets pr
    JOIN users u ON u.id = pr.user_id
    WHERE pr.token_hash = $1
  `;
  const result = await query(resetQuery, [tokenHash]);

  if (result.rows.length === 0) {
    const error = new Error('Invalid password reset token.');
    error.statusCode = 400;
    throw error;
  }

  const resetRecord = result.rows[0];

  if (resetRecord.used_at) {
    const error = new Error('This password reset token has already been used.');
    error.statusCode = 400;
    throw error;
  }

  if (new Date(resetRecord.expires_at) < new Date()) {
    const error = new Error('This password reset token has expired. Please request a new one.');
    error.statusCode = 400;
    throw error;
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update user's password
  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newPasswordHash, resetRecord.user_id]
  );

  // Mark token as used
  await query(
    'UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
    [resetRecord.id]
  );

  return {
    message: 'Your password has been successfully reset. You can now log in with your new password.',
  };
}

module.exports = {
  registerCustomer,
  login,
  forgotPassword,
  resetPassword,
  generateToken,
};

