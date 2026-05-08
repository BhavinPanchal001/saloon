import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Users, 
  Scissors, 
  Package, 
  Box, 
  Wallet,
  TrendingUp,
  ShoppingBag,
  CreditCard,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { fetchBudgetSummary, fetchDashboardMetrics, fetchRevenueChart, fetchTodayOrders } from "../../services/mockApi";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/format";

function RevenueBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.revenue));
  const chartH = 72;
  const barW = 26;
  const gap = 10;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <div className="mt-3 flex flex-col gap-1">
      <svg width="100%" viewBox={`0 0 ${totalW} ${chartH}`} preserveAspectRatio="none" className="overflow-visible">
        {data.map((d, i) => {
          const barH = Math.max(4, (d.revenue / max) * chartH);
          const x = i * (barW + gap);
          const y = chartH - barH;
          const isMax = d.revenue === max;
          return (
            <g key={d.day}>
              <rect x={x} y={y} width={barW} height={barH} rx="4"
                fill={isMax ? "#e1b941" : "#235079"} opacity={isMax ? 1 : 0.18} />
              {isMax && (
                <rect x={x} y={y} width={barW} height={barH} rx="4" fill="url(#outletGoldGrad)" />
              )}
            </g>
          );
        })}
        <defs>
          <linearGradient id="outletGoldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6efb5" />
            <stop offset="100%" stopColor="#e1b941" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex justify-between">
        {data.map((d) => (
          <span key={d.day} className="text-[10px] font-bold text-slate-400 w-6 text-center">{d.day}</span>
        ))}
      </div>
    </div>
  );
}

export function OutletDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [metrics, setMetrics] = useState(null);
  const [budget, setBudget] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [todayData, setTodayData] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      const [dashboardMetrics, budgetSummary, revenue, today] = await Promise.all([
        fetchDashboardMetrics({ role: user?.role, outletId: user?.outlet_id }),
        fetchBudgetSummary({ outletId: user?.outlet_id }),
        fetchRevenueChart({ outletId: user?.outlet_id }),
        fetchTodayOrders({ outletId: user?.outlet_id }),
      ]);

      setMetrics(dashboardMetrics);
      setBudget(budgetSummary);
      setChartData(revenue);
      setTodayData(today);
    };

    if (user?.outlet_id) {
      loadDashboard();
    }
  }, [user]);

  const weekTotal = chartData.reduce((s, d) => s + d.revenue, 0);

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

      {/* Compact stat row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Staff On Record", metrics?.staffCount ?? "--", Users, "text-navy-900"],
          ["Active Services", metrics?.serviceCount ?? "--", Scissors, "text-navy-900"],
          ["Active Packages", metrics?.packageCount ?? "--", Package, "text-navy-900"],
          ["Tracked SKUs", metrics?.inventoryCount ?? "--", Box, "text-navy-900"],
          ["Wallet Balance", budget ? formatCurrency(budget.remainingBalance) : "--", Wallet, "text-emerald-600"],
        ].map(([label, value, Icon, color]) => (
          <div key={label} className="glass-card !p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{label}</p>
              <p className={`text-lg font-black ${color} leading-tight`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue + today's orders */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="glass-card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-gold-500" />
            <p className="premium-label !mb-0">Weekly Revenue</p>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-black text-navy-900">{formatCurrency(weekTotal)}</p>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">This week</span>
          </div>
          <RevenueBarChart data={chartData} />
        </div>

        <div className="glass-card">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={16} className="text-navy-500" />
            <p className="premium-label !mb-0">Today's Orders</p>
          </div>
          <div className="flex items-end justify-between mb-3">
            <p className="text-2xl font-black text-navy-900">{todayData ? formatCurrency(todayData.todayRevenue) : "--"}</p>
            <span className="text-xs font-semibold text-navy-600 bg-navy-50 px-2 py-0.5 rounded-full">{todayData?.todayCount ?? 0} bills</span>
          </div>
          <div className="space-y-2">
            {todayData?.recentBills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between rounded-xl border border-navy-50 bg-white/50 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy-900 truncate">{bill.customer}</p>
                  <p className="text-[11px] text-slate-400">{bill.billNumber}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <CreditCard size={12} className="text-slate-400" />
                  <span className="text-sm font-black text-navy-900">{formatCurrency(bill.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Budget snapshot */}
      <div className="mt-6 glass-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="premium-label">Budget Snapshot</p>
            <p className="text-navy-900 font-bold text-base">Branch spend overview</p>
          </div>
          <span className="text-xs font-semibold text-navy-600 bg-navy-50 px-3 py-1 rounded-full">
            {budget?.spendPercentage ?? 0}% used
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          {[
            ["Allocated Budget", budget ? formatCurrency(budget.totalMonthlyBudget) : "--", "text-navy-900"],
            ["Spend To Date", budget ? formatCurrency(budget.totalExpensesSoFar) : "--", "text-rose-600"],
            ["Available Cash", budget ? formatCurrency(budget.remainingBalance) : "--", "text-emerald-600"],
          ].map(([label, value, colorClass]) => (
            <div key={label} className="rounded-xl border border-navy-50 bg-white/40 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
              <p className={`mt-1 text-lg font-black ${colorClass}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              (budget?.spendPercentage ?? 0) >= 90
                ? "bg-rose-500"
                : (budget?.spendPercentage ?? 0) >= 75
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(budget?.spendPercentage ?? 0, 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          {(budget?.spendPercentage ?? 0) >= 90
            ? "⚠️ Budget nearly exhausted"
            : (budget?.spendPercentage ?? 0) >= 75
            ? "Approaching budget limit"
            : "✓ Budget on track"}
        </p>
      </div>

    </div>
  );
}
