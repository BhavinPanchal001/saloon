const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Customer, Appointment, Outlet, Service, Staff } = require('../models');

/**
 * Helper to find customer by varying phone formats (with/without country code, spaces, etc.)
 */
const findCustomerByPhone = async (phone) => {
  if (!phone) return null;
  const raw = String(phone).trim();
  const digits = raw.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

  const conditions = [
    { phone: raw },
    { phone: digits },
    { phone: `+${digits}` },
  ];

  if (last10 && last10.length >= 7) {
    conditions.push({ phone: { [Op.like]: `%${last10}` } });
  }

  return await Customer.findOne({
    where: {
      [Op.or]: conditions,
    },
  });
};

/**
 * Generate JWT for authenticated website customer (30-day expiry)
 */
const generateCustomerToken = (customer) => {
  return jwt.sign(
    {
      customerId: customer.id,
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      userType: 'customer',
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

/**
 * POST /api/customers/portal/auth/phone-login
 * Check if customer exists with phone and log them in, or return exists: false to prompt for name
 */
const loginCustomerWithPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const trimmedPhone = String(phone).trim();
    const customer = await findCustomerByPhone(trimmedPhone);

    if (!customer) {
      return res.json({
        success: true,
        exists: false,
        phone: trimmedPhone,
        message: 'No existing account found. Please provide your name to create one.',
      });
    }

    if (customer.status === 'inactive') {
      return res.status(403).json({ message: 'This customer account is deactivated. Please contact the salon.' });
    }

    const token = generateCustomerToken(customer);

    return res.json({
      success: true,
      exists: true,
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        loyalty_points: customer.loyalty_points || 0,
        total_visits: customer.total_visits || 0,
      },
    });
  } catch (err) {
    console.error('Customer portal login error:', err);
    return res.status(500).json({ message: 'Server error during phone authentication.' });
  }
};

/**
 * POST /api/customers/portal/auth/phone-register
 * Create a new customer profile for first-time website visitors
 */
const registerCustomerWithPhone = async (req, res) => {
  try {
    const { phone, name, email } = req.body;

    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Name is required to create your profile.' });
    }

    const trimmedPhone = String(phone).trim();
    const trimmedName = String(name).trim();
    const trimmedEmail = email ? String(email).trim() : null;

    // Check if customer already exists
    let customer = await findCustomerByPhone(trimmedPhone);

    if (customer) {
      // Update name/email if not previously set
      const updates = {};
      if (!customer.name && trimmedName) updates.name = trimmedName;
      if (!customer.email && trimmedEmail) updates.email = trimmedEmail;
      if (Object.keys(updates).length > 0) {
        await customer.update(updates);
      }
    } else {
      customer = await Customer.create({
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        status: 'active',
      });
    }

    const token = generateCustomerToken(customer);

    return res.status(201).json({
      success: true,
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        loyalty_points: customer.loyalty_points || 0,
        total_visits: customer.total_visits || 0,
      },
    });
  } catch (err) {
    console.error('Customer portal register error:', err);
    return res.status(500).json({ message: 'Server error registering customer profile.' });
  }
};

/**
 * GET /api/customers/portal/me
 * Fetch authenticated customer's profile & loyalty details
 */
