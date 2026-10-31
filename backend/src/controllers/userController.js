const userService = require('../services/userService');
const { successResponse } = require('../utils/responseHelper');

/**
 * 9. Only Admin can create staff accounts
 */
async function createStaff(req, res, next) {
  try {
    const newStaff = await userService.createStaffAccount(req.body, req.user);
    return successResponse(res, 201, `${newStaff.role} account successfully created.`, newStaff);
  } catch (err) {
    next(err);
  }
}

/**
 * 10. Customers must access only their own data
 */
async function getUser(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id, req.user);
    return successResponse(res, 200, 'User profile retrieved successfully.', user);
  } catch (err) {
    next(err);
  }
}

/**
 * List users (Staff / Admin only)
 */
async function listUsers(req, res, next) {
  try {
    const users = await userService.listUsers(req.query, req.user);
    return successResponse(res, 200, 'Users retrieved successfully.', users);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createStaff,
  getUser,
  listUsers,
};

