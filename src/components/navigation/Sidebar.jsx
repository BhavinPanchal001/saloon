import { NavLink } from "react-router-dom";
import {
  Boxes,
  Briefcase,
  CalendarCheck,
  ChevronRight,
  CreditCard,
  DollarSign,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Ruler,
  Scissors,
  Settings,
  Store,
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
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

// ─── Navigation structure ───────────────────────────────────────────────────

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
    section: "POS & Billing",
    icon: CreditCard,
    links: [
      { label: "Point of Sale", to: "/pos", icon: CreditCard, exact: true },
      { label: "Billing History", to: "/pos/bills", icon: Receipt },
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
    section: "POS & Billing",
    icon: CreditCard,
    links: [
      { label: "Point of Sale", to: "/pos", icon: CreditCard, exact: true },
      { label: "Billing History", to: "/pos/bills", icon: Receipt },
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
      { label: "Bank Accounts", to: "/bank", icon: Building2, exact: true },
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

// ─── Section component ────────────────────────────────────────────────────────

function NavSection({ section, icon: SectionIcon, links, onClose }) {
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

export function Sidebar({ isOpen, onClose }) {
  const user = useAuthStore((state) => state.user);
  const navigation = user?.role === "admin" ? adminNav : staffNav;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-slate-950/30 transition md:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[280px] bg-navy-900 px-5 py-6 text-white shadow-2xl transition md:static md:translate-x-0 md:rounded-r-[2rem] flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* ── Brand ── */}
        <div className="flex items-start justify-between shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-400">
              Glowy
            </p>
            <h1 className="mt-3 text-3xl text-white">Glow to go</h1>
            <p className="mt-2 max-w-[14rem] text-sm text-slate-300">
              Retail, services, payroll, and branch operations in one salon cockpit.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-white/10 p-2 text-slate-300 md:hidden"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── User card ── */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 shrink-0">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Signed In As</p>
          <p className="mt-3 text-lg font-semibold text-white">{user?.name}</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <Briefcase size={16} />
            <span>{user?.role === "admin" ? "Super Admin" : "Outlet Manager"}</span>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="mt-6 flex-1 overflow-y-auto pr-1 space-y-3 pb-4">
          {navigation.map((group) => (
            <NavSection
              key={group.section}
              section={group.section}
              icon={group.icon}
              links={group.links}
              onClose={onClose}
            />
          ))}
        </nav>

        {/* ── Mocked mode notice ── */}
        <div className="shrink-0 rounded-3xl border border-gold-400/30 bg-gold-500/10 p-4 text-sm text-gold-100">
          <p className="font-semibold text-white">Mocked mode active</p>
          <p className="mt-2 leading-6 text-gold-100/90">
            API calls are promise-based placeholders so we can ship the frontend before the
            Supabase wiring begins.
          </p>
        </div>
      </aside>
    </>
  );
}
