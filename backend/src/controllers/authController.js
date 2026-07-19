const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { Admin, Staff, Role } = require('../models');
const { Op } = require('sequelize');
const { sendOTPEmail } = require('../services/emailService');

const OTP_EXPIRY_MINUTES = 10;

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const searchStr = email.toLowerCase().trim();

    // 1. Try Admin login
    const admin = await Admin.findOne({ where: { email: searchStr } });

    if (admin && admin.is_active) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (isMatch) {
        if (admin.totp_enabled && admin.totp_secret) {
          return res.json({
            requires2FA: true,
            twoFaMethod: 'totp',
            email: admin.email,
            message: 'Enter the 6-digit code from your authenticator app.',
          });
        }

        const permissions = ['*']; // Admins have full access
        const payload = {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          outlet_id: admin.outlet_id || null,
          userType: 'admin',
          permissions,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });

        const userData = {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          outlet_id: admin.outlet_id || null,
          userType: 'admin',
          totp_enabled: admin.totp_enabled,
          permissions,
        };

        return res.json({
          token,
          user: userData,
          admin: userData,
        });
      }
    }

    return res.status(401).json({ message: 'Invalid email or password.' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const admin = await Admin.findOne({ where: { email: email.toLowerCase().trim() } });

    if (!admin || !admin.is_active) {
      return res.status(401).json({ message: 'Invalid request.' });
    }

    if (admin.totp_enabled && admin.totp_secret) {
      const valid = speakeasy.totp.verify({
        secret: admin.totp_secret,
        encoding: 'base32',
        token: otp.trim(),
        window: 1,
      });

      if (!valid) {
        return res.status(400).json({ message: 'Invalid authenticator code.' });
      }
    } else {
      if (!admin.otp_code || !admin.otp_expires_at) {
        return res.status(400).json({ message: 'No pending verification. Please sign in again.' });
      }

      if (new Date() > new Date(admin.otp_expires_at)) {
        await admin.update({ otp_code: null, otp_expires_at: null });
        return res.status(400).json({ message: 'Verification code has expired. Please sign in again.' });
      }

      if (admin.otp_code !== otp.trim()) {
        return res.status(400).json({ message: 'Invalid verification code.' });
      }

      await admin.update({ otp_code: null, otp_expires_at: null });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role, outlet_id: admin.outlet_id || null },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        outlet_id: admin.outlet_id || null,
        totp_enabled: admin.totp_enabled,
      },
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const setupTOTP = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.admin.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });

    if (admin.totp_enabled) {
      return res.status(400).json({ message: 'Authenticator app is already enabled. Disable it first to re-setup.' });
    }

    const secret = speakeasy.generateSecret({
      name: `Glowy Saloon (${admin.email})`,
      issuer: 'Glowy Saloon',
      length: 20,
    });

    await admin.update({ totp_secret: secret.base32, totp_enabled: false });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.json({
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      message: 'Scan the QR code with your authenticator app, then confirm with a code.',
    });
  } catch (err) {
    console.error('Setup TOTP error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const confirmTOTP = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Authenticator code is required.' });
    }

    const admin = await Admin.findByPk(req.admin.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });

    if (admin.totp_enabled) {
      return res.status(400).json({ message: 'Authenticator app is already enabled.' });
    }

    if (!admin.totp_secret) {
      return res.status(400).json({ message: 'No TOTP setup in progress. Start setup first.' });
    }

    const valid = speakeasy.totp.verify({
      secret: admin.totp_secret,
      encoding: 'base32',
      token: token.trim(),
      window: 1,
    });

    if (!valid) {
      return res.status(400).json({ message: 'Invalid code. Please try again.' });
    }

    await admin.update({ totp_enabled: true });

    return res.json({ message: 'Authenticator app enabled successfully.' });
  } catch (err) {
    console.error('Confirm TOTP error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const disableTOTP = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required to disable authenticator.' });
    }

    const admin = await Admin.findByPk(req.admin.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    await admin.update({ totp_secret: null, totp_enabled: false });

    return res.json({ message: 'Authenticator app disabled successfully.' });
  } catch (err) {
    console.error('Disable TOTP error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const admin = await Admin.findOne({ where: { email: email.toLowerCase().trim() } });

    if (!admin || !admin.is_active) {
      return res.status(200).json({ message: 'If that email exists, a new code has been sent.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await admin.update({ otp_code: otp, otp_expires_at: expiresAt });

    try {
      await sendOTPEmail(admin.email, admin.name, otp);
    } catch (emailErr) {
      console.error('Failed to resend OTP email:', emailErr);
      return res.status(500).json({ message: 'Could not send verification email. Please try again.' });
    }

    return res.json({ message: `A new verification code has been sent to ${admin.email}.` });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getMe = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.admin.id, {
      attributes: ['id', 'name', 'email', 'role', 'is_active', 'totp_enabled'],
    });

    if (!admin) return res.status(404).json({ message: 'Admin not found.' });

    return res.json(admin);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { login, verifyOTP, resendOTP, getMe, setupTOTP, confirmTOTP, disableTOTP };
