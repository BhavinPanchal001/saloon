const { Staff, Attendance, Role, Contract, Outlet } = require('../models');
const { Op } = require('sequelize');

// Helper to format timestamp to HH:MM format or similar
const formatTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Helper to verify if staff member has an active contract for a given date
const isContractActive = (staff, dateStr) => {
  if (!staff.contracts || staff.contracts.length === 0) return false;
  return staff.contracts.some((c) => {
    if (c.status !== 'active') return false;
    if (dateStr) {
      if (c.start_date && c.start_date > dateStr) return false;
      if (c.end_date && c.end_date < dateStr) return false;
    }
    return true;
  });
};

// Helper to check active contract in database for staff
const checkStaffContract = async (staffId, dateStr) => {
  const staff = await Staff.findByPk(staffId, {
    include: [{ model: Contract, as: 'contracts' }]
  });
  if (!staff) return false;
  return isContractActive(staff, dateStr);
};

module.exports = {
  async fetchAttendance(req, res) {
    try {
      const dateStr = req.query.date || new Date().toISOString().split('T')[0];
      const outletId = req.query.outletId;

      // Filter staff by assigned outlet
      const staffQuery = {
        onboarding_status: 'approved',
      };
      if (outletId && outletId !== 'undefined' && outletId !== 'null') {
        staffQuery.assigned_outlet_id = outletId;
      }

      const staffList = await Staff.findAll({
        where: staffQuery,
        include: [
          { model: Role, as: 'role' },
          { model: Contract, as: 'contracts' },
          { model: Outlet, as: 'outlet' }
        ],
      });

      const staffIds = staffList.map(s => s.id);

      const attendanceRecords = await Attendance.findAll({
        where: {
          date: dateStr,
          staff_id: { [Op.in]: staffIds }
        }
      });

      const response = staffList.map(staff => {
        const record = attendanceRecords.find(r => r.staff_id === staff.id);
        const name = staff.name || `${staff.first_name} ${staff.last_name}`;
        const hasActiveContract = isContractActive(staff, dateStr);

        return {
          id: staff.id.toString(),
          name,
          first_name: staff.first_name,
          last_name: staff.last_name,
          role: staff.role?.name || 'Staff',
          assignedOutletId: staff.assigned_outlet_id ? `outlet_${staff.assigned_outlet_id}` : null,
          assignedOutletName: staff.outlet ? staff.outlet.name : undefined,
          attendanceStatus: record ? record.status : 'not_marked',
          checkIn: record?.check_in || null,
          checkOut: record?.check_out || null,
          breaks: record?.breaks || [],
          hasActiveContract,
          contractStatus: hasActiveContract ? 'active' : (staff.contracts && staff.contracts.length > 0 ? staff.contracts[0].status : 'no_contract'),
        };
      });

      return res.json(response);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  },

  async fetchAttendanceSummary(req, res) {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const month = parseInt(req.query.month) || (new Date().getMonth() + 1); // 1-12
      const outletId = req.query.outletId;

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Fetch active staff
      const staffQuery = {
        onboarding_status: 'approved',
      };
      if (outletId && outletId !== 'undefined' && outletId !== 'null') {
        staffQuery.assigned_outlet_id = outletId;
      }

      const staffList = await Staff.findAll({
        where: staffQuery,
        include: [{ model: Role, as: 'role' }],
      });

      const staffIds = staffList.map(s => s.id);

      // Fetch all attendance records for the month
      const records = await Attendance.findAll({
        where: {
          date: {
            [Op.between]: [startDate, endDate]
          },
          staff_id: {
            [Op.in]: staffIds
          }
        }
      });

      // Prepare day-by-day counts dictionary
      const monthlyData = {};

      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isWeekend = [0, 6].includes(new Date(year, month - 1, day).getDay());

        const dayRecords = records.filter(r => r.date === dateStr);

        const presentEmployees = [];
        const absentEmployees = [];
        const halfDayEmployees = [];
        const paidLeaveEmployees = [];

        staffList.forEach(staff => {
          const rec = dayRecords.find(r => r.staff_id === staff.id);
          const name = staff.name || `${staff.first_name} ${staff.last_name}`;
          // Strip photo data from summary — calendar only needs timestamps
          const stripPhoto = (obj) => {
            if (!obj) return null;
            const { photo, ...rest } = obj;
            return rest;
          };
          const checkIn = rec?.check_in ? stripPhoto(rec.check_in) : null;
          const checkOut = rec?.check_out ? stripPhoto(rec.check_out) : null;
          const breaks = rec?.breaks
            ? rec.breaks.map(b => {
                const { photo, outPhoto, ...rest } = b;
                return rest;
              })
            : [];
          const staffObj = {
            id: staff.id.toString(),
            name,
            role: staff.role?.name || 'Staff',
            checkIn,
            checkOut,
            breaks,
          };

          if (rec) {
            if (rec.status === 'present') presentEmployees.push(staffObj);
            else if (rec.status === 'half_day') halfDayEmployees.push(staffObj);
            else if (rec.status === 'paid_leave') paidLeaveEmployees.push(staffObj);
            else if (rec.status === 'absent') absentEmployees.push(staffObj);
          } else {
            // Default is absent for working days if not marked, or not marked
            if (!isWeekend) {
              absentEmployees.push(staffObj);
            }
          }
        });

        monthlyData[dateStr] = {
          present: presentEmployees.length,
          absent: absentEmployees.length,
          halfDay: halfDayEmployees.length,
          paidLeave: paidLeaveEmployees.length,
          presentEmployees,
          absentEmployees,
          halfDayEmployees,
          paidLeaveEmployees,
          isWeekend,
          isHoliday: false,
        };
      }

      return res.json(monthlyData);
    } catch (err) {
      console.error('Error fetching attendance summary:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  },

  async markAttendance(req, res) {
    try {
      const { staffId, date, status } = req.body;

      if (!staffId || !date || !status) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const activeContract = await checkStaffContract(staffId, date);
      if (!activeContract) {
        return res.status(400).json({ message: 'Attendance can only be recorded for staff with an active contract.' });
      }

      const [record, created] = await Attendance.findOrCreate({
        where: { staff_id: staffId, date },
        defaults: {
          status,
          check_in: null,
          check_out: null,
          breaks: []
        }
      });

      if (!created) {
        record.status = status;
        await record.save();
      }

      return res.json({ success: true, record });
    } catch (err) {
      console.error('Error marking attendance:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  },

  async checkIn(req, res) {
    try {
      const { staffId, date, photoData } = req.body;

      if (!staffId || !date) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const activeContract = await checkStaffContract(staffId, date);
      if (!activeContract) {
        return res.status(400).json({ message: 'Attendance can only be recorded for staff with an active contract.' });
      }

      const timestamp = new Date().toISOString();

      const [record, created] = await Attendance.findOrCreate({
        where: { staff_id: staffId, date },
        defaults: {
          status: 'present',
          check_in: { timestamp, photo: photoData || null },
          check_out: null,
          breaks: []
        }
      });

      if (!created) {
        record.check_in = { timestamp, photo: photoData || null };
        record.status = 'present';
        await record.save();
      }

      return res.json({ success: true, timestamp, record });
    } catch (err) {
      console.error('Error checking in:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  },

  async checkOut(req, res) {
    try {
      const { staffId, date, photoData } = req.body;

      if (!staffId || !date) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const activeContract = await checkStaffContract(staffId, date);
      if (!activeContract) {
        return res.status(400).json({ message: 'Attendance can only be recorded for staff with an active contract.' });
      }

      const timestamp = new Date().toISOString();

      const [record, created] = await Attendance.findOrCreate({
        where: { staff_id: staffId, date },
        defaults: {
          status: 'present',
          check_in: null,
          check_out: { timestamp, photo: photoData || null },
          breaks: []
        }
      });

      if (!created) {
        record.check_out = { timestamp, photo: photoData || null };
        await record.save();
      }

      return res.json({ success: true, timestamp, record });
    } catch (err) {
      console.error('Error checking out:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  },

  async breakIn(req, res) {
    try {
      const { staffId, date, photoData } = req.body;

      if (!staffId || !date) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const activeContract = await checkStaffContract(staffId, date);
      if (!activeContract) {
        return res.status(400).json({ message: 'Attendance can only be recorded for staff with an active contract.' });
      }

      const timestamp = new Date().toISOString();

      const [record, created] = await Attendance.findOrCreate({
        where: { staff_id: staffId, date },
        defaults: {
          status: 'present',
          check_in: null,
          check_out: null,
          breaks: [{ in: timestamp, out: null, photo: photoData || null }]
        }
      });

      if (!created) {
        const breaks = record.breaks || [];
        breaks.push({ in: timestamp, out: null, photo: photoData || null });
        record.breaks = breaks;
        await record.save();
      }

      return res.json({ success: true, timestamp, record });
    } catch (err) {
      console.error('Error registering break in:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  },

  async breakOut(req, res) {
    try {
      const { staffId, date, photoData } = req.body;

      if (!staffId || !date) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const activeContract = await checkStaffContract(staffId, date);
      if (!activeContract) {
        return res.status(400).json({ message: 'Attendance can only be recorded for staff with an active contract.' });
      }

      const timestamp = new Date().toISOString();
      const record = await Attendance.findOne({ where: { staff_id: staffId, date } });

      if (!record) {
        return res.status(404).json({ message: 'Attendance record not found.' });
      }

      const breaks = record.breaks || [];
      const lastBreak = breaks[breaks.length - 1];
      if (lastBreak && !lastBreak.out) {
        lastBreak.out = timestamp;
        lastBreak.outPhoto = photoData || null;
        record.breaks = breaks;
        await record.save();
      }

      return res.json({ success: true, timestamp, record });
    } catch (err) {
      console.error('Error registering break out:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  },
};
