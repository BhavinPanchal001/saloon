import { useEffect, useState } from "react";
import { LogOut, Menu, Sparkles, Bell, Settings, User, Search } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useToastStore } from "../../stores/toastStore";
import { useSearchStore } from "../../stores/searchStore";
import { ConfirmModal } from "../ui/Modal";
import { fetchOutletsFromAPI, fetchNotificationsAPI } from "../../services/api";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/outlets": "Outlet Directory",
  "/outlets/transactions": "Outlet Financial Hub",
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
  "/users": "App Users Management",
  "/roles": "Roles & Permissions Management",
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
  const [notificationCount, setNotificationCount] = useState(0);
  const openSearch = useSearchStore((state) => state.openSearch);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const data = await fetchNotificationsAPI({ read: false });
        setNotificationCount(data.unreadCount ?? 0);
      } catch {
        // silently ignore
      }
    };
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch outlet name
  useEffect(() => {
    const loadOutletName = async () => {
      if (user?.outlet_id) {
        try {
          const outlets = await fetchOutletsFromAPI();
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
              className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 lg:hidden"
              onClick={onOpenSidebar}
            >
              <Menu size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-gold-600">
                <Sparkles size={14} />
                Salon OS
              </div>
            </div>
          </div>

          {/* Global Search Bar Trigger */}
          <div className="flex-1 max-w-md mx-2 sm:mx-6">
            <button
              type="button"
              onClick={() => openSearch()}
              className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2 text-left shadow-xs transition-all hover:border-gold-400 hover:bg-white hover:shadow-sm"
              aria-label="Open global search"
            >
              <div className="flex items-center gap-2.5 text-slate-400 group-hover:text-slate-600 min-w-0">
                <Search size={16} className="text-gold-600 group-hover:text-gold-700 shrink-0" />
                <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700 truncate hidden sm:inline">
                  Search customers, services, bills, staff...
                </span>
                <span className="text-xs font-medium text-slate-500 sm:hidden">
                  Search...
                </span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 group-hover:border-gold-300 group-hover:text-gold-700 transition-colors shrink-0">
                <span>Ctrl</span>
                <span>K</span>
              </kbd>
            </button>
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
            {!(user?.role === "cashier" || user?.role === "pos") && (
              <Link
                to="/settings"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Settings size={18} />
              </Link>
            )}

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
