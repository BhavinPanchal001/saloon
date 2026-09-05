const { Appointment, Customer, Outlet, Staff, Service, Package } = require('../models');
const { Op } = require('sequelize');

// Helper to calculate end time from start time and duration
const calculateEndTime = (startTime, durationMinutes = 30) => {
  if (!startTime) return null;
  let hours = 0;
  let minutes = 0;
  const is12Hour = /am|pm/i.test(startTime);

  if (is12Hour) {
    const match = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
    }
  } else {
    const parts = startTime.split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
  }

  const totalMinutes = hours * 60 + minutes + Number(durationMinutes);
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;

  if (is12Hour) {
    const period = endHours >= 12 ? 'PM' : 'AM';
    const displayHours = endHours % 12 === 0 ? 12 : endHours % 12;
    return `${String(displayHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')} ${period}`;
  }

  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
};

// GET /api/appointments
const getAppointments = async (req, res) => {
  try {
    const { outletId, date, staffId, status, search, appointmentId } = req.query;
    const where = {};

    if (outletId) where.outlet_id = outletId;
    if (appointmentId) {
      where.id = appointmentId;
    } else if (date) {
      where.appointment_date = date;
    }
    if (staffId) where.staff_id = staffId;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { customer_name: { [Op.like]: `%${search}%` } },
        { customer_phone: { [Op.like]: `%${search}%` } },
      ];
    }

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

// POST /api/appointments (Internal / Admin)
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
      status,
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

    // Auto calculate endTime if not provided and serviceId exists
    let finalEndTime = endTime || null;
    if (!finalEndTime && parsedServiceId) {
      const srv = await Service.findByPk(parsedServiceId);
      if (srv && srv.duration) {
        finalEndTime = calculateEndTime(startTime, srv.duration);
      }
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
      end_time: finalEndTime,
      notes: notes ? notes.trim() : null,
      status: status || 'confirmed',
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

// POST /api/appointments/public (Public Booking from Website)
const createPublicAppointment = async (req, res) => {
  try {
    const {
      name,
      customerName,
      phone,
      customerPhone,
      email,
      service,
      serviceId,
      date,
      appointmentDate,
      time,
      startTime,
      notes,
      outletId,
    } = req.body;

    const finalName = (customerName || name || '').trim();
    const finalPhone = (customerPhone || phone || '').trim();
    const finalDate = appointmentDate || date;
    const finalTime = startTime || time;
    const finalEmail = email ? email.trim() : null;

    if (!finalName || !finalPhone || !finalDate || !finalTime) {
      return res.status(400).json({
        message: 'Name, phone number, date, and time are required.',
      });
    }

    // Resolve Outlet: if none provided, fallback to the first active outlet
    let targetOutletId = outletId ? Number(outletId) : null;
    if (!targetOutletId) {
      const activeOutlet = await Outlet.findOne({ where: { status: 'active' } }) || await Outlet.findOne();
      if (activeOutlet) {
        targetOutletId = activeOutlet.id;
      }
    }

    if (!targetOutletId) {
      return res.status(400).json({ message: 'No salon outlet available for booking.' });
    }

    // Find or resolve customer
    let customer = null;
    if (req.body.customerId) {
      customer = await Customer.findByPk(req.body.customerId);
    }

    if (!customer) {
      const cleanDigits = finalPhone.replace(/\D/g, '');
      const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
      const phoneConditions = [
        { phone: finalPhone },
        { phone: cleanDigits },
        { phone: `+${cleanDigits}` },
      ];
      if (last10 && last10.length >= 7) {
        phoneConditions.push({ phone: { [Op.like]: `%${last10}` } });
      }

      customer = await Customer.findOne({
        where: { [Op.or]: phoneConditions },
      });
    }

    if (!customer) {
      customer = await Customer.create({
        name: finalName,
        phone: finalPhone,
        email: finalEmail,
      });
    } else if (finalEmail && !customer.email) {
      await customer.update({ email: finalEmail });
    }


    // Resolve Service if passed by name or ID
    let parsedServiceId = serviceId ? Number(serviceId) : null;
    let serviceDuration = 45;
    let extraNotes = notes ? notes.trim() : '';

    if (!parsedServiceId && service) {
      const srv = await Service.findOne({
        where: {
          service_name: { [Op.like]: `%${service.trim()}%` },
        },
      });
      if (srv) {
        parsedServiceId = srv.id;
        serviceDuration = srv.duration || 45;
      } else {
        // If it's a package or custom service, record it in notes
        extraNotes = extraNotes ? `[Service: ${service}] ${extraNotes}` : `[Service: ${service}]`;
      }
    } else if (parsedServiceId) {
      const srv = await Service.findByPk(parsedServiceId);
      if (srv && srv.duration) serviceDuration = srv.duration;
    }

    const calculatedEndTime = calculateEndTime(finalTime, serviceDuration);

    const newAppointment = await Appointment.create({
      outlet_id: targetOutletId,
      customer_id: customer.id,
      customer_name: finalName,
      customer_phone: finalPhone,
      staff_id: null,
      service_id: parsedServiceId || null,
      appointment_date: finalDate,
      start_time: finalTime,
      end_time: calculatedEndTime,
      notes: extraNotes || null,
      status: 'requested',
    });

    const appointment = await Appointment.findByPk(newAppointment.id, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] },
        { model: Outlet, as: 'outlet', attributes: ['id', 'name', 'code'] },
        { model: Service, as: 'service', attributes: ['id', 'service_name', 'price', 'duration'] },
      ],
    });

    return res.status(201).json({
      message: 'Appointment reserved successfully!',
      appointment,
    });
  } catch (err) {
    console.error('Error creating public appointment:', err);
    return res.status(500).json({ message: 'Server error processing your reservation.' });
  }
};

// GET /api/appointments/public/services (Fetch available services and outlets for booking form)
const getPublicServicesAndOutlets = async (req, res) => {
  try {
    const [services, outlets, packages] = await Promise.all([
      Service.findAll({
        where: { status: 'active' },
        attributes: ['id', 'service_name', 'price', 'duration', 'category_id'],
        order: [['service_name', 'ASC']],
      }),
      Outlet.findAll({
        where: { status: 'active' },
        attributes: ['id', 'name', 'code', 'city', 'state'],
      }),
      Package ? Package.findAll({
        where: { status: 'active' },
        attributes: ['id', 'name', 'price', 'description'],
      }).catch(() => []) : [],
    ]);

    return res.json({
      services: services.map(s => ({
        id: s.id,
        name: s.service_name,
        price: Number(s.price),
        duration: s.duration,
      })),
      packages: (packages || []).map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
      })),
      outlets: outlets.map(o => ({
        id: o.id,
        name: o.name,
        city: o.city,
      })),
    });
  } catch (err) {
    console.error('Error fetching public services:', err);
    return res.status(500).json({ message: 'Server error fetching booking options.' });
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
  createPublicAppointment,
  getPublicServicesAndOutlets,
  updateAppointmentStatus,
  updateAppointment,
  deleteAppointment,
};
