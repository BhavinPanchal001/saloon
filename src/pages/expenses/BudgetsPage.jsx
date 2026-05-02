import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Wallet, ArrowLeft, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchBudgetSummary, updateMonthlyBudget } from "../../services/mockApi";
import { formatCurrency } from "../../utils/format";

export function BudgetsPage() {
  const [budgetData, setBudgetData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadBudgets = async () => {
    setIsLoading(true);
    try {
      const summary = await fetchBudgetSummary();
      setBudgetData(summary);
    } catch (error) {
      console.error("Failed to load budgets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  const handleBudgetUpdate = async (outletId, amount) => {
    setSaving(true);
    try {
      await updateMonthlyBudget({ outletId, amount });
      await loadBudgets();
    } catch (error) {
      console.error("Failed to update budget:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader
        eyebrow="Finance & Treasury"
        title="Monthly Budgets"
        description="Allocate and manage monthly expense budgets for all outlets across the network."
        action={
          <Link to="/expenses" className="btn-premium-outline">
            <ArrowLeft size={18} />
            Back to Expenses
          </Link>
        }
      />

      <div className="grid gap-8">
        <div className="glass-card !p-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500 text-navy-900 shadow-lg shadow-gold-500/20">
              <Wallet size={24} />
            </div>
            <div>
              <h2 className="text-2xl text-navy-900">Outlet Allocations</h2>
              <p className="text-sm text-slate-500 mt-1">Manage spending limits for the current fiscal month.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-navy-100 border-t-navy-600 rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-slate-500">Loading budget data...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetData?.budgets?.map((b) => (
                <div 
                  key={b.outletId} 
                  className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-[2rem] border border-navy-50 bg-navy-50/20 hover:bg-white hover:shadow-xl transition-all group"
                >
                  <div>
                    <span className="premium-label">Outlet</span>
                    <h3 className="text-xl font-bold text-navy-900">{b.outletName}</h3>
                  </div>
                  
                  <div className="mt-4 md:mt-0 flex items-center gap-4">
                    <div className="relative group/input">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-navy-300 font-bold group-focus-within/input:text-navy-900 transition-colors">RM </span>
                      <input
                        type="number"
                        className="premium-input !py-3 !pl-14 !w-48 font-bold text-navy-900"
                        defaultValue={b.amount}
                        onBlur={(e) => handleBudgetUpdate(b.outletId, e.target.value)}
                      />
                    </div>
                    <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Save size={16} />
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-10 p-8 rounded-[2rem] bg-navy-900 text-white flex items-center justify-between shadow-2xl shadow-navy-900/20">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-navy-400">Total Network Budget</p>
                  <p className="mt-2 text-3xl font-black">{formatCurrency(budgetData?.totalMonthlyBudget || 0)}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[2rem] bg-gold-50 p-8 border border-gold-100">
          <h4 className="text-sm font-black uppercase tracking-widest text-gold-900 mb-2">Budget Policy</h4>
          <p className="text-sm leading-7 text-gold-800/80">
            Monthly budgets are reset on the 1st of every month. Changes made here are instant and will affect the "Used %" progress bars on the Global Dashboard and individual Outlet Expenses pages. Ensure allocations cover both variable operational costs and fixed monthly overheads.
          </p>
        </div>
      </div>
    </div>
  );
}
