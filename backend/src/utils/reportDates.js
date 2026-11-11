const { Op } = require('sequelize');
function reportRange({ startDate, endDate, timeZone = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata' }) {
  const fail = (message) => { const error = new Error(message); error.status = 400; throw error; };
  const parse = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) fail('Report dates must use YYYY-MM-DD.');
    const day = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== value) fail('Invalid report date.');
    return day;
  };
  let formatter;
  try { formatter = new Intl.DateTimeFormat('en-GB', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { fail('Invalid business time zone.'); }
  const midnight = (day) => {
    const target = day.getTime(); let guess = target;
    for (let i = 0; i < 3; i++) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
      const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
      guess += target - asUTC;
    }
    return new Date(guess);
  };
  if (startDate && endDate && startDate > endDate) fail('Report start date must not be after the end date.');
  const range = {};
  if (startDate) range[Op.gte] = midnight(parse(startDate));
  if (endDate) { const next = parse(endDate); next.setUTCDate(next.getUTCDate() + 1); range[Op.lt] = midnight(next); }
  return { range, timeZone };
}
module.exports = { reportRange };
