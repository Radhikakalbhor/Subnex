const { errorResponse } = require('../utils/responseHelper');

function errorHandler(err, req, res, next) {
  console.error('[Error Handler]:', err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return errorResponse(
    res,
    statusCode,
    message,
    process.env.NODE_ENV === 'development' ? err.stack : undefined
  );
}

function notFoundHandler(req, res) {
  return errorResponse(res, 404, `Endpoint not found: ${req.method} ${req.originalUrl}`);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};

