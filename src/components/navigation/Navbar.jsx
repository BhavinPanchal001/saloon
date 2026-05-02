import { LogOut, Menu, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

const pageTitles = {
  "/dashboard/global": "Global Dashboard",
  "/dashboard/outlet": "Outlet Dashboard",
  "/outlets": "Outlet Directory",
  "/inventory": "Inventory & Purchase Orders",
  "/services": "Service Catalog",
  "/packages": "Package Directory",
  "/staff": "Employee Management",
  "/pos": "Point of Sale",
  "/expenses": "Expense Control",
  "/expenses/local": "Local Expense Control",
  "/payroll": "Payroll Center",
};

export function Navbar({ onOpenSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  let pageTitle = pageTitles[location.pathname] || "Glowy";

  if (location.pathname === "/packages/new") {
    pageTitle = "Create Package";
  } else if (location.pathname.startsWith("/packages/") && location.pathname.endsWith("/edit")) {
    pageTitle = "Edit Package";
  } else if (location.pathname.startsWith("/packages/")) {
    pageTitle = "Package Profile";
  } else if (location.pathname === "/staff/add") {
    pageTitle = "Add New Employee";
  } else if (location.pathname.startsWith("/staff/edit/")) {
    pageTitle = "Edit Employee";
  } else if (location.pathname.startsWith("/staff/") && location.pathname !== "/staff") {
    pageTitle = "Employee Profile";
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-cream/70 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 md:hidden"
            onClick={onOpenSidebar}
          >
            <Menu size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-gold-600">
              <Sparkles size={14} />
              Salon OS
            </div>
            <h2 className="mt-1 text-2xl text-ink">{pageTitle}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-right shadow-sm md:block">
            <p className="text-sm font-semibold text-ink">{user?.email}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">
              {user?.outlet_id ? `Outlet ${user.outlet_id.replace("outlet_", "")}` : "All outlets"}
            </p>
          </div>
          <button type="button" className="btn-secondary gap-2" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
