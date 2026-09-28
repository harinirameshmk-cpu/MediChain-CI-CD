const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { users } = require('../services/db');
const { generateToken, authenticate } = require('../middleware/auth');
const { addAlert } = require('../services/alerts');

const VALID_ROLES = ['manufacturer', 'distributor', 'transporter', 'pharmacy', 'customer', 'admin'];

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, email, password, confirmPassword, role, organization } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirm password do not match.'
      });
    }

    const normalizedRole = String(role).trim().toLowerCase();
    if (!VALID_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`
      });
    }

    const existingUser = users.findOne(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newUser = users.insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: normalizedRole,
      organization: organization ? organization.trim() : `${name.trim()} Org`
    });

    addAlert({
      type: 'INFO',
      message: `New user ${newUser.name} registered as ${normalizedRole.toUpperCase()}.`,
      role: 'ADMIN',
      details: { email: newUser.email, role: normalizedRole }
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        organization: newUser.organization
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and role are required.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = String(role).trim().toLowerCase();

    const user = users.findOne(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email, password, or selected role.'
      });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email, password, or selected role.'
      });
    }

    if (user.role.toLowerCase() !== normalizedRole) {
      return res.status(401).json({
        success: false,
        message: `Account role mismatch. This account is registered as '${user.role.toUpperCase()}', not '${normalizedRole.toUpperCase()}'.`
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
