export const formatCurrency = (value) => {
  const num = Number(value || 0);
  return `RM ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatRoleLabel = (role) => {
  if (role === "admin" || role === "super_admin") return "Super Admin";
  if (role === "cashier" || role === "pos") return "POS / Cashier";
  return "Outlet Manager";
};

export const getDefaultRouteForRole = (role) => {
  if (role === "cashier" || role === "pos") {
    return "/pos";
  }
  return "/dashboard";
};

export const slugFromName = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