const getCustomerProfile = async (req, res) => {
  try {
    const customerId = req.customer.customerId || req.customer.id;
    const customer = await Customer.findByPk(customerId, {
      attributes: [
        'id',
        'name',
        'phone',
        'email',
        'gender',
        'dob',
        'loyalty_points',
        'total_spend',
        'total_visits',
        'credit_balance',
        'status',
      ],
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer profile not found.' });
    }

    return res.json({ success: true, customer });
  } catch (err) {
    console.error('Customer profile fetch error:', err);
    return res.status(500).json({ message: 'Server error fetching customer profile.' });
  }
};

/**
 * GET /api/customers/portal/appointments
 * Fetch all appointments for authenticated customer (both by customer_id and phone match)
 */
const getCustomerAppointments = async (req, res) => {
  try {
    const customerId = req.customer.customerId || req.customer.id;
    const customerPhone = req.customer.phone;

    const digits = String(customerPhone || '').replace(/\D/g, '');
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

    const orConditions = [
      { customer_id: customerId },
    ];

    if (customerPhone) {
      orConditions.push({ customer_phone: customerPhone });
    }
    if (digits) {
      orConditions.push({ customer_phone: digits });
      orConditions.push({ customer_phone: `+${digits}` });
    }
    if (last10 && last10.length >= 7) {
      orConditions.push({ customer_phone: { [Op.like]: `%${last10}` } });
    }

    const appointments = await Appointment.findAll({
      where: {
        [Op.or]: orConditions,
      },
      include: [
        {
          model: Outlet,
          as: 'outlet',
          attributes: ['id', 'name', 'code', 'address', 'city', 'phone'],
        },
        {
          model: Service,
          as: 'service',
          attributes: ['id', 'service_name', 'price', 'duration'],
        },
        {
          model: Staff,
          as: 'staff',
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
      order: [
        ['appointment_date', 'DESC'],
        ['start_time', 'DESC'],
      ],
    });

    // Classify into upcoming and past for client convenience
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const upcoming = [];
    const past = [];

    appointments.forEach((apt) => {
      const isPastDate = apt.appointment_date < todayStr;
      const isCompletedOrCancelled = ['completed', 'cancelled', 'no_show'].includes(apt.status);

      if (isPastDate || isCompletedOrCancelled) {
        past.push(apt);
      } else {
        upcoming.push(apt);
      }
    });

    return res.json({
      success: true,
      all: appointments,
      upcoming,
      past,
    });
  } catch (err) {
    console.error('Customer appointments fetch error:', err);
    return res.status(500).json({ message: 'Server error fetching appointments.' });
  }
};

/**
 * POST /api/customers/portal/appointments/:id/cancel
 * Cancel an upcoming appointment
 */
const cancelCustomerAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const customerId = req.customer.customerId || req.customer.id;
    const customerPhone = req.customer.phone;
    const { reason } = req.body;

    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        { model: Outlet, as: 'outlet', attributes: ['id', 'name'] },
        { model: Service, as: 'service', attributes: ['id', 'service_name'] },
      ],
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // Verify ownership
    const digits = String(customerPhone || '').replace(/\D/g, '');
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    const aptPhoneDigits = String(appointment.customer_phone || '').replace(/\D/g, '');

    const isOwner =
      appointment.customer_id === customerId ||
      appointment.customer_phone === customerPhone ||
      (last10 && aptPhoneDigits.endsWith(last10));

    if (!isOwner) {
      return res.status(403).json({ message: 'You do not have permission to cancel this appointment.' });
    }

    // Can only cancel requested or confirmed appointments
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'This appointment is already cancelled.' });
    }
    if (appointment.status === 'completed') {
      return res.status(400).json({ message: 'Completed appointments cannot be cancelled.' });
    }

    const cancelNote = reason
      ? `[Cancelled by Customer: ${reason.trim()}]`
      : '[Cancelled by Customer from Website]';

    const updatedNotes = appointment.notes
      ? `${appointment.notes}\n${cancelNote}`
      : cancelNote;

    await appointment.update({
      status: 'cancelled',
      notes: updatedNotes,
    });

    return res.json({
      success: true,
      message: 'Appointment cancelled successfully.',
      appointment,
    });
  } catch (err) {
    console.error('Customer appointment cancellation error:', err);
    return res.status(500).json({ message: 'Server error cancelling appointment.' });
  }
};

module.exports = {
  loginCustomerWithPhone,
  registerCustomerWithPhone,
  getCustomerProfile,
  getCustomerAppointments,
  cancelCustomerAppointment,
};
