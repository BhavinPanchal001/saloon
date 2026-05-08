import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Store, 
  Users, 
  Scissors, 
  Package, 
  Wallet,
  TrendingUp,
  ShoppingBag,
  CreditCard,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { fetchDashboardMetrics, fetchOutlets, fetchRevenueChart, fetchTodayOrders } from "../../services/mockApi";
import { formatCurrency } from "../../utils/format";

function RevenueBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.revenue));
  const chartH = 80;
  const barW = 28;
  const gap = 12;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <div className="mt-4 flex flex-col gap-1">
      <svg width="100%" viewBox={`0 0 ${totalW} ${chartH}`} preserveAspectRatio="none" className="overflow-visible">
        {data.map((d, i) => {
          const barH = Math.max(4, (d.revenue / max) * chartH);
          const x = i * (barW + gap);
          const y = chartH - barH;
          const isMax = d.revenue === max;
          return (
            <g key={d.day}>
              <rect
                x={x} y={y} width={barW} height={barH}
                rx="5"
                fill={isMax ? "#e1b941" : "#235079"}
                opacity={isMax ? 1 : 0.18}
              />
              {isMax && (
                <rect x={x} y={y} width={barW} height={barH} rx="5"
                  fill="url(#goldGrad)" />
              )}
            </g>
          );
        })}
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6efb5" />
            <stop offset="100%" stopColor="#e1b941" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((d) => (
          <span key={d.day} className="text-[10px] font-bold text-slate-400 w-7 text-center">{d.day}</span>
        ))}
      </div>
    </div>
  );
}

export function GlobalDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [todayData, setTodayData] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      const [dashboardMetrics, outletList, revenue, today] = await Promise.all([
        fetchDashboardMetrics({ role: "admin" }),
        fetchOutlets(),
        fetchRevenueChart({}),
        fetchTodayOrders({}),
      ]);

      setMetrics(dashboardMetrics);
      setOutlets(outletList);
      setChartData(revenue);
      setTodayData(today);
    };

    loadDashboard();
  }, []);

  const weekTotal = chartData.reduce((s, d) => s + d.revenue, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Super Admin"
        title="Network performance at a glance"
        description="Monitor every outlet, keep an eye on headcount and catalog growth, and jump straight into the areas that need attention."
        action={
          <div className="flex flex-wrap gap-3">
            <Link to="/pos" className="btn-premium-outline">
              Create Bill
            </Link>
            <Link to="/outlets" className="btn-premium-primary">
              Manage Outlets
            </Link>
          </div>
        }
      />

      {/* Compact stat row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Active Outlets", metrics?.activeOutlets ?? "--", Store, "text-navy-900"],
          ["Total Staff", metrics?.staffCount ?? "--", Users, "text-navy-900"],
          ["Live Services", metrics?.serviceCount ?? "--", Scissors, "text-navy-900"],
          ["Live Packages", metrics?.packageCount ?? "--", Package, "text-navy-900"],
          ["Monthly Budget", metrics ? formatCurrency(metrics.totalBudget) : "--", Wallet, "text-emerald-600"],
        ].map(([label, value, Icon, color]) => (
          <div key={label} className="glass-card !p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{label}</p>
              <p className={`text-lg font-black ${color} leading-tight`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart + today's orders */}
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
          <div className="flex items-end justify-between mb-4">
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

      {/* Outlet snapshot */}
      <div className="mt-6 glass-card !p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-navy-50/50">
          <div>
            <p className="premium-label">Outlet Watch</p>
            <p className="text-navy-900 font-bold text-base">Branch snapshot</p>
          </div>
          <Link to="/expenses" className="btn-premium-outline">
            Review Expenses
          </Link>
        </div>
        <div className="p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {outlets.map((outlet) => (
            <div
              key={outlet.id}
              className="rounded-2xl border border-navy-50 bg-white/40 px-5 py-4 transition-all hover:bg-white hover:shadow-lg"
            >
              <p className="font-bold text-navy-900">{outlet.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{outlet.city} · {outlet.manager}</p>
              <p className="mt-2 text-sm font-black text-gold-700">{formatCurrency(outlet.monthlyBudget)}</p>
              <p className="text-[10px] uppercase tracking-widest text-gold-500 font-bold">Monthly Budget</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
