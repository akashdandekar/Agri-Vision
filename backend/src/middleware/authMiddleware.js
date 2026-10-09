const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'kisansetu_super_secret_jwt_key_2026_secured_agri_chain';

/**
 * Verifies JWT token from Authorization header
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization token'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Session expired. Please log in again.'
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
    }

    // Attach user payload
    req.user = decoded;

    // Attach specific role id (farmer_id or admin_id) if not already in decoded token
    if (decoded.role === 'FARMER' && !req.user.farmer_id) {
      const farmers = await query('SELECT id, preferred_language FROM farmers WHERE user_id = ?', [decoded.id]);
      if (farmers.length > 0) {
        req.user.farmer_id = farmers[0].id;
        req.user.preferred_language = farmers[0].preferred_language;
      }
    } else if (decoded.role === 'ADMIN' && !req.user.admin_id) {
      const admins = await query('SELECT id, employee_id, assigned_centre_id FROM admins WHERE user_id = ?', [decoded.id]);
      if (admins.length > 0) {
        req.user.admin_id = admins[0].id;
        req.user.employee_id = admins[0].employee_id;
        req.user.assigned_centre_id = admins[0].assigned_centre_id;
      }
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server authorization error'
    });
  }
}

/**
 * Role-based authorization middleware
 * @param  {...string} allowedRoles e.g. 'FARMER', 'ADMIN'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: insufficient privileges for this resource'
      });
    }
    next();
  };
}

const requireFarmer = requireRole('FARMER');
const requireAdmin = requireRole('ADMIN');

module.exports = {
  verifyToken,
  requireRole,
  requireFarmer,
  requireAdmin
};
