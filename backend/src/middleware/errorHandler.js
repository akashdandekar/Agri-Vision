/**
 * Centralized Error Handling Middleware
 * Protects database credentials and technical stack traces from leakage.
 */

function errorHandler(err, req, res, next) {
  console.error('Unhandled Application Error:', {
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    code: err.code
  });

  // Handle common database error codes gracefully
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      error: 'A record with this information already exists.'
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(422).json({
      success: false,
      error: 'Referenced entity not found.'
    });
  }

  const statusCode = err.statusCode || (res.statusCode && res.statusCode >= 400 ? res.statusCode : 500);
  const message = err.isOperational ? err.message : (statusCode === 500 ? 'An unexpected server error occurred. Please try again.' : err.message);

  return res.status(statusCode).json({
    success: false,
    error: message
  });
}

/**
 * 404 Route Not Found handler
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
