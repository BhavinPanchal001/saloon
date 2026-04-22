import { NavLink } from "react-router-dom";
import {
  Boxes,
  Briefcase,
  CalendarCheck,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Scissors,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

const adminLinks = [
  { label: "Global Dashboard", to: "/dashboard/global", icon: LayoutDashboard },
  { label: "Outlets", to: "/outlets", icon: Store },
  { label: "Employees", to: "/staff", icon: Users },
  { label: "Attendance", to: "/attendance", icon: CalendarCheck },
  { label: "Services", to: "/services", icon: Scissors },
  { label: "Packages", to: "/packages", icon: Boxes },
  { label: "Inventory", to: "/inventory", icon: Package },
  { label: "Contracts", to: "/contracts", icon: FileText },
  { label: "Expenses", to: "/expenses", icon: Receipt },
  { label: "Salary Calc", to: "/payroll/calculate", icon: Wallet },
];

const managerLinks = [
  { label: "Outlet Dashboard", to: "/dashboard/outlet", icon: LayoutDashboard },
  { label: "Employees", to: "/staff", icon: Users },
  { label: "Attendance", to: "/attendance", icon: CalendarCheck },
  { label: "Services", to: "/services", icon: Scissors },
  { label: "Packages", to: "/packages", icon: Boxes },
  { label: "Inventory", to: "/inventory", icon: Package },
  { label: "POS / Billing", to: "/pos", icon: CreditCard, exact: true },
  { label: "Billing History", to: "/pos/bills", icon: Receipt },
  { label: "Local Expenses", to: "/expenses/local", icon: Receipt },
  { label: "Salary Calc", to: "/payroll/calculate", icon: Wallet },
];

const baseNavClasses =
  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition";

export function Sidebar({ isOpen, onClose }) {
  const user = useAuthStore((state) => state.user);
  const navigation = user?.role === "admin" ? adminLinks : managerLinks;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/30 transition md:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-[280px] bg-navy-900 px-5 py-6 text-white shadow-2xl transition md:static md:translate-x-0 md:rounded-r-[2rem] ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-400">
                Glocoy
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

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Signed In As</p>
          <p className="mt-3 text-lg font-semibold text-white">{user?.name}</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <Briefcase size={16} />
            <span>{user?.role === "admin" ? "Super Admin" : "Outlet Manager"}</span>
          </div>
        </div>

        <nav className="mt-8 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={onClose}
                className={({ isActive }) =>
                  `${baseNavClasses} ${
                    isActive
                      ? "bg-gold-500 text-navy-950 shadow-lg shadow-gold-500/20"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-10 rounded-3xl border border-gold-400/30 bg-gold-500/10 p-4 text-sm text-gold-100">
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
