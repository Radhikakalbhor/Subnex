const { errorResponse } = require('../utils/responseHelper');

/**
 * 8. Role-based authorization middleware
 * Checks if authenticated user has one of the allowed roles.
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized. Authentication must precede authorization.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Access forbidden: Insufficient permissions. Requires one of [${allowedRoles.join(', ')}], but your role is '${req.user.role}'.`
      );
    }

    next();
  };
}

/**
 * 10. Customers must access only their own data
 * Restricts customers to their own userId matching req.params[paramField].
 * Staff and Admin bypass this check.
 */
function requireSelfOrStaff(paramField = 'id') {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized. Please authenticate.');
    }

    const targetId = req.params[paramField];

    if (req.user.role === 'customer') {
      if (req.user.id !== targetId) {
        return errorResponse(
          res,
          403,
          'Access denied: Customers are strictly restricted from accessing data belonging to other accounts.'
        );
      }
    }

    next();
  };
}

module.exports = {
  authorize,
  requireSelfOrStaff,
};

