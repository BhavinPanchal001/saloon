export const formatCurrency = (value) => {
  const formatted = new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
  // Replace 'RM' with 'RM ' to ensure a space
  return formatted.replace("RM", "RM ");
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
