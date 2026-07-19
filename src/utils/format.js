export const formatCurrency = (value) => {
  const num = Number(value || 0);
  return `RM ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatRoleLabel = (role) =>
  role === "admin" || role === "super_admin" ? "Super Admin" : "Outlet Manager";

export const getDefaultRouteForRole = (role) =>
  "/dashboard";

export const slugFromName = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
