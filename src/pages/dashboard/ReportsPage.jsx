import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/LoadingState";
import { EmptyState } from "../../components/ui/EmptyState";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  Users,
  Scissors,
  DollarSign,
  ArrowRight,
  Filter,
  ChevronDown,
} from "lucide-react";

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
    outletComparison: [
      { name: "HSR Layout", revenue: 450000, target: 420000, staff: 12 },
      { name: "Koramangala", revenue: 380000, target: 400000, staff: 10 },
      { name: "Indiranagar", revenue: 520000, target: 480000, staff: 15 },
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

export function ReportsPage() {
  const toast = useToastStore();
  const [isLoading, setIsLoading] = useState(true);
  const [reports, setReports] = useState(null);
  const [dateRange, setDateRange] = useState("last30days");
  const [selectedOutlet, setSelectedOutlet] = useState("all");

  useEffect(() => {
    loadReports();
  }, [dateRange, selectedOutlet]);

  const loadReports = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setReports(generateMockReports());
    setIsLoading(false);
  };

  const handleExport = (type) => {
    toast.success(`${type} report exported successfully`);
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Reports & Analytics" subtitle="Loading reports..." />
        <LoadingState message="Generating analytics reports..." />
      </div>
    );
  }

  if (!reports) {
    return (
      <div>
        <PageHeader title="Reports & Analytics" />
        <EmptyState
          title="No reports available"
          message="Unable to load analytics data. Please try again."
          actionLabel="Retry"
          onAction={loadReports}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Comprehensive insights into your salon network performance"
        action={
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleExport("Full Analytics")}
              className="btn-premium-outline flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Report
            </button>
            <Link to="/dashboard/global" className="btn-premium-primary">
              Back to Dashboard
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-navy-500 focus:outline-none"
            >
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="last90days">Last 90 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisYear">This Year</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-navy-500 focus:outline-none"
            >
              <option value="all">All Outlets</option>
              <option value="hsr">HSR Layout</option>
              <option value="koramangala">Koramangala</option>
              <option value="indiranagar">Indiranagar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="premium-label">Total Revenue</p>
              <p className="mt-2 text-3xl font-black text-navy-900">
                {formatCurrency(reports.summary.totalRevenue)}
              </p>
              <div className="mt-2 flex items-center gap-1 text-sm text-emerald-600">
                <TrendingUp className="h-4 w-4" />
                <span>+{reports.summary.revenueGrowth}%</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-emerald-50 text-emerald-600 shadow-inner">
              <DollarSign size={20} />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="premium-label">Total Services</p>
              <p className="mt-2 text-3xl font-black text-navy-900">
                {reports.summary.totalServices.toLocaleString()}
              </p>
              <div className="mt-2 flex items-center gap-1 text-sm text-emerald-600">
                <TrendingUp className="h-4 w-4" />
                <span>+{reports.summary.serviceGrowth}%</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-blue-50 text-blue-600 shadow-inner">
              <Scissors size={20} />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="premium-label">Avg Bill Value</p>
              <p className="mt-2 text-3xl font-black text-navy-900">
                {formatCurrency(reports.summary.avgBillValue)}
              </p>
              <div className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                <span>Per transaction</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-gold-50 text-gold-600 shadow-inner">
              <BarChart3 size={20} />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="premium-label">Total Customers</p>
              <p className="mt-2 text-3xl font-black text-navy-900">
                {reports.summary.customerCount.toLocaleString()}
              </p>
              <div className="mt-2 flex items-center gap-1 text-sm text-emerald-600">
                <span>+{reports.summary.newCustomers} new</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-purple-50 text-purple-600 shadow-inner">
              <Users size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        {/* Revenue Trend Chart */}
        <div className="glass-card">
          <div className="flex items-center justify-between border-b border-navy-50/50 pb-4">
            <div>
              <p className="premium-label">Revenue Trend</p>
              <h3 className="mt-1 text-2xl font-semibold text-navy-900">6-Month Overview</h3>
            </div>
            <button
              onClick={() => handleExport("Revenue")}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-6">
            <div className="space-y-4">
              {reports.revenueTrend.map((item, index) => (
                <div key={item.month} className="flex items-center gap-4">
                  <span className="w-10 text-sm font-medium text-slate-600">{item.month}</span>
                  <div className="flex-1">
                    <div className="h-8 rounded-lg bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-lg bg-gradient-to-r from-navy-600 to-navy-400"
                        style={{ width: `${(item.revenue / 250000) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-24 text-right text-sm font-semibold text-navy-900">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Service Performance */}
        <div className="glass-card">
          <div className="flex items-center justify-between border-b border-navy-50/50 pb-4">
            <div>
              <p className="premium-label">Top Services</p>
              <h3 className="mt-1 text-2xl font-semibold text-navy-900">By Revenue</h3>
            </div>
            <button
              onClick={() => handleExport("Services")}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {reports.servicePerformance.map((service) => (
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
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
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
          <div className="mt-6 space-y-3">
            {reports.staffPerformance.map((staff, index) => (
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

        {/* Package Sales */}
        <div className="glass-card">
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
          <div className="mt-6 space-y-3">
            {reports.packageSales.map((pkg) => (
              <div
                key={pkg.name}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-50">
                    <PieChart className="h-5 w-5 text-gold-600" />
                  </div>
                  <div>
                    <p className="font-medium text-navy-900">{pkg.name}</p>
                    <p className="text-sm text-slate-500">{pkg.sold} sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-navy-900">{formatCurrency(pkg.revenue)}</p>
                  <div
                    className={`flex items-center justify-end gap-1 text-xs ${
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
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outlet Comparison */}
      <div className="glass-card">
        <div className="flex items-center justify-between border-b border-navy-50/50 pb-4">
          <div>
            <p className="premium-label">Outlet Performance</p>
            <h3 className="mt-1 text-2xl font-semibold text-navy-900">Revenue Comparison</h3>
          </div>
          <button
            onClick={() => handleExport("Outlets")}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Download className="mr-2 inline-block h-4 w-4" />
            Export
          </button>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Outlet</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Revenue</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Target</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Achievement</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">Staff</th>
              </tr>
            </thead>
            <tbody>
              {reports.outletComparison.map((outlet) => {
                const achievement = (outlet.revenue / outlet.target) * 100;
                return (
                  <tr key={outlet.name} className="border-b border-slate-50">
                    <td className="px-4 py-4">
                      <span className="font-medium text-navy-900">{outlet.name}</span>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-navy-900">
                      {formatCurrency(outlet.revenue)}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-600">
                      {formatCurrency(outlet.target)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          achievement >= 100
                            ? "bg-emerald-100 text-emerald-700"
                            : achievement >= 80
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {achievement.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-slate-600">{outlet.staff}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
