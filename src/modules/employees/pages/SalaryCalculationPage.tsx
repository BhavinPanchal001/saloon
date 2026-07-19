import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Calendar, 
  ChevronRight, 
  Download, 
  Filter, 
  Search, 
  User, 
  ArrowUpRight, 
  ArrowDownRight,
  Printer,
  FileText,
  Clock,
  CheckCircle2,
  Medal,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../../utils/format';
import { calculateAllSalaries, fetchPayrollWithCommission, fetchCommissionBadgeConfig } from '../../../services/mockApi';
import { useToastStore } from '../../../stores/toastStore';
import { PageHeader } from '../../../components/ui/PageHeader';

interface CommissionBadge {
  name: string;
  minSales: number;
  maxSales: number;
  commissionPercent: number;
  color: string;
  icon: string;
}

interface CommissionInfo {
  amount: number;
  badge: CommissionBadge | null;
  saleCount: number;
  totalSales: number;
}

interface StatCard {
  label: string;
  value: string | number;
  sub: string;
  Icon: LucideIcon;
  iconBg: string;
  subColor: string;
}

interface SalaryRecord {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  baseSalary: number;
  allowances: number;
  commissions: number;
  deductions: number;
  netPay: number;
  status: 'calculated' | 'pending' | 'paid';
  attendance: {
    present: number;
    absent: number;
    leaves: number;
  };
  commissionInfo?: CommissionInfo;
}

const SalaryCalculationPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToastStore();
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);

  // Fetch payroll data with commission calculation
  useEffect(() => {
    const loadPayroll = async () => {
      setIsLoading(true);
      try {
        const records = await fetchPayrollWithCommission(selectedMonth);
        setSalaryRecords(records);
      } catch (err) {
        toast.error('Failed to load payroll data');
      } finally {
        setIsLoading(false);
      }
    };

    loadPayroll();
  }, [selectedMonth, toast]);

  const filteredRecords = salaryRecords.filter(record => 
    record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPayroll = filteredRecords.reduce((sum, record) => sum + record.netPay, 0);
  const totalEmployees = filteredRecords.length;
  const pendingCalculations = filteredRecords.filter(r => r.status === 'pending').length;

  const handleCalculateAll = async () => {
    setIsCalculating(true);
    try {
      const result = await calculateAllSalaries(selectedMonth);
      toast.success(result.message);
      // Refresh records with calculated status
      setSalaryRecords(prev => prev.map(r => 
        r.status === 'pending' ? { ...r, status: 'calculated' as const } : r
      ));
    } catch (err) {
      toast.error('Failed to calculate salaries');
    } finally {
      setIsCalculating(false);
    }
  };

  const statCards: StatCard[] = [
    {
      label: 'Total Payroll',
      value: formatCurrency(totalPayroll),
      sub: '+12.5% from last month',
      Icon: ArrowUpRight,
      iconBg: 'bg-emerald-50 text-emerald-600',
      subColor: 'text-emerald-600',
    },
    {
      label: 'Employees',
      value: totalEmployees,
      sub: 'All active staff members',
      Icon: User,
      iconBg: 'bg-navy-50 text-navy-600',
      subColor: 'text-slate-400',
    },
    {
      label: 'Pending',
      value: pendingCalculations,
      sub: 'Requires review',
      Icon: Clock,
      iconBg: 'bg-amber-50 text-amber-600',
      subColor: 'text-amber-600',
    },
    {
      label: 'Processed',
      value: totalEmployees - pendingCalculations,
      sub: 'Ready for payout',
      Icon: CheckCircle2,
      iconBg: 'bg-blue-50 text-blue-600',
      subColor: 'text-blue-600',
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Payroll"
        title="Salary Calculation"
        action={
          <div className="flex items-center gap-3">
            <button
              className="btn-premium-outline flex items-center gap-2"
              onClick={() => navigate('/payroll/commission-masters')}
              title="Configure Commission Badges"
            >
              <Settings size={15} />
              Commission Rules
            </button>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" size={15} />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="premium-input !py-2.5 !pl-9 !text-sm w-40"
              />
            </div>
            <button
              className="btn-premium-primary flex items-center gap-2"
              onClick={handleCalculateAll}
              disabled={isCalculating}
            >
              <Calculator size={15} />
              {isCalculating ? 'Calculating...' : 'Calculate All'}
            </button>
          </div>
        }
      />

      {/* Compact stat row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, sub, Icon, iconBg, subColor }) => (
          <div key={label} className="glass-card !p-4 flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
              <p className="text-lg font-black leading-tight text-navy-900">{value}</p>
              <p className={`text-[10px] font-medium truncate ${subColor}`}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + actions bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" size={15} />
          <input
            type="text"
            placeholder="Search by name or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="premium-input !py-2.5 !pl-9 !text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-premium-outline flex items-center gap-1.5 !py-2.5 !text-xs">
            <Filter size={14} />
            Filters
          </button>
          <button className="btn-premium-outline flex items-center gap-1.5 !py-2.5 !text-xs">
            <Download size={14} />
            Export CSV
          </button>
          <button className="btn-premium-outline !py-2.5 !px-3">
            <Printer size={14} />
          </button>
        </div>
      </div>

      {/* Salary Table */}
      <div className="mt-4 table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Base Salary</th>
              <th>Earnings</th>
              <th>Deductions</th>
              <th>Net Pay</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={7} className="py-4">
                    <div className="h-8 w-full rounded-xl bg-navy-50/50"></div>
                  </td>
                </tr>
              ))
            ) : filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-xs font-bold text-white">
                        {record.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-navy-900">{record.name}</div>
                        <div className="text-[11px] text-navy-400">{record.employeeId} · {record.role}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm font-semibold text-navy-700">{formatCurrency(record.baseSalary)}</div>
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-xs text-emerald-600">
                        <ArrowUpRight size={11} />
                        <span>Allowance: {formatCurrency(record.allowances)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-emerald-600">
                        <ArrowUpRight size={11} />
                        <span>Commission: {formatCurrency(record.commissions)}</span>
                      </div>
                      {record.commissionInfo?.badge && (
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <span 
                            className="px-2 py-0.5 rounded-full text-white font-semibold"
                            style={{ backgroundColor: record.commissionInfo.badge.color }}
                          >
                            {record.commissionInfo.badge.icon} {record.commissionInfo.badge.name}
                          </span>
                          <span className="text-slate-500">
                            {record.commissionInfo.saleCount} sales · {record.commissionInfo.badge.commissionPercent}% of {formatCurrency(record.commissionInfo.totalSales)}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-xs text-rose-500 font-medium">
                      <ArrowDownRight size={11} />
                      {formatCurrency(record.deductions)}
                    </div>
                    <div className="text-[10px] text-navy-300">PF, Tax & Attendance</div>
                  </td>
                  <td>
                    <div className="text-sm font-black text-navy-900">{formatCurrency(record.netPay)}</div>
                  </td>
                  <td>
                    <span className={`status-badge ${
                      record.status === 'paid' ? 'status-active' :
                      record.status === 'calculated' ? 'status-pending' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-navy-100 bg-white text-navy-600 transition-colors hover:bg-navy-50">
                        <FileText size={14} />
                      </button>
                      <button className="flex h-8 items-center gap-1.5 rounded-lg bg-navy-900 px-3 text-xs font-bold text-white transition-all hover:bg-navy-800 active:scale-95">
                        Calculate
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50 text-navy-300">
                      <Search size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy-700">No records found</p>
                      <p className="text-xs text-navy-400">Try adjusting your search or filters</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalaryCalculationPage;
