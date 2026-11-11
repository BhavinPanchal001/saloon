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

export function getTalentNames(ids, staff = []) {
  return ids.map((id) => {
    const member = staff.find((s) => String(s.id) === String(id));
    return member?.name || member?.fullName || String(id);
  });
}
