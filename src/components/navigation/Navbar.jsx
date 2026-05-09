import { useEffect, useState } from "react";
import { LogOut, Menu, Sparkles, Bell, Settings, User } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useToastStore } from "../../stores/toastStore";
import { ConfirmModal } from "../ui/Modal";
import { fetchOutlets } from "../../services/mockApi";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/outlets": "Outlet Directory",
  "/inventory": "Inventory & Purchase Orders",
  "/services": "Service Catalog",
  "/services/add": "Add Service",
  "/services/edit/:id": "Edit Service",
  "/services/categories": "Service Categories",
  "/packages": "Package Directory",
  "/staff": "Employee Management",
  "/attendance": "Attendance Tracking",
  "/pos": "Point of Sale",
  "/pos/bills": "Billing History",
  "/expenses": "Expense Control",
  "/expenses/local": "Local Expense Control",
  "/budgets": "Budget Management",
  "/payroll": "Payroll Center",
  "/payroll/calculate": "Salary Calculation",
  "/contracts": "Contracts",
  "/contracts/list": "Contract List",
  "/contracts/new": "New Contract",
  "/contracts/groups": "Contract Groups",
  "/contracts/masters": "Master Management",
  "/settings": "Settings",
  "/profile": "User Profile",
};

export function Navbar({ onOpenSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const toast = useToastStore();
  const [outletName, setOutletName] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notificationCount] = useState(3); // Mock notification count

  // Fetch outlet name
  useEffect(() => {
    const loadOutletName = async () => {
      if (user?.outlet_id) {
        try {
          const outlets = await fetchOutlets();
          const outlet = outlets.find((o) => o.id === user.outlet_id);
          setOutletName(outlet?.name || user.outlet_id.replace("outlet_", "").toUpperCase());
        } catch {
          setOutletName(user.outlet_id.replace("outlet_", "").toUpperCase());
        }
      } else {
        setOutletName("All Outlets");
      }
    };
    loadOutletName();
  }, [user?.outlet_id]);

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
  } else if (location.pathname.startsWith("/services/edit/")) {
    pageTitle = "Edit Service";
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <>
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
            {/* Notification Bell */}
            <Link
              to="/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Bell size={18} />
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {notificationCount}
                </span>
              )}
            </Link>

            {/* User Info */}
            <div className="hidden rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-right shadow-sm md:block">
              <p className="text-sm font-semibold text-ink">{user?.email}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">
                {outletName}
              </p>
            </div>

            {/* Settings Link */}
            <Link
              to="/settings"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Settings size={18} />
            </Link>

            {/* Logout Button */}
            <button type="button" className="btn-secondary gap-2" onClick={handleLogout}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal — outside header to ensure backdrop covers full viewport */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        variant="logout"
      />
    </>
  );
}
