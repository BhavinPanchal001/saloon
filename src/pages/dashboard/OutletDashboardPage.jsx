import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Users, 
  Scissors, 
  Package, 
  Box, 
  Wallet,
  Zap,
  CheckCircle2
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { fetchBudgetSummary, fetchDashboardMetrics } from "../../services/mockApi";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/format";

export function OutletDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [metrics, setMetrics] = useState(null);
  const [budget, setBudget] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      const [dashboardMetrics, budgetSummary] = await Promise.all([
        fetchDashboardMetrics({ role: user?.role, outletId: user?.outlet_id }),
        fetchBudgetSummary({ outletId: user?.outlet_id }),
      ]);

      setMetrics(dashboardMetrics);
      setBudget(budgetSummary);
    };

    if (user?.outlet_id) {
      loadDashboard();
    }
  }, [user]);

  return (
    <div>
      <PageHeader
        eyebrow="Outlet Manager"
        title="Your branch pulse"
        description="Track the health of your salon floor, jump into billing, and keep spend under control without leaving the branch workspace."
        action={
          <div className="flex flex-wrap gap-3">
            <Link to="/packages" className="btn-premium-outline">
              Build Package
            </Link>
            <Link to="/pos" className="btn-premium-primary">
              Create Bill
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Staff On Record", metrics?.staffCount ?? "--", Users],
          ["Active Services", metrics?.serviceCount ?? "--", Scissors],
          ["Active Packages", metrics?.packageCount ?? "--", Package],
          ["Tracked SKUs", metrics?.inventoryCount ?? "--", Box],
          ["Wallet Balance", budget ? formatCurrency(budget.remainingBalance) : "--", Wallet],
        ].map(([label, value, Icon]) => (
          <div key={label} className="stat-card">
            <div>
              <p className="premium-label">{label}</p>
              <p className="mt-4 text-4xl font-black text-navy-900">{value}</p>
            </div>
            <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-navy-50 text-navy-600 shadow-inner">
               <Icon size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1fr_0.95fr]">
        <div className="glass-card">
          <p className="premium-label">Budget Snapshot</p>
          <h2 className="mt-2 text-3xl text-navy-900">Branch performance room</h2>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {[
              ["Allocated Budget", budget ? formatCurrency(budget.totalMonthlyBudget) : "--", "text-navy-900"],
              ["Spend To Date", budget ? formatCurrency(budget.totalExpensesSoFar) : "--", "text-rose-600"],
              ["Available Cash", budget ? formatCurrency(budget.remainingBalance) : "--", "text-emerald-600"],
            ].map(([label, value, colorClass]) => (
              <div key={label} className="rounded-[1.5rem] border border-navy-50 bg-white/40 p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className={`mt-3 text-2xl font-black ${colorClass}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-gold-50/30 p-6 border border-gold-100/50">
             <p className="text-xs text-gold-800 leading-relaxed italic">
               * Remaining balance is auto-calculated based on approved local expenses and central procurement logs.
             </p>
          </div>
        </div>

        <div className="glass-card">
          <p className="premium-label">OPERATOR CHECKLIST</p>
          <h2 className="mt-2 text-3xl text-navy-900">Daily salon cockpit</h2>
          <div className="mt-8 grid gap-4">
            {[
              ["Bill a customer", "/pos", "btn-premium-accent"],
              ["Log branch expense", "/expenses/local", "btn-premium-outline"],
              ["Build package offer", "/packages", "btn-premium-outline"],
              ["Restock inventory", "/inventory", "btn-premium-outline"],
              ["Manage team", "/staff", "btn-premium-outline"],
            ].map(([label, to, variant]) => (
              <Link
                key={to}
                to={to}
                className={`${variant || "btn-premium-outline"} w-full justify-start !px-6`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
