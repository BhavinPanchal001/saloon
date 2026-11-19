// Keep legacy bills readable while new bills retain stable staff IDs.
export function getTalentIds(item, staff = []) {
  const values = Array.isArray(item.staffIds)
    ? item.staffIds
    : item.staffAssigned ? [item.staffAssigned] : [];
  return [...new Set(values.filter(Boolean).map((value) => {
    const member = staff.find((s) => String(s.id) === String(value))
      || staff.find((s) => (s.name || s.fullName) === value);
    return String(member?.id ?? value);
  }))];
}

export function splitTalentEffort(ids) {
  if (ids.length === 0) return [];
  const share = Math.floor(10000 / ids.length);
  const remainder = 10000 % ids.length;
  return ids.map((staffId, index) => ({ staffId, percentage: (share + Number(index < remainder)) / 100 }));
}

export function getTalentEffort(item, staff = []) {
  // Saved effort already has stable IDs. Resolve names only for legacy assignments.
  return item.staffEffort ?? splitTalentEffort(getTalentIds(item, staff));
}

export function isTalentEffortValid(assignments) {
  if (assignments.length === 0) return true;
  let total = 0;
  for (const { percentage } of assignments) {
    if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(String(percentage))) return false;
    const value = Number(percentage);
    if (value > 100) return false;
    total += Math.round(value * 100);
  }
  return total === 10000;
}

export function serializeTalentEffort(item, staff) {
  const staffEffort = getTalentEffort(item, staff).map(({ staffId, percentage }) => ({ staffId, percentage: Number(percentage) }));
  const staffIds = staffEffort.map(({ staffId }) => staffId);
  const originalIds = getTalentIds(item, staff);
  const unchanged = staffIds.length === originalIds.length && staffIds.every((id, index) => id === originalIds[index]);
  const missingName = staffIds.some((id) => !staff.some((member) => String(member.id) === id));
  return {
    staffIds,
    staffAssigned: (unchanged && missingName && item.staffAssigned) || getTalentNames(staffIds, staff).join(', ') || null,
    staffEffort,
  };
}

export function getTalentNames(ids, staff = []) {
  return ids.map((id) => {
    const member = staff.find((s) => String(s.id) === String(id));
    return member?.name || member?.fullName || String(id);
  });
}
