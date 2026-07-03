import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Store, 
  Users, 
  Scissors, 
  Package, 
  Wallet,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  CreditCard,
  ChevronRight,
  DollarSign,
  BarChart3,
  PieChart,
  Download,
  ArrowRight,
  Filter,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { fetchDashboardMetrics, fetchOutlets, fetchRevenueChart, fetchTodayOrders } from "../../services/mockApi";
import { formatCurrency } from "../../utils/format";
import { useToastStore } from "../../stores/toastStore";

// Mock report data generator
const generateMockReports = () => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return {
    revenueTrend: months.map((month, i) => ({
      month,
      revenue: 150000 + Math.random() * 50000 + i * 10000,
      target: 180000 + i * 8000,
    })),
    servicePerformance: [
      { name: "Hair Cut", count: 245, revenue: 122500, growth: 12 },
      { name: "Facial", count: 189, revenue: 94500, growth: 8 },
      { name: "Massage", count: 156, revenue: 124800, growth: -3 },
      { name: "Manicure", count: 134, revenue: 53600, growth: 15 },
      { name: "Hair Color", count: 98, revenue: 78400, growth: 5 },
    ],
    staffPerformance: [
      { name: "Priya Sharma", services: 89, revenue: 44500, rating: 4.8 },
      { name: "Rahul Verma", services: 76, revenue: 38000, rating: 4.6 },
      { name: "Anita Patel", services: 72, revenue: 36000, rating: 4.9 },
      { name: "Vikram Singh", services: 68, revenue: 34000, rating: 4.5 },
      { name: "Sunita Rao", services: 65, revenue: 32500, rating: 4.7 },
    ],
    packageSales: [
      { name: "Bridal Glow", sold: 24, revenue: 120000, trend: "up" },
      { name: "Monthly Spa", sold: 45, revenue: 90000, trend: "up" },
      { name: "Grooming Kit", sold: 38, revenue: 76000, trend: "down" },
      { name: "Detox Package", sold: 29, revenue: 58000, trend: "up" },
    ],
    summary: {
      totalRevenue: 1350000,
      revenueGrowth: 18.5,
      totalServices: 896,
      serviceGrowth: 12.3,
      avgBillValue: 1505,
      customerCount: 456,
      newCustomers: 78,
      retentionRate: 68,
    },
  };
};

