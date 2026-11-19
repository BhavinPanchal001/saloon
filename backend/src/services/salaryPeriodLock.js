const { SalaryCalculation } = require('../models');
const { Op } = require('sequelize');
const { validDate } = require('./leaveValidation');
async function assertSalaryPeriodOpen(staffId, dates, transaction) {
  const months = [...new Set(dates.filter(validDate).map(d => d.slice(0, 7)))];
  if (!months.length) return;
  const finalized = await SalaryCalculation.findOne({ where: { staff_id: staffId, month_key: { [Op.in]: months }, status: 'finalized' }, transaction });
  if (finalized) { const error = new Error(`Salary for ${finalized.month_key} is finalized. Attendance and leave for that period are locked.`); error.status = 409; throw error; }
}
module.exports = { assertSalaryPeriodOpen };
