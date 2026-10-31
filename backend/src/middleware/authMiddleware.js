const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { query } = require('../config/db');
const { errorResponse } = require('../utils/responseHelper');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Authentication required. Missing or malformed Bearer token.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return errorResponse(res, 401, 'Authentication token is empty.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return errorResponse(res, 401, 'Authentication token has expired. Please log in again.');
      }
      return errorResponse(res, 401, 'Invalid authentication token.');
    }

    // Verify user still exists in database and is active
    const userResult = await query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return errorResponse(res, 401, 'The account associated with this token no longer exists.');
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return errorResponse(res, 403, 'Account is inactive. Access forbidden.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  authenticate,
};