function RevenueBarChart({ data }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.revenue));
  const barW = 40;
  const gap = 16;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <div className="mt-4 flex flex-col gap-1 relative flex-1 min-h-0">
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${totalW} 200`} 
          className="overflow-visible absolute inset-0"
          preserveAspectRatio="none"
        >
          {data.map((d, i) => {
            const barH = Math.max(4, (d.revenue / max) * 180);
            const x = i * (barW + gap);
            const y = 200 - barH;
            const isMax = d.revenue === max;
            return (
              <g key={d.day}
                onMouseEnter={() => setTooltip({ index: i, day: d.day, revenue: d.revenue, x, y })}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: "pointer" }}
              >
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
      </div>
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none bg-navy-900 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap"
          style={{
            left: tooltip.x + barW / 2,
            bottom: 200 - tooltip.y + 10,
            transform: "translateX(-50%)",
          }}
        >
          <div className="text-gold-400">{tooltip.day}</div>
          <div>{formatCurrency(tooltip.revenue)}</div>
        </div>
      )}
      <div className="flex gap-0" style={{ width: totalW }}>
        {data.map((d, i) => (
          <span key={d.day} className="text-[10px] font-bold text-slate-400 text-center" style={{ width: barW, marginLeft: i > 0 ? gap : 0 }}>{d.day}</span>
        ))}
      </div>
    </div>
  );
}

export function GlobalDashboardPage() {
  const toast = useToastStore();
  const [metrics, setMetrics] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [todayData, setTodayData] = useState(null);
  const [reports, setReports] = useState(null);
  const [selectedOutlet, setSelectedOutlet] = useState("all");

  useEffect(() => {
    const loadDashboard = async () => {
      const [dashboardMetrics, outletList, revenue, today] = await Promise.all([
        fetchDashboardMetrics({ role: "admin", outlet: selectedOutlet }),
        fetchOutlets(),
        fetchRevenueChart({ outlet: selectedOutlet }),
        fetchTodayOrders({ outlet: selectedOutlet }),
      ]);

      setMetrics(dashboardMetrics);
      setOutlets(outletList);
      setChartData(revenue);
      setTodayData(today);
      setReports(generateMockReports());
    };

    loadDashboard();
  }, [selectedOutlet]);

  const handleExport = (type) => {
    toast.success(`${type} report exported successfully`);
  };

  const weekTotal = chartData.reduce((s, d) => s + d.revenue, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Super Admin"
        title="Dashboard"
        description="Monitor every outlet, keep an eye on headcount and catalog growth, and jump straight into the areas that need attention."
        action={
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-navy-500 focus:outline-none"
              >
                <option value="all">All Outlets</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>
            <Link to="/pos" className="btn-premium-outline">
              Create Bill
            </Link>
          </div>
        }
      />

      {/* Compact stat row */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Active Outlets", metrics?.activeOutlets ?? "--", Store, "text-navy-900"],
          ["Total Staff", metrics?.staffCount ?? "--", Users, "text-navy-900"],
          ["Live Services", metrics?.serviceCount ?? "--", Scissors, "text-navy-900"],
          ["Live Packages", metrics?.packageCount ?? "--", Package, "text-navy-900"],
          ["Monthly Budget", metrics ? formatCurrency(metrics.totalBudget) : "--", Wallet, "text-emerald-600"],
        ].map(([label, value, Icon, color]) => (
          <div key={label} className="glass-card !p-3 flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-600">
              <Icon size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">{label}</p>
              <p className={`text-base font-black ${color} leading-tight`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Summary Cards */}
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card !p-3.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="premium-label text-xs">Total Revenue</p>
              <p className="mt-1 text-xl font-black text-navy-900">
                {reports ? formatCurrency(reports.summary.totalRevenue) : "--"}
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                <span>+{reports?.summary.revenueGrowth ?? 0}%</span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-inner">
              <DollarSign size={18} />
            </div>
          </div>
        </div>

        <div className="stat-card !p-3.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="premium-label text-xs">Total Services</p>
              <p className="mt-1 text-xl font-black text-navy-900">
                {reports?.summary.totalServices?.toLocaleString() ?? "--"}
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                <span>+{reports?.summary.serviceGrowth ?? 0}%</span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-inner">
              <Scissors size={18} />
            </div>
          </div>
        </div>

        <div className="stat-card !p-3.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="premium-label text-xs">Avg Bill Value</p>
              <p className="mt-1 text-xl font-black text-navy-900">
                {reports ? formatCurrency(reports.summary.avgBillValue) : "--"}
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <span>Per transaction</span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50 text-gold-600 shadow-inner">
              <BarChart3 size={18} />
            </div>
          </div>
        </div>

        <div className="stat-card !p-3.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="premium-label text-xs">Total Customers</p>
              <p className="mt-1 text-xl font-black text-navy-900">
                {reports?.summary.customerCount?.toLocaleString() ?? "--"}
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                <span>+{reports?.summary.newCustomers ?? 0} new</span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shadow-inner">
              <Users size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue chart + today's orders */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="glass-card flex flex-col">
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
          <div className="space-y-2 overflow-y-auto max-h-[280px] pr-1">
            {todayData?.recentBills.map((bill) => (
              <Link
                key={bill.id}
                to={`/pos/bills?search=${encodeURIComponent(bill.billNumber)}`}
                className="group flex items-center justify-between rounded-xl border border-navy-50 bg-white/50 px-4 py-2.5 transition hover:bg-navy-50 hover:border-navy-100 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy-900 truncate">{bill.customer}</p>
                  <p className="text-[11px] text-slate-400">{bill.billNumber}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <CreditCard size={12} className="text-slate-400" />
                  <span className="text-sm font-black text-navy-900">{formatCurrency(bill.total)}</span>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-navy-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Service Performance & Staff Performance */}
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {/* Service Performance */}
        <div className="glass-card">
          <div className="flex items-center justify-between border-b border-navy-50/50 pb-4">
            <div>
              <p className="premium-label">Top Services</p>
              <h3 className="mt-1 text-2xl font-semibold text-navy-900">By Revenue</h3>
            </div>
            <Link
              to="/services"
              className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 space-y-4 overflow-y-auto max-h-[280px] pr-1">
            {reports?.servicePerformance?.slice(0, 4).map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50">
                    <Scissors className="h-5 w-5 text-navy-600" />
                  </div>
                  <div>
                    <p className="font-medium text-navy-900">{service.name}</p>
                    <p className="text-sm text-slate-500">{service.count} services</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-navy-900">{formatCurrency(service.revenue)}</p>
                  <div
                    className={`flex items-center justify-end gap-1 text-xs ${
                      service.growth >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {service.growth >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{service.growth >= 0 ? "+" : ""}{service.growth}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Performance */}
        <div className="glass-card">
          <div className="flex items-center justify-between border-b border-navy-50/50 pb-4">
            <div>
              <p className="premium-label">Staff Leaderboard</p>
              <h3 className="mt-1 text-2xl font-semibold text-navy-900">Top Performers</h3>
            </div>
            <Link
              to="/staff"
              className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 space-y-3 overflow-y-auto max-h-[280px] pr-1">
            {reports?.staffPerformance?.slice(0, 4).map((staff, index) => (
              <div
                key={staff.name}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-navy-500 to-navy-700 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-navy-900">{staff.name}</p>
                    <p className="text-sm text-slate-500">{staff.services} services</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-navy-900">{formatCurrency(staff.revenue)}</p>
                  <p className="text-xs text-slate-500">★ {staff.rating}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Package Sales */}
      <div className="mt-4 glass-card">
        <div className="flex items-center justify-between border-b border-navy-50/50 pb-4">
          <div>
            <p className="premium-label">Package Sales</p>
            <h3 className="mt-1 text-2xl font-semibold text-navy-900">Best Sellers</h3>
          </div>
          <Link
            to="/packages"
            className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reports?.packageSales?.slice(0, 4).map((pkg) => (
            <div
              key={pkg.name}
              className="rounded-xl border border-slate-100 bg-white/50 p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-50">
                  <PieChart className="h-5 w-5 text-gold-600" />
                </div>
                <div
                  className={`flex items-center gap-1 text-xs ${
                    pkg.trend === "up" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {pkg.trend === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{pkg.trend === "up" ? "Trending Up" : "Trending Down"}</span>
                </div>
              </div>
              <p className="font-medium text-navy-900 mb-1">{pkg.name}</p>
              <p className="text-sm text-slate-500 mb-2">{pkg.sold} sold</p>
              <p className="font-semibold text-navy-900">{formatCurrency(pkg.revenue)}</p>
            </div>
          ))}
        </div>
      </div>

      
    </div>
  );
}
