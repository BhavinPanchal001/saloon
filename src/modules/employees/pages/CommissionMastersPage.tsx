import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Save, 
  ArrowLeft,
  Info,
  TrendingUp,
  DollarSign,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../../stores/toastStore';
import { PageHeader } from '../../../components/ui/PageHeader';

interface CommissionBadgeConfig {
  bronze: {
    name: string;
    minSales: number;
    maxSales: number;
    commissionPercent: number;
    color: string;
    icon: string;
  };
  silver: {
    name: string;
    minSales: number;
    maxSales: number;
    commissionPercent: number;
    color: string;
    icon: string;
  };
  gold: {
    name: string;
    minSales: number;
    maxSales: number;
    commissionPercent: number;
    color: string;
    icon: string;
  };
}

const defaultConfig: CommissionBadgeConfig = {
  bronze: {
    name: "Bronze",
    minSales: 100,
    maxSales: 499,
    commissionPercent: 1,
    color: "#CD7F32",
    icon: "🥉",
  },
  silver: {
    name: "Silver",
    minSales: 500,
    maxSales: 999,
    commissionPercent: 2,
    color: "#C0C0C0",
    icon: "🥈",
  },
  gold: {
    name: "Gold",
    minSales: 1000,
    maxSales: Infinity,
    commissionPercent: 3,
    color: "#FFD700",
    icon: "🥇",
  },
};

const CommissionMastersPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToastStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<CommissionBadgeConfig>(defaultConfig);

  // Load commission badge configuration
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        // In a real app, this would call an API
        // For now, we'll use the default config
        setConfig(defaultConfig);
      } catch (err) {
        toast.error('Failed to load commission configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real app, this would call an API to save
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Commission badge configuration saved successfully');
    } catch (err) {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (
    tier: keyof CommissionBadgeConfig,
    field: 'minSales' | 'maxSales' | 'commissionPercent',
    value: number
  ) => {
    setConfig(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: field === 'commissionPercent' ? Math.min(100, Math.max(0, value)) : Math.max(0, value),
      },
    }));
  };

  const getTierIcon = (tier: keyof CommissionBadgeConfig) => {
    if (tier === 'bronze') return <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl">🥉</div>;
    if (tier === 'silver') return <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl">🥈</div>;
    return <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-2xl">🥇</div>;
  };

  const getTierLabel = (tier: keyof CommissionBadgeConfig) => {
    if (tier === 'bronze') return { label: 'Bronze', desc: 'Entry Level Performers', color: 'text-amber-700', bg: 'bg-amber-50' };
    if (tier === 'silver') return { label: 'Silver', desc: 'Consistent Achievers', color: 'text-slate-700', bg: 'bg-slate-50' };
    return { label: 'Gold', desc: 'Top Performers', color: 'text-yellow-700', bg: 'bg-yellow-50' };
  };

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Commission Badge Configuration"
        action={
          <div className="flex items-center gap-3">
            <button
              className="btn-premium-outline flex items-center gap-2"
              onClick={() => navigate('/payroll')}
            >
              <ArrowLeft size={16} />
              Back to Payroll
            </button>
            <button
              className="btn-premium-primary flex items-center gap-2"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        }
      />

      {/* Info Banner */}
      <div className="glass-card !p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Info size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy-900">How Commission Badges Work</h3>
            <p className="text-xs text-navy-500 mt-1">
              Employees earn commission based on their monthly sales performance. Each badge tier has a minimum sales threshold and a corresponding commission percentage. 
              Commission is calculated as a percentage of the total sales amount for the month.
            </p>
          </div>
        </div>
      </div>

      {/* Badge Configuration Cards */}
      <div className="grid gap-6">
        {(Object.keys(config) as Array<keyof CommissionBadgeConfig>).map((tier) => {
          const tierInfo = getTierLabel(tier);
          return (
            <div key={tier} className="glass-card !p-6">
              <div className="flex items-center gap-4 mb-6">
                {getTierIcon(tier)}
                <div>
                  <h3 className={`text-lg font-bold ${tierInfo.color}`}>{tierInfo.label} Tier</h3>
                  <p className="text-xs text-navy-500">{tierInfo.desc}</p>
                </div>
                <div className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${tierInfo.bg} ${tierInfo.color}`}>
                  {tier === 'bronze' ? '100 - 499 sales' : tier === 'silver' ? '500 - 999 sales' : '1000+ sales'}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                {/* Min Sales */}
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Target size={14} className="text-navy-400" />
                      Minimum Sales Count
                    </div>
                  </label>
                  <input
                    type="number"
                    value={config[tier].minSales}
                    onChange={(e) => handleInputChange(tier, 'minSales', parseInt(e.target.value) || 0)}
                    className="premium-input !py-2.5"
                    min={0}
                    disabled={tier === 'gold'} // Gold has no max, so min can be adjusted but we keep it simple
                  />
                  <p className="text-[10px] text-navy-400 mt-1">Minimum sales to qualify for this tier</p>
                </div>

                {/* Max Sales */}
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-2">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-navy-400" />
                      Maximum Sales Count
                    </div>
                  </label>
                  <input
                    type="number"
                    value={tier === 'gold' ? '∞' : config[tier].maxSales}
                    onChange={(e) => handleInputChange(tier, 'maxSales', parseInt(e.target.value) || 0)}
                    className="premium-input !py-2.5"
                    min={config[tier].minSales}
                    disabled={tier === 'gold'}
                  />
                  <p className="text-[10px] text-navy-400 mt-1">
                    {tier === 'gold' ? 'No upper limit for Gold tier' : 'Maximum sales for this tier (exclusive)'}
                  </p>
                </div>

                {/* Commission Percentage */}
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-2">
                    <div className="flex items-center gap-1.5">
                      <DollarSign size={14} className="text-emerald-500" />
                      Commission Percentage
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={config[tier].commissionPercent}
                      onChange={(e) => handleInputChange(tier, 'commissionPercent', parseFloat(e.target.value) || 0)}
                      className="premium-input !py-2.5 !pr-8"
                      min={0}
                      max={100}
                      step={0.5}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 text-sm">%</span>
                  </div>
                  <p className="text-[10px] text-navy-400 mt-1">Percentage of total sales as commission</p>
                </div>
              </div>

              {/* Example Calculation */}
              <div className={`mt-6 p-4 rounded-xl ${tierInfo.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Award size={14} className={tierInfo.color} />
                  <span className={`text-xs font-bold ${tierInfo.color}`}>Example Calculation</span>
                </div>
                <p className={`text-sm ${tierInfo.color}`}>
                  If an employee makes {config[tier].minSales} sales worth ₹50,000 in a month, 
                  they will earn <strong>{formatCurrency(50000 * config[tier].commissionPercent / 100)}</strong> commission 
                  ({config[tier].commissionPercent}% of ₹50,000) as a <strong>{tierInfo.label}</strong> tier performer.
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Card */}
      <div className="glass-card !p-6 mt-6">
        <h3 className="text-sm font-bold text-navy-900 mb-4">Current Configuration Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-100">
                <th className="text-left py-3 px-4 font-semibold text-navy-700">Badge</th>
                <th className="text-left py-3 px-4 font-semibold text-navy-700">Sales Range</th>
                <th className="text-left py-3 px-4 font-semibold text-navy-700">Commission %</th>
                <th className="text-left py-3 px-4 font-semibold text-navy-700">Example (₹50K sales)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-navy-50">
                <td className="py-3 px-4">
                  <span className="flex items-center gap-2">
                    <span>🥉</span>
                    <span className="font-medium text-amber-700">Bronze</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-navy-600">{config.bronze.minSales} - {config.bronze.maxSales} sales</td>
                <td className="py-3 px-4 text-navy-600">{config.bronze.commissionPercent}%</td>
                <td className="py-3 px-4 text-emerald-600 font-semibold">{formatCurrency(50000 * config.bronze.commissionPercent / 100)}</td>
              </tr>
              <tr className="border-b border-navy-50">
                <td className="py-3 px-4">
                  <span className="flex items-center gap-2">
                    <span>🥈</span>
                    <span className="font-medium text-slate-700">Silver</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-navy-600">{config.silver.minSales} - {config.silver.maxSales} sales</td>
                <td className="py-3 px-4 text-navy-600">{config.silver.commissionPercent}%</td>
                <td className="py-3 px-4 text-emerald-600 font-semibold">{formatCurrency(50000 * config.silver.commissionPercent / 100)}</td>
              </tr>
              <tr>
                <td className="py-3 px-4">
                  <span className="flex items-center gap-2">
                    <span>🥇</span>
                    <span className="font-medium text-yellow-700">Gold</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-navy-600">{config.gold.minSales}+ sales</td>
                <td className="py-3 px-4 text-navy-600">{config.gold.commissionPercent}%</td>
                <td className="py-3 px-4 text-emerald-600 font-semibold">{formatCurrency(50000 * config.gold.commissionPercent / 100)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Helper function for formatting currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default CommissionMastersPage;
