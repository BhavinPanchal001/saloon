import React from "react";
import { NavLink } from "react-router-dom";
import {
  Boxes,
  Briefcase,
  CalendarCheck,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  DollarSign,
  FileText,
  LayoutDashboard,
  Lock,
  Package,
  Receipt,
  Ruler,
  Scissors,
  Settings,
  Shield,
  Store,
  Tag,
  Tags,
  Users,
  Wallet,
  X,
  Bell,
  ClipboardList,
  ShoppingCart,
  BarChart2,
  UserCheck,
  BookOpen,
  Building2,
  TrendingUp,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

// ─── Navigation structure ───────────────────────────────────────────────────

const posNav = [
  {
    section: "POS & Billing",
    icon: CreditCard,
    links: [
      { label: "Point of Sale", to: "/pos", icon: CreditCard, exact: true },
      { label: "Billing History", to: "/pos/bills", icon: Receipt },
      { label: "Coupons", to: "/coupons", icon: Tag },
    ],
  },
];

const adminNav = [
  {
    section: "Dashboard",
    icon: LayoutDashboard,
    links: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "Inventory",
    icon: Package,
    links: [
      { label: "Inventory", to: "/inventory", icon: Package, exact: true },
      { label: "Purchase Orders", to: "/inventory/purchase-orders", icon: ClipboardList },
      { label: "Unit Master", to: "/inventory/units", icon: Ruler },
    ],
  },
  {
    section: "Services & Packages",
    icon: Scissors,
    links: [
      { label: "Services", to: "/services", icon: Scissors, exact: true },
      { label: "Service Categories", to: "/services/categories", icon: Tags },
      { label: "Packages", to: "/packages", icon: Boxes, exact: true },
    ],
  },
  {
    section: "Salon Operations",
    icon: CalendarCheck,
    links: [
      { label: "Appointments", to: "/appointments", icon: CalendarCheck },
      { label: "Customer CRM", to: "/customers", icon: Users },
      { label: "Reports & Analytics", to: "/reports", icon: BarChart2 },
    ],
  },
  {
    section: "POS & Billing",
    icon: CreditCard,
    links: [
      { label: "Point of Sale", to: "/pos", icon: CreditCard, exact: true },
      { label: "Billing History", to: "/pos/bills", icon: Receipt },
      { label: "Coupons", to: "/coupons", icon: Tag },
    ],
  },
  {
    section: "Employee",
    icon: Users,
    links: [
      { label: "Employees", to: "/staff", icon: Users, exact: true },
      { label: "Attendance", to: "/attendance", icon: CalendarCheck, exact: true },
      { label: "Attendance Summary", to: "/attendance/summary", icon: UserCheck },
      { label: "Contracts", to: "/contracts", icon: FileText, exact: true },
      { label: "Contract Masters", to: "/contracts/masters", icon: BookOpen },
    ],
  },
  {
    section: "HR & Payroll",
    icon: DollarSign,
    links: [
      { label: "Payroll", to: "/payroll", icon: Wallet, exact: true },
      { label: "Commission Rules", to: "/payroll/commission-masters", icon: Briefcase },
    ],
  },
  {
    section: "Finance",
    icon: Wallet,
    links: [
      { label: "Expenses", to: "/expenses", icon: Receipt, exact: true },
      { label: "Budgets", to: "/budgets", icon: Wallet },
      { label: "Outlets", to: "/outlets", icon: Store },
      { label: "Bank Accounts", to: "/bank", icon: Building2, exact: true },
    ],
  },
  {
    section: "User Access",
    icon: Shield,
    links: [
      { label: "App Users", to: "/users", icon: Users, exact: true },
    ],
  },
  {
    section: "Settings",
    icon: Settings,
    links: [
      { label: "Settings", to: "/settings", icon: Settings },
      { label: "Notifications", to: "/notifications", icon: Bell },
    ],
  },
];

const staffNav = [
  {
    section: "Dashboard",
    icon: LayoutDashboard,
    links: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "Inventory",
    icon: Package,
    links: [
      { label: "Inventory", to: "/inventory", icon: Package, exact: true, permission: "inventory:view" },
      { label: "Purchase Orders", to: "/inventory/purchase-orders", icon: ClipboardList, permission: "inventory:view" },
      { label: "Unit Master", to: "/inventory/units", icon: Ruler, permission: "inventory:view" },
    ],
  },
  {
    section: "Services & Packages",
    icon: Scissors,
    links: [
      { label: "Services", to: "/services", icon: Scissors, exact: true, permission: "services:view" },
      { label: "Service Categories", to: "/services/categories", icon: Tags, permission: "services:view" },
      { label: "Packages", to: "/packages", icon: Boxes, exact: true, permission: "services:view" },
    ],
  },
  {
    section: "POS & Billing",
    icon: CreditCard,
    links: [
      { label: "Point of Sale", to: "/pos", icon: CreditCard, exact: true, permission: "pos:view" },
      { label: "Billing History", to: "/pos/bills", icon: Receipt, permission: "pos:view" },
    ],
  },
  {
    section: "Employee",
    icon: Users,
    links: [
      { label: "Employees", to: "/staff", icon: Users, exact: true, permission: "staff:view" },
      { label: "Attendance", to: "/attendance", icon: CalendarCheck, exact: true, permission: "attendance:view" },
      { label: "Attendance Summary", to: "/attendance/summary", icon: UserCheck, permission: "attendance:view" },
      { label: "Contracts", to: "/contracts", icon: FileText, exact: true, permission: "contracts:view" },
      { label: "Contract Masters", to: "/contracts/masters", icon: BookOpen, permission: "contracts:view" },
    ],
  },
  {
    section: "HR & Payroll",
    icon: DollarSign,
    links: [
      { label: "Payroll", to: "/payroll", icon: Wallet, exact: true, permission: "payroll:view" },
      { label: "Commission Rules", to: "/payroll/commission-masters", icon: Briefcase, permission: "payroll:view" },
    ],
  },
  {
    section: "Finance",
    icon: Wallet,
    links: [
      { label: "Expenses", to: "/expenses", icon: Receipt, exact: true, permission: "expenses:view" },
      { label: "Budgets", to: "/budgets", icon: Wallet, permission: "expenses:view" },
      { label: "Bank Accounts", to: "/bank", icon: Building2, exact: true, permission: "finance:view" },
    ],
  },
  {
    section: "User Access",
    icon: Shield,
    links: [
      { label: "App Users", to: "/users", icon: Users, exact: true, permission: "users:view" },
    ],
  },
  {
    section: "Settings",
    icon: Settings,
    links: [
      { label: "Settings", to: "/settings", icon: Settings },
      { label: "Notifications", to: "/notifications", icon: Bell },
    ],
  },
];

// ─── Sub-link styles ─────────────────────────────────────────────────────────

const baseLinkClasses =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition";

const collapsedLinkClasses =
  "flex items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium transition";

// ─── Section component ────────────────────────────────────────────────────────

function NavSection({ section, icon: SectionIcon, links, onClose, collapsed }) {
  if (collapsed) {
    return (
      <div className="space-y-1">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={onClose}
              title={item.label}
              className={({ isActive }) =>
                `${collapsedLinkClasses} ${
                  isActive
                    ? "bg-gold-500 text-navy-950 shadow-md shadow-gold-500/20 font-semibold"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon size={20} />
            </NavLink>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 px-2 py-1.5 mt-1">
        <SectionIcon size={13} className="text-gold-400 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-400">
          {section}
        </span>
        <ChevronRight size={11} className="ml-auto text-slate-500" />
      </div>

      {/* Links */}
      <div className="space-y-0.5 pl-2">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={onClose}
              className={({ isActive }) =>
                `${baseLinkClasses} ${
                  isActive
                    ? "bg-gold-500 text-navy-950 shadow-md shadow-gold-500/20 font-semibold"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon size={15} className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({ isOpen, onClose, collapsed = false, onToggleCollapse }) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isPosUser = user?.role === "cashier" || user?.role === "pos";
  const navigation = isPosUser ? posNav : (isAdmin ? adminNav : staffNav);

  const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isHovered, setIsHovered] = React.useState(false);
  const isSidebarCollapsed = collapsed && !isMobile && !isHovered;

  return (
    <>
      {/* Desktop layout space reserving wrapper */}
      <div className={`hidden lg:block shrink-0 transition-all duration-300 ${collapsed ? "w-[80px]" : "w-[280px]"}`} />

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-slate-950/30 transition lg:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        onMouseEnter={() => { if (collapsed) setIsHovered(true); }}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed inset-y-0 left-0 z-40 bg-navy-900 text-white shadow-2xl transition-all duration-300 lg:rounded-r-[2rem] flex flex-col shrink-0 ${
          (isOpen || !isMobile) ? "translate-x-0" : "-translate-x-full"
        } ${isSidebarCollapsed ? "w-[80px] px-3 py-6" : "w-[280px] px-5 py-6"}`}
      >
        <div className="flex-1 overflow-y-auto no-scrollbar pb-4 pr-1">
          {/* ── Brand ── */}
          {!isSidebarCollapsed ? (
            <div className="flex items-start justify-between shrink-0 gap-2 mb-6">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-400">
                  Glowy
                </p>
                <h1 className="mt-3 text-3xl text-white">Glow to go</h1>
                <p className="mt-2 max-w-[14rem] text-sm text-slate-300">
                  Retail, services, payroll, and branch operations in one salon cockpit.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 pr-1">
                {/* Collapse toggle - desktop only */}
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden lg:flex items-center justify-center rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0"
                  title="Collapse sidebar"
                >
                  <ChevronLeft size={18} />
                </button>
                {/* Close button - mobile only */}
                <button
                  type="button"
                  className="rounded-full border border-white/10 p-2 text-slate-300 lg:hidden shrink-0"
                  onClick={onClose}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gold-500 flex items-center justify-center">
                <span className="text-navy-900 font-bold text-lg">G</span>
              </div>
              {/* Collapse toggle - desktop only */}
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex items-center justify-center rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition"
                title="Expand sidebar"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── User card ── */}
          {!isSidebarCollapsed && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shrink-0 mb-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Signed In As</p>
              <p className="mt-3 text-lg font-semibold text-white">{user?.name}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                <Briefcase size={16} />
                <span>{user?.role ? user.role.toUpperCase() : (isAdmin ? "Super Admin" : "Staff")}</span>
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          <nav className={`${isSidebarCollapsed ? "space-y-4" : "space-y-3"}`}>
            {navigation
              .map((group) => ({
                ...group,
                links: group.links.filter(
                  (item) => !item.permission || useAuthStore.getState().hasPermission(item.permission)
                ),
              }))
              .filter((group) => group.links.length > 0)
              .map((group) => (
                <NavSection
                  key={group.section}
                  section={group.section}
                  icon={group.icon}
                  links={group.links}
                  onClose={onClose}
                  collapsed={isSidebarCollapsed}
                />
              ))}
          </nav>
        </div>

      </aside>
    </>
  );
}
