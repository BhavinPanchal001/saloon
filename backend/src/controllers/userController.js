const bcrypt = require('bcryptjs');
const { Admin, Outlet, sequelize } = require('../models');

// Helper to ensure admins table role & outlet_id columns exist & support custom roles
let roleColumnAltered = false;
const ensureColumnsFlexible = async () => {
  if (roleColumnAltered) return;
  try {
    await sequelize.query("ALTER TABLE admins MODIFY COLUMN role VARCHAR(50) DEFAULT 'admin'");
  } catch {}
  try {
    await sequelize.query("ALTER TABLE admins ADD COLUMN outlet_id INT UNSIGNED NULL");
  } catch {}
  roleColumnAltered = true;
};

// GET /api/users — List all app users
const getUsers = async (req, res) => {
  try {
    await ensureColumnsFlexible();
    const { search, role, outletId } = req.query;

    const where = {};
    if (role && role !== 'all') {
      where.role = role;
    }
    if (outletId && outletId !== 'all') {
      where.outlet_id = outletId;
    }

    const users = await Admin.findAll({
      where,
      attributes: { exclude: ['password', 'otp_code', 'totp_secret'] },
      include: [
        {
          model: Outlet,
          as: 'outlet',
          attributes: ['id', 'name', 'code'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Search filtering
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.role && u.role.toLowerCase().includes(q))
      );
    }

    return res.json(result);
  } catch (err) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ message: 'Server error while fetching users.' });
  }
};

// GET /api/users/:id — Get single user
const getUserById = async (req, res) => {
  try {
    await ensureColumnsFlexible();
    const { id } = req.params;
    const user = await Admin.findByPk(id, {
      attributes: { exclude: ['password', 'otp_code', 'totp_secret'] },
      include: [{ model: Outlet, as: 'outlet' }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/users — Create new app user
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, outlet_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await Admin.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    await ensureColumnsFlexible();

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await Admin.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'admin',
      outlet_id: outlet_id ? Number(outlet_id) : null,
      is_active: true,
    });

    const createdUser = await Admin.findByPk(newUser.id, {
      attributes: { exclude: ['password', 'otp_code', 'totp_secret'] },
      include: [{ model: Outlet, as: 'outlet', attributes: ['id', 'name', 'code'] }],
    });

    return res.status(201).json(createdUser);
  } catch (err) {
    console.error('Error creating user:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/users/:id — Update app user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, outlet_id, is_active } = req.body;

    const user = await Admin.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await ensureColumnsFlexible();

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existing = await Admin.findOne({ where: { email: normalizedEmail } });
        if (existing) {
          return res.status(400).json({ message: 'Email is already in use by another user.' });
        }
        updateData.email = normalizedEmail;
      }
    }
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (role) {
      updateData.role = role;
    }
    if (outlet_id !== undefined) {
      updateData.outlet_id = outlet_id ? Number(outlet_id) : null;
    }
    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active);
    }

    await user.update(updateData);

    const updatedUser = await Admin.findByPk(id, {
      attributes: { exclude: ['password', 'otp_code', 'totp_secret'] },
      include: [{ model: Outlet, as: 'outlet', attributes: ['id', 'name', 'code'] }],
    });

    return res.json(updatedUser);
  } catch (err) {
    console.error('Error updating user:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// PATCH /api/users/:id/toggle-status — Activate/deactivate user
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Admin.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await user.update({ is_active: !user.is_active });

    return res.json({
      message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully.`,
      is_active: user.is_active,
    });
  } catch (err) {
    console.error('Error toggling user status:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /api/users/:id — Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user && String(req.user.id) === String(id)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const user = await Admin.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await user.destroy();
    return res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
};
