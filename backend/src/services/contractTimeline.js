const error = (message, status = 409) => { const err = new Error(message); err.status = status; throw err; };
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const dayBefore = date => new Date(Date.parse(date) - 86400000).toISOString().slice(0, 10);
const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const overlaps = (a, b) => a.start_date <= (b.end_date || '9999-12-31') && b.start_date <= (a.end_date || '9999-12-31');
const contractForDate = (contracts, date) => {
  const matches = contracts.filter(c => c.status === 'active' && c.start_date <= date && (!c.end_date || c.end_date >= date));
  if (matches.length > 1) error(`Overlapping contracts on ${date}. Resolve their dates before processing attendance.`);
  return matches[0] || null;
};

const planContractChange = ({ candidate, previous, others, group, isEditing, today = localToday() }) => {
  if (!validDate(candidate.start_date) || (candidate.end_date && !validDate(candidate.end_date))) error('Enter valid contract dates.', 400);
  if (candidate.end_date && candidate.end_date < candidate.start_date) error('Contract end date must be on or after its start date.', 400);
  if (group && (candidate.start_date < group.start_date || (group.end_date && (!candidate.end_date || candidate.end_date > group.end_date)))) error('Contract dates must be inside the selected group. Select or create a group covering the new period.', 400);
  if (group?.employee_id && Number(group.employee_id) !== Number(candidate.employee_id)) error('The selected group belongs to another employee.', 400);
  if (isEditing && previous?.status === 'active' && previous.start_date <= today) error('This contract has already started. Use Create Revision with an effective date to preserve its history.');
  let predecessorEnd;
  if (!isEditing && previous) {
    if (previous.status !== 'active' || Number(previous.employee_id) !== Number(candidate.employee_id)) error('Select an active predecessor belonging to this employee.', 400);
    if (candidate.status !== 'active') error('A revision must be active to replace its predecessor from the effective date.', 400);
    if (candidate.start_date <= previous.start_date) error('The revision must start after the previous contract starts.', 400);
    if (!previous.end_date || previous.end_date >= candidate.start_date) predecessorEnd = dayBefore(candidate.start_date);
  }
  if (candidate.status === 'active') {
    const conflict = others.find(c => c.status === 'active' && Number(c.id) !== Number(candidate.id) && Number(c.id) !== Number(previous?.id) && overlaps(c, candidate));
    if (conflict) error(`Dates overlap contract ${conflict.code || conflict.id}. Use Create Revision or choose non-overlapping dates.`);
  }
  return { predecessorEnd };
};
module.exports = { error, validDate, dayBefore, localToday, overlaps, contractForDate, planContractChange };
