const { Appointment, Customer, Outlet, Staff, Service } = require('../models');
const { Op } = require('sequelize');

// GET /api/appointments
const getAppointments = async (req, res) => {
  try {
    const { outletId, date, staffId, status } = req.query;
    const where = {};

    if (outletId) where.outlet_id = outletId;
    if (date) where.appointment_date = date;
    if (staffId) where.staff_id = staffId;
    if (status) where.status = status;

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] },
        { model: Outlet, as: 'outlet', attributes: ['id', 'name', 'code'] },
        { model: Staff, as: 'staff', attributes: ['id', 'first_name', 'last_name'] },
        { model: Service, as: 'service', attributes: ['id', 'service_name', 'price', 'duration'] },
      ],
      order: [['appointment_date', 'ASC'], ['start_time', 'ASC']],
    });

    return res.json(appointments);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    return res.status(500).json({ message: 'Server error fetching appointments.' });
  }
};

// GET /api/appointments/:id
const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Outlet, as: 'outlet' },
        { model: Staff, as: 'staff' },
        { model: Service, as: 'service' },
      ],
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    return res.json(appointment);
  } catch (err) {
    console.error('Error fetching appointment:', err);
    return res.status(500).json({ message: 'Server error fetching appointment.' });
  }
};

// POST /api/appointments
const createAppointment = async (req, res) => {
  try {
    const {
      outletId,
      customerId,
      customerName,
      customerPhone,
      staffId,
      serviceId,
      appointmentDate,
      startTime,
      endTime,
      notes,
    } = req.body;

    const parsedOutletId = outletId ? Number(outletId) : null;
    const parsedStaffId = staffId && staffId !== '' ? Number(staffId) : null;
    const parsedServiceId = serviceId && serviceId !== '' ? Number(serviceId) : null;
    const parsedCustomerId = customerId && customerId !== '' ? Number(customerId) : null;

    if (!parsedOutletId || !customerName || !customerPhone || !appointmentDate || !startTime) {
      return res.status(400).json({
        message: 'outletId, customerName, customerPhone, appointmentDate, and startTime are required.',
      });
    }

    // Auto find or link customer if phone exists
    let finalCustomerId = parsedCustomerId;
    if (!finalCustomerId && customerPhone) {
      let customer = await Customer.findOne({ where: { phone: customerPhone.trim() } });
      if (!customer) {
        customer = await Customer.create({
          name: customerName.trim(),
          phone: customerPhone.trim(),
        });
      }
      finalCustomerId = customer.id;
    }

    const newAppointment = await Appointment.create({
      outlet_id: parsedOutletId,
      customer_id: finalCustomerId || null,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      staff_id: parsedStaffId || null,
      service_id: parsedServiceId || null,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTime || null,
      notes: notes ? notes.trim() : null,
      status: 'confirmed',
    });

    const appointment = await Appointment.findByPk(newAppointment.id, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] },
        { model: Outlet, as: 'outlet', attributes: ['id', 'name', 'code'] },
        { model: Staff, as: 'staff', attributes: ['id', 'first_name', 'last_name'] },
        { model: Service, as: 'service', attributes: ['id', 'service_name', 'price', 'duration'] },
      ],
    });

    return res.status(201).json(appointment);
  } catch (err) {
    console.error('Error creating appointment:', err);
    return res.status(500).json({ message: 'Server error creating appointment.' });
  }
};

// PATCH /api/appointments/:id/status
const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    await appointment.update({ status });
    return res.json(appointment);
  } catch (err) {
    console.error('Error updating appointment status:', err);
    return res.status(500).json({ message: 'Server error updating appointment status.' });
  }
};

// PUT /api/appointments/:id
const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const {
      outletId,
      customerId,
      customerName,
      customerPhone,
      staffId,
      serviceId,
      appointmentDate,
      startTime,
      endTime,
      notes,
      status,
    } = req.body;

    await appointment.update({
      outlet_id: outletId !== undefined ? outletId : appointment.outlet_id,
      customer_id: customerId !== undefined ? customerId : appointment.customer_id,
      customer_name: customerName !== undefined ? customerName : appointment.customer_name,
      customer_phone: customerPhone !== undefined ? customerPhone : appointment.customer_phone,
      staff_id: staffId !== undefined ? staffId : appointment.staff_id,
      service_id: serviceId !== undefined ? serviceId : appointment.service_id,
      appointment_date: appointmentDate !== undefined ? appointmentDate : appointment.appointment_date,
      start_time: startTime !== undefined ? startTime : appointment.start_time,
      end_time: endTime !== undefined ? endTime : appointment.end_time,
      notes: notes !== undefined ? notes : appointment.notes,
      status: status !== undefined ? status : appointment.status,
    });

    return res.json(appointment);
  } catch (err) {
    console.error('Error updating appointment:', err);
    return res.status(500).json({ message: 'Server error updating appointment.' });
  }
};

// DELETE /api/appointments/:id
const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    await appointment.destroy();
    return res.json({ message: 'Appointment deleted successfully.' });
  } catch (err) {
    console.error('Error deleting appointment:', err);
    return res.status(500).json({ message: 'Server error deleting appointment.' });
  }
};

module.exports = {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointmentStatus,
  updateAppointment,
  deleteAppointment,
};
