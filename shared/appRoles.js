export const APP_ROLES = [
  { value: 'manager', label: 'Outlet Manager', permissions: ['pos:view', 'pos:create', 'inventory:view', 'inventory:manage', 'services:view', 'services:manage', 'expenses:view', 'expenses:create'] },
  { value: 'cashier', label: 'Cashier / POS Operator', permissions: ['pos:view', 'pos:create'] },
  { value: 'admin', label: 'Admin', permissions: ['*'] },
  { value: 'super_admin', label: 'Super Admin', permissions: ['*'] },
];

export const getAppRole = value => APP_ROLES.find(role => role.value === value);
export const toAppRoleValue = value => {
  const normalized = String(value || '').trim().toLowerCase();
  return APP_ROLES.find(role => role.value === normalized || role.label.toLowerCase() === normalized)?.value || '';
};
