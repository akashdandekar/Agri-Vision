const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, withTransaction } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'kisansetu_super_secret_jwt_key_2026_secured_agri_chain';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate standard JWT payload
 */
function generateToken(user, specificId = null) {
  const payload = {
    id: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role,
    fullName: user.full_name
  };

  if (user.role === 'FARMER') {
    payload.farmer_id = specificId;
  } else if (user.role === 'ADMIN') {
    payload.admin_id = specificId;
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Farmer Registration
 */
async function farmerRegister(req, res, next) {
  try {
    const {
      phone,
      password,
      fullName,
      email,
      village,
      district,
      state,
      landAcres,
      kisanCreditCard,
      bankAccountNo,
      bankIfsc,
      preferredLanguage = 'en'
    } = req.body;

    if (!phone || !password || !fullName || !village || !district || !state) {
      return res.status(400).json({
        success: false,
        error: 'Please provide phone number, password, full name, village, district, and state.'
      });
    }

    // Phone format check (standard 10-digit Indian mobile)
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 10-digit mobile phone number.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    // Check existing phone
    const existing = await query('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A registered account with this mobile number already exists.'
      });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Atomic creation in transaction
    const newFarmer = await withTransaction(async (conn) => {
      const [userResult] = await conn.query(
        `INSERT INTO users (phone, email, password_hash, role, full_name, created_at)
         VALUES (?, ?, ?, 'FARMER', ?, NOW())`,
        [cleanPhone, email ? email.trim() : null, passwordHash, fullName.trim()]
      );

      const userId = userResult.insertId;

      const [farmerResult] = await conn.query(
        `INSERT INTO farmers (user_id, village, district, state, land_acres, kisan_credit_card, bank_account_no, bank_ifsc, preferred_language, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          village.trim(),
          district.trim(),
          state.trim(),
          landAcres ? parseFloat(landAcres) : 0.0,
          kisanCreditCard ? kisanCreditCard.trim() : null,
          bankAccountNo ? bankAccountNo.trim() : null,
          bankIfsc ? bankIfsc.trim().toUpperCase() : null,
          ['en', 'hi', 'mr'].includes(preferredLanguage) ? preferredLanguage : 'en'
        ]
      );

      return {
        id: userId,
        farmer_id: farmerResult.insertId,
        phone: cleanPhone,
        email: email || null,
        role: 'FARMER',
        full_name: fullName.trim(),
        preferred_language: preferredLanguage
      };
    });

    const token = generateToken(newFarmer, newFarmer.farmer_id);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Welcome to KisanSetu!',
      token,
      user: {
        id: newFarmer.id,
        farmerId: newFarmer.farmer_id,
        phone: newFarmer.phone,
        fullName: newFarmer.full_name,
        role: 'FARMER',
        preferredLanguage: newFarmer.preferred_language
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Farmer Login (Strictly verifies FARMER role)
 */
async function farmerLogin(req, res, next) {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter both mobile number and password.'
      });
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');

    const users = await query(
      `SELECT u.*, f.id as farmer_id, f.village, f.district, f.state, f.land_acres, f.preferred_language, f.bank_account_no, f.bank_ifsc
       FROM users u
       JOIN farmers f ON f.user_id = u.id
       WHERE u.phone = ?`,
      [cleanPhone]
    );

    if (users.length === 0) {
      // Check if this was an admin attempting to login at farmer endpoint
      const adminCheck = await query('SELECT role FROM users WHERE phone = ?', [cleanPhone]);
      if (adminCheck.length > 0 && adminCheck[0].role === 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'This portal is for Farmers only. Official personnel must log in via Admin Portal.'
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid mobile number or password.'
      });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid mobile number or password.'
      });
    }

    const token = generateToken(user, user.farmer_id);

    return res.json({
      success: true,
      message: 'Farmer logged in successfully',
      token,
      user: {
        id: user.id,
        farmerId: user.farmer_id,
        phone: user.phone,
        fullName: user.full_name,
        email: user.email,
        role: 'FARMER',
        village: user.village,
        district: user.district,
        state: user.state,
        landAcres: user.land_acres,
        preferredLanguage: user.preferred_language,
        bankAccountNo: user.bank_account_no,
        bankIfsc: user.bank_ifsc
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Admin Login (Strictly verifies ADMIN role)
 */
async function adminLogin(req, res, next) {
  try {
    const { identifier, password } = req.body; // Can be phone, email, or employee_id

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter official phone, email, or employee ID and password.'
      });
    }

    const trimmed = identifier.trim();

    const admins = await query(
      `SELECT u.*, a.id as admin_id, a.employee_id, a.designation, a.assigned_centre_id, c.name as centre_name
       FROM users u
       JOIN admins a ON a.user_id = u.id
       LEFT JOIN procurement_centres c ON c.id = a.assigned_centre_id
       WHERE (u.phone = ? OR u.email = ? OR a.employee_id = ?) AND u.role = 'ADMIN'`,
      [trimmed, trimmed, trimmed]
    );

    if (admins.length === 0) {
      // Check if farmer accidentally tried logging in here
      const farmerCheck = await query('SELECT role FROM users WHERE phone = ? OR email = ?', [trimmed, trimmed]);
      if (farmerCheck.length > 0 && farmerCheck[0].role === 'FARMER') {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Farmer accounts cannot access the Administration Portal.'
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid administrator credentials.'
      });
    }

    const admin = admins[0];

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid administrator credentials.'
      });
    }

    const token = generateToken(admin, admin.admin_id);

    return res.json({
      success: true,
      message: 'Administrator logged in successfully',
      token,
      user: {
        id: admin.id,
        adminId: admin.admin_id,
        phone: admin.phone,
        email: admin.email,
        fullName: admin.full_name,
        role: 'ADMIN',
        employeeId: admin.employee_id,
        designation: admin.designation,
        assignedCentreId: admin.assigned_centre_id,
        centreName: admin.centre_name
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get currently logged-in user profile
 */
async function getMe(req, res, next) {
  try {
    if (req.user.role === 'FARMER') {
      const farmers = await query(
        `SELECT u.id as user_id, u.phone, u.email, u.full_name, u.role,
                f.id as farmer_id, f.village, f.district, f.state, f.land_acres,
                f.kisan_credit_card, f.bank_account_no, f.bank_ifsc, f.preferred_language
         FROM users u
         JOIN farmers f ON f.user_id = u.id
         WHERE u.id = ?`,
        [req.user.id]
      );

      if (farmers.length === 0) {
        return res.status(404).json({ success: false, error: 'Farmer profile not found.' });
      }

      return res.json({ success: true, user: farmers[0] });

    } else if (req.user.role === 'ADMIN') {
      const admins = await query(
        `SELECT u.id as user_id, u.phone, u.email, u.full_name, u.role,
                a.id as admin_id, a.employee_id, a.designation, a.assigned_centre_id,
                c.name as centre_name, c.centre_code
         FROM users u
         JOIN admins a ON a.user_id = u.id
         LEFT JOIN procurement_centres c ON c.id = a.assigned_centre_id
         WHERE u.id = ?`,
        [req.user.id]
      );

      if (admins.length === 0) {
        return res.status(404).json({ success: false, error: 'Admin profile not found.' });
      }

      return res.json({ success: true, user: admins[0] });
    }

    return res.status(403).json({ success: false, error: 'Invalid user role.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Update Farmer Profile Preferences (e.g. language, bank details)
 */
async function updateFarmerProfile(req, res, next) {
  try {
    const { preferredLanguage, village, district, state, landAcres, bankAccountNo, bankIfsc, fullName } = req.body;

    if (fullName) {
      await query('UPDATE users SET full_name = ? WHERE id = ?', [fullName.trim(), req.user.id]);
    }

    const updates = [];
    const params = [];

    if (preferredLanguage && ['en', 'hi', 'mr'].includes(preferredLanguage)) {
      updates.push('preferred_language = ?');
      params.push(preferredLanguage);
    }
    if (village) {
      updates.push('village = ?');
      params.push(village.trim());
    }
    if (district) {
      updates.push('district = ?');
      params.push(district.trim());
    }
    if (state) {
      updates.push('state = ?');
      params.push(state.trim());
    }
    if (landAcres !== undefined) {
      updates.push('land_acres = ?');
      params.push(parseFloat(landAcres) || 0);
    }
    if (bankAccountNo) {
      updates.push('bank_account_no = ?');
      params.push(bankAccountNo.trim());
    }
    if (bankIfsc) {
      updates.push('bank_ifsc = ?');
      params.push(bankIfsc.trim().toUpperCase());
    }

    if (updates.length > 0) {
      params.push(req.user.id);
      await query(`UPDATE farmers SET ${updates.join(', ')} WHERE user_id = ?`, params);
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  farmerRegister,
  farmerLogin,
  adminLogin,
  getMe,
  updateFarmerProfile
};
