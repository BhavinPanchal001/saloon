const { Staff, Attendance, Role, Contract, Outlet, Shift, WorkWeek } = require('../models');
const { Op } = require('sequelize');

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper to format timestamp to HH:MM format
const formatTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Helper to find the active contract for a staff member on a specific date
const getActiveContractForDate = (staff, dateStr) => {
  if (!staff || !staff.contracts || staff.contracts.length === 0) return null;
  return staff.contracts.find((c) => {
    if (c.status !== 'active') return false;
    if (dateStr) {
      if (c.start_date && c.start_date > dateStr) return false;
      if (c.end_date && c.end_date < dateStr) return false;
    }
    return true;
  }) || null;
};

// Helper to extract full contract details, shift, work week and working day status
const getStaffContractDetails = (staff, dateStr) => {
  const activeContract = getActiveContractForDate(staff, dateStr);
  if (!activeContract) {
    return {
      hasActiveContract: false,
      activeContract: null,
      shift: null,
      workWeek: null,
      isWorkingDay: false,
      isWeeklyOff: false,
      contractStatus: staff && staff.contracts && staff.contracts.length > 0 ? staff.contracts[0].status : 'no_contract',
    };
  }

  const shift = activeContract.shift || null;
  const workWeek = activeContract.workWeek || null;

  // Determine if dateStr is scheduled working day or weekly off
  let isWorkingDay = true;
  if (dateStr) {
    const dayOfWeek = dayNames[new Date(dateStr).getDay()];
    if (workWeek && Array.isArray(workWeek.operational_days) && workWeek.operational_days.length > 0) {
      isWorkingDay = workWeek.operational_days.includes(dayOfWeek);
    } else {
      isWorkingDay = ![0, 6].includes(new Date(dateStr).getDay());
    }
  }

  return {
    hasActiveContract: true,
    activeContract,
    shift,
    workWeek,
    isWorkingDay,
    isWeeklyOff: !isWorkingDay,
    contractStatus: 'active',
  };
};

// Helper to check active contract in database for staff
const checkStaffContract = async (staffId, dateStr) => {
  const staff = await Staff.findByPk(staffId, {
    include: [
      {
        model: Contract,
        as: 'contracts',
        include: [
          { model: Shift, as: 'shift' },
          { model: WorkWeek, as: 'workWeek' }
        ]
      }
    ]
  });
  if (!staff) return { hasActiveContract: false, activeContract: null };
  return getStaffContractDetails(staff, dateStr);
};

