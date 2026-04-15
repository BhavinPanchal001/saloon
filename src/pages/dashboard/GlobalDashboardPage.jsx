import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Store, 
  Users, 
  Scissors, 
  Package, 
  Wallet, 
  LayoutDashboard,
  Zap,
  ArrowRight
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { fetchDashboardMetrics, fetchOutlets } from "../../services/mockApi";
import { formatCurrency } from "../../utils/format";

export function GlobalDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [outlets, setOutlets] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      const [dashboardMetrics, outletList] = await Promise.all([
        fetchDashboardMetrics({ role: "admin" }),
        fetchOutlets(),
      ]);

      setMetrics(dashboardMetrics);
      setOutlets(outletList);
    };

    loadDashboard();
  }, []);

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
            <Link to="/packages" className="btn-premium-outline">
              Build Package
            </Link>
            <Link to="/outlets" className="btn-premium-primary">
              Manage Outlets
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Active Outlets", metrics?.activeOutlets ?? "--", Store],
          ["Total Staff", metrics?.staffCount ?? "--", Users],
          ["Live Services", metrics?.serviceCount ?? "--", Scissors],
          ["Live Packages", metrics?.packageCount ?? "--", Package],
          ["Monthly Budget", metrics ? formatCurrency(metrics.totalBudget) : "--", Wallet],
        ].map(([label, value, Icon]) => (
          <div key={label} className="stat-card">
            <div>
              <p className="premium-label">{label}</p>
              <p className="mt-4 text-4xl font-black text-navy-900">{value}</p>
            </div>
            <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-gold-50 text-gold-600 shadow-inner">
               <Icon size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-card !p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 p-8 border-b border-navy-50/50">
            <div>
              <p className="premium-label">Outlet Watch</p>
              <h2 className="mt-2 text-3xl text-navy-900">Branch snapshot</h2>
            </div>
            <Link to="/expenses" className="btn-premium-outline">
              Review Expenses
            </Link>
          </div>

          <div className="p-8 space-y-4">
            {outlets.map((outlet) => (
              <div
                key={outlet.id}
                className="group rounded-[1.5rem] border border-navy-50 bg-white/40 p-6 transition-all hover:bg-white hover:shadow-xl hover:shadow-navy-950/5"
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl text-navy-900">{outlet.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {outlet.city} • Managed by <span className="font-bold text-navy-600">{outlet.manager}</span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gold-100 bg-gold-50/30 px-6 py-4 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gold-700">
                      Monthly Budget
                    </p>
                    <p className="mt-1 text-xl font-black text-gold-900">
                      {formatCurrency(outlet.monthlyBudget)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <p className="premium-label">Quick Actions</p>
          <h2 className="mt-2 text-3xl text-navy-900">Core operations</h2>
          <div className="mt-8 grid gap-4">
            {[
              ["Create Bill", "/pos", "btn-premium-accent"],
              ["Create Package", "/packages", "btn-premium-outline"],
              ["Catalog & Stock", "/inventory", "btn-premium-outline"],
              ["Service Master", "/services", "btn-premium-outline"],
              ["Employee Roster", "/staff", "btn-premium-outline"],
              ["Payroll Hub", "/payroll", "btn-premium-outline"],
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
