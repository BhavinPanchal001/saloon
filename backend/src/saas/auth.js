const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models/db');

const router = express.Router();
const issuer = 'salon-saas';
const sessionAudience = 'salon-saas:workspace';
const challengeAudience = 'salon-saas:totp';
const denied = res => res.status(401).json({ message: 'Invalid credentials or session.' });
const select = (sql, replacements) => sequelize.query(sql, { type: QueryTypes.SELECT, replacements });
const wrap = callback => (req, res, next) => Promise.resolve(callback(req, res, next)).catch(next);

function sign(adminId, audience, claims, expiresIn) {
  return jwt.sign(claims, process.env.JWT_SECRET, {
    algorithm: 'HS256', issuer, audience, subject: String(adminId), expiresIn,
  });
}

function verify(token, audience) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer, audience });
    return /^[1-9]\d*$/.test(decoded.sub) ? decoded : null;
  } catch {
    return null;
  }
}

function memberships(adminId) {
  return select(`SELECT o.id, o.slug, o.name, m.role, m.outlet_id
    FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    JOIN admins a ON a.id = m.admin_id AND a.is_active
    LEFT JOIN outlets x ON x.id = m.outlet_id AND x.organization_id = m.organization_id
    WHERE m.admin_id = ? AND m.active
      AND (m.role = 'owner' OR x.id IS NOT NULL)
    ORDER BY o.slug`, [adminId]);
}

async function session(res, adminId, slug) {
  const workspaces = await memberships(adminId);
  const workspace = slug ? workspaces.find(entry => entry.slug === slug) : workspaces[0];
  if (!workspace) return res.status(403).json({ message: 'Workspace access denied.' });
  return res.json({
    token: sign(adminId, sessionAudience, { organizationId: workspace.id }, '8h'),
    workspace,
    workspaces,
  });
}

const authenticate = wrap(async (req, res, next) => {
  const encoded = req.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  const claims = encoded && verify(encoded, sessionAudience);
  if (!claims || !Number.isSafeInteger(claims.organizationId)) return denied(res);
  const workspaces = await memberships(claims.sub);
  const workspace = workspaces.find(entry => entry.id === claims.organizationId);
  if (!workspace) return res.status(403).json({ message: 'Workspace access denied.' });
  req.saas = { adminId: Number(claims.sub), workspace, workspaces };
  return next();
});

router.post('/login', wrap(async (req, res) => {
  const { email, password, workspace } = req.body || {};
  if (typeof email !== 'string' || email.length > 150 || typeof password !== 'string' ||
      Buffer.byteLength(password) > 72 || (workspace !== undefined && typeof workspace !== 'string')) {
    return denied(res);
  }
  const [admin] = await select('SELECT id, password, totp_enabled FROM admins WHERE email = ? AND is_active', [email.trim().toLowerCase()]);
  if (!admin || !await bcrypt.compare(password, admin.password)) return denied(res);
  if (admin.totp_enabled) {
    return res.json({ requires2FA: true, challenge: sign(admin.id, challengeAudience, { workspace }, '5m') });
  }
  return session(res, admin.id, workspace);
}));

router.post('/verify-otp', wrap(async (req, res) => {
  const { challenge, otp } = req.body || {};
  const claims = typeof challenge === 'string' && verify(challenge, challengeAudience);
  if (!claims || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) return denied(res);
  const [admin] = await select('SELECT id, totp_secret FROM admins WHERE id = ? AND is_active AND totp_enabled', [claims.sub]);
  if (!admin?.totp_secret || !speakeasy.totp.verify({
    secret: admin.totp_secret, encoding: 'base32', token: otp, window: 1,
  })) return denied(res);
  return session(res, admin.id, claims.workspace);
}));

router.get('/me', authenticate, (req, res) => res.json(req.saas));
router.post('/switch-workspace', authenticate, wrap((req, res) => {
  const slug = req.body?.workspace;
  if (typeof slug !== 'string' || !slug.length) return res.status(400).json({ message: 'Workspace is required.' });
  return session(res, req.saas.adminId, slug);
}));

module.exports = { router, authenticate, wrap, select };
