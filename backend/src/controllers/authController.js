const authService = require('../services/authService');
const { successResponse } = require('../utils/responseHelper');

async function register(req, res, next) {
  try {
    const result = await authService.registerCustomer(req.body);
    return successResponse(res, 201, 'Customer account successfully created.', result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return successResponse(res, 200, 'Login successful.', result);
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    return successResponse(res, 200, result.message, result);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword({ token, newPassword });
    return successResponse(res, 200, result.message);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    return successResponse(res, 200, 'Authenticated user profile retrieved.', req.user);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
};