module.exports = {
  async fetchAttendance(req, res) {
    try {
      const dateStr = req.query.date || new Date().toISOString().split('T')[0];
      const outletId = req.query.outletId;
      const activeOnly = req.query.activeContractOnly === 'true';

      const staffQuery = {};
      if (outletId && outletId !== 'undefined' && outletId !== 'null') {
        staffQuery.assigned_outlet_id = outletId;
      }

      const staffList = await Staff.findAll({
        where: staffQuery,
        include: [
          { model: Role, as: 'role' },
          {
            model: Contract,
            as: 'contracts',
            include: [
              { model: Shift, as: 'shift' },
              { model: WorkWeek, as: 'workWeek' }
            ]
          },
          { model: Outlet, as: 'outlet' }
        ],
        order: [['first_name', 'ASC']]
      });

      const staffIds = staffList.map(s => s.id);

      const attendanceRecords = await Attendance.findAll({
        where: {
          date: dateStr,
          staff_id: { [Op.in]: staffIds }
        }
      });

      let response = staffList.map(staff => {
        const record = attendanceRecords.find(r => r.staff_id === staff.id);
        const name = staff.name || `${staff.first_name} ${staff.last_name}`;
        const contractDetails = getStaffContractDetails(staff, dateStr);
        const { hasActiveContract, activeContract, shift, workWeek, isWorkingDay, isWeeklyOff } = contractDetails;

        // Default status: if not marked in DB, and has active contract on weekly off, default is weekly_off
        const attendanceStatus = record ? record.status : (hasActiveContract && isWeeklyOff ? 'weekly_off' : 'not_marked');

        return {
          id: staff.id.toString(),
          name,
          first_name: staff.first_name,
          last_name: staff.last_name,
          role: staff.role?.name || 'Staff',
          assignedOutletId: staff.assigned_outlet_id ? `outlet_${staff.assigned_outlet_id}` : null,
          assignedOutletName: staff.outlet ? staff.outlet.name : undefined,
          attendanceStatus,
          checkIn: record?.check_in || null,
          checkOut: record?.check_out || null,
          breaks: record?.breaks || [],
          hasActiveContract,
          contractStatus: contractDetails.contractStatus,
          contractCode: activeContract?.code || null,
          contractTitle: activeContract?.title || null,
          shiftName: shift ? shift.name : null,
          shiftStartTime: shift ? shift.start_time : null,
          shiftEndTime: shift ? shift.end_time : null,
          gracePeriod: shift ? shift.grace_period : 15,
          breakDuration: shift ? shift.break_duration : 60,
          workWeekName: workWeek ? workWeek.name : null,
          operationalDays: workWeek ? workWeek.operational_days : [],
          isWorkingDay,
          isWeeklyOff,
        };
      });

      if (activeOnly) {
        response = response.filter(s => s.hasActiveContract);
      }

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
      const todayDateStr = new Date().toISOString().split('T')[0];

      // Fetch staff with contracts, shifts, and work weeks
      const staffQuery = {};
      if (outletId && outletId !== 'undefined' && outletId !== 'null') {
        staffQuery.assigned_outlet_id = outletId;
      }

      const staffList = await Staff.findAll({
        where: staffQuery,
        include: [
          { model: Role, as: 'role' },
          {
            model: Contract,
            as: 'contracts',
            include: [
              { model: Shift, as: 'shift' },
              { model: WorkWeek, as: 'workWeek' }
            ]
          }
        ],
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

      const stripBreaks = (b) => {
        if (!b) return null;
        const { photo, outPhoto, ...rest } = b;
        return rest;
      };
      const stripPhoto = (obj) => {
        if (!obj) return null;
        const { photo, ...rest } = obj;
        return rest;
      };

      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isWeekend = [0, 6].includes(new Date(year, month - 1, day).getDay());
        const isPastOrToday = dateStr <= todayDateStr;

        const dayRecords = records.filter(r => r.date === dateStr);

        const presentEmployees = [];
        const absentEmployees = [];
        const halfDayEmployees = [];
        const paidLeaveEmployees = [];
        const weeklyOffEmployees = [];

        staffList.forEach(staff => {
          const contractDetails = getStaffContractDetails(staff, dateStr);

          // If staff does NOT have an active contract on this date, skip from attendance tracking
          if (!contractDetails.hasActiveContract) {
            return;
          }

          const rec = dayRecords.find(r => r.staff_id === staff.id);
          const name = staff.name || `${staff.first_name} ${staff.last_name}`;

          const checkIn = rec?.check_in ? stripPhoto(rec.check_in) : null;
          const checkOut = rec?.check_out ? stripPhoto(rec.check_out) : null;
          const breaks = rec?.breaks ? rec.breaks.map(stripBreaks) : [];

          const staffObj = {
            id: staff.id.toString(),
            name,
            role: staff.role?.name || 'Staff',
            shiftName: contractDetails.shift?.name || '',
            shiftStartTime: contractDetails.shift?.start_time || null,
            shiftEndTime: contractDetails.shift?.end_time || null,
            isWeeklyOff: contractDetails.isWeeklyOff,
            checkIn,
            checkOut,
            breaks,
          };

          if (rec) {
            if (rec.status === 'present') presentEmployees.push(staffObj);
            else if (rec.status === 'half_day') halfDayEmployees.push(staffObj);
            else if (rec.status === 'paid_leave') paidLeaveEmployees.push(staffObj);
            else if (rec.status === 'weekly_off') weeklyOffEmployees.push(staffObj);
            else if (rec.status === 'absent') absentEmployees.push(staffObj);
          } else {
            // According to contract:
            if (contractDetails.isWeeklyOff) {
              weeklyOffEmployees.push(staffObj);
            } else if (isPastOrToday) {
              // Working day on contract and past date without record -> absent
              absentEmployees.push(staffObj);
            }
          }
        });

        monthlyData[dateStr] = {
          present: presentEmployees.length,
          absent: absentEmployees.length,
          halfDay: halfDayEmployees.length,
          paidLeave: paidLeaveEmployees.length,
          weeklyOff: weeklyOffEmployees.length,
          presentEmployees,
          absentEmployees,
          halfDayEmployees,
          paidLeaveEmployees,
          weeklyOffEmployees,
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

      const contractDetails = await checkStaffContract(staffId, date);
      if (!contractDetails.hasActiveContract) {
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

      const contractDetails = await checkStaffContract(staffId, date);
      if (!contractDetails.hasActiveContract) {
        return res.status(400).json({ message: 'Attendance can only be recorded for staff with an active contract.' });
      }

      const timestamp = new Date().toISOString();
      const shift = contractDetails.shift;

      // Punctuality check according to contract shift
      let isLate = false;
      let lateMinutes = 0;
      if (shift && shift.start_time) {
        const [shiftHour, shiftMin] = shift.start_time.split(':').map(Number);
        const shiftStartMins = shiftHour * 60 + shiftMin;
        const gracePeriod = Number(shift.grace_period || 0);

        const checkInDate = new Date();
        const checkInMins = checkInDate.getHours() * 60 + checkInDate.getMinutes();

        if (checkInMins > shiftStartMins + gracePeriod) {
          isLate = true;
          lateMinutes = checkInMins - shiftStartMins;
        }
      }

      const checkInPayload = {
        timestamp,
        photo: photoData || null,
        shiftName: shift?.name || null,
        shiftStartTime: shift?.start_time || null,
        isLate,
        lateMinutes,
      };

      const [record, created] = await Attendance.findOrCreate({
        where: { staff_id: staffId, date },
        defaults: {
          status: 'present',
          check_in: checkInPayload,
          check_out: null,
          breaks: []
        }
      });

      if (!created) {
        record.check_in = checkInPayload;
        record.status = 'present';
        await record.save();
      }

      return res.json({ success: true, timestamp, record, isLate, lateMinutes });
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

      const contractDetails = await checkStaffContract(staffId, date);
      if (!contractDetails.hasActiveContract) {
        return res.status(400).json({ message: 'Attendance can only be recorded for staff with an active contract.' });
      }

      const timestamp = new Date().toISOString();
      const shift = contractDetails.shift;

      // Early departure check according to contract shift
      let isEarlyCheckout = false;
      let earlyMinutes = 0;
      if (shift && shift.end_time) {
        const [shiftHour, shiftMin] = shift.end_time.split(':').map(Number);
        const shiftEndMins = shiftHour * 60 + shiftMin;

        const checkOutDate = new Date();
        const checkOutMins = checkOutDate.getHours() * 60 + checkOutDate.getMinutes();

        if (checkOutMins < shiftEndMins) {
          isEarlyCheckout = true;
          earlyMinutes = shiftEndMins - checkOutMins;
        }
      }

      const checkOutPayload = {
        timestamp,
        photo: photoData || null,
        shiftName: shift?.name || null,
        shiftEndTime: shift?.end_time || null,
        isEarlyCheckout,
        earlyMinutes,
      };

      const [record, created] = await Attendance.findOrCreate({
        where: { staff_id: staffId, date },
        defaults: {
          status: 'present',
          check_in: null,
          check_out: checkOutPayload,
          breaks: []
        }
      });

      if (!created) {
        record.check_out = checkOutPayload;
        await record.save();
      }

      return res.json({ success: true, timestamp, record, isEarlyCheckout, earlyMinutes });
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

      const contractDetails = await checkStaffContract(staffId, date);
      if (!contractDetails.hasActiveContract) {
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

      const contractDetails = await checkStaffContract(staffId, date);
      if (!contractDetails.hasActiveContract) {
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
