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
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';

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
}

const SalaryCalculationPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);

  // Mock data generation
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const mockRecords: SalaryRecord[] = [
        {
          id: '1',
          employeeId: 'EMP001',
          name: 'Alex Rivera',
          role: 'Senior Stylist',
          baseSalary: 45000,
          allowances: 5000,
          commissions: 12450,
          deductions: 2100,
          netPay: 60350,
          status: 'calculated',
          attendance: { present: 24, absent: 1, leaves: 1 }
        },
        {
          id: '2',
          employeeId: 'EMP002',
          name: 'Sarah Chen',
          role: 'Master Colorist',
          baseSalary: 52000,
          allowances: 6000,
          commissions: 18900,
          deductions: 2450,
          netPay: 74450,
          status: 'calculated',
          attendance: { present: 26, absent: 0, leaves: 0 }
        },
        {
          id: '3',
          employeeId: 'EMP003',
          name: 'Michael Ross',
          role: 'Junior Barber',
          baseSalary: 28000,
          allowances: 2000,
          commissions: 4500,
          deductions: 1200,
          netPay: 33300,
          status: 'pending',
          attendance: { present: 22, absent: 3, leaves: 1 }
        },
        {
          id: '4',
          employeeId: 'EMP004',
          name: 'Elena Rodriguez',
          role: 'Receptionist',
          baseSalary: 25000,
          allowances: 1500,
          commissions: 0,
          deductions: 1000,
          netPay: 25500,
          status: 'paid',
          attendance: { present: 25, absent: 1, leaves: 0 }
        }
      ];
      setSalaryRecords(mockRecords);
      setIsLoading(false);
    }, 800);
  }, [selectedMonth]);

  const filteredRecords = salaryRecords.filter(record => 
    record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPayroll = filteredRecords.reduce((sum, record) => sum + record.netPay, 0);
  const totalEmployees = filteredRecords.length;
  const pendingCalculations = filteredRecords.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-8 p-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-500/10 text-navy-500">
              <Calculator size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-navy-400">Payroll Management</span>
          </div>
          <h1 className="text-4xl text-navy-900">Salary Calculation</h1>
          <p className="max-w-2xl text-navy-500/70">
            Review and process monthly salaries, including commissions, attendance deductions, and custom bonuses for your team.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-400" size={18} />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="premium-input w-48 pl-12"
            />
          </div>
          <button className="btn-premium-primary gap-2">
            <Calculator size={18} />
            Calculate All
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="glass-card overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="premium-label">Total Payroll</p>
              <h3 className="text-3xl text-navy-900">{formatCurrency(totalPayroll)}</h3>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <ArrowUpRight size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600">
            <span>+12.5% from last month</span>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="premium-label">Employees</p>
              <h3 className="text-3xl text-navy-900">{totalEmployees}</h3>
            </div>
            <div className="rounded-2xl bg-navy-50 p-3 text-navy-600">
              <User size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-navy-400">
            <span>All active staff members</span>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="premium-label">Pending</p>
              <h3 className="text-3xl text-navy-900">{pendingCalculations}</h3>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <Clock size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-amber-600">
            <span>Requires review</span>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="premium-label">Processed</p>
              <h3 className="text-3xl text-navy-900">{totalEmployees - pendingCalculations}</h3>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <CheckCircle2 size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600">
            <span>Ready for payout</span>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="premium-input pl-12"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-premium-outline gap-2 px-4">
            <Filter size={18} />
            Filters
          </button>
          <button className="btn-premium-outline gap-2 px-4">
            <Download size={18} />
            Export CSV
          </button>
          <button className="btn-premium-outline gap-2 px-4">
            <Printer size={18} />
          </button>
        </div>
      </div>

      {/* Salary Table */}
      <div className="table-container">
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
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={7} className="py-8">
                    <div className="h-12 w-full rounded-xl bg-navy-50/50"></div>
                  </td>
                </tr>
              ))
            ) : filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-sm font-bold text-white">
                        {record.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-bold text-navy-900">{record.name}</div>
                        <div className="text-xs text-navy-400">{record.employeeId} • {record.role}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="font-semibold text-navy-700">{formatCurrency(record.baseSalary)}</div>
                  </td>
                  <td>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <ArrowUpRight size={12} />
                        <span>Allowance: {formatCurrency(record.allowances)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <ArrowUpRight size={12} />
                        <span>Commission: {formatCurrency(record.commissions)}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                      <ArrowDownRight size={12} />
                      {formatCurrency(record.deductions)}
                    </div>
                    <div className="mt-1 text-[10px] text-navy-300">PF, Tax & Attendance</div>
                  </td>
                  <td>
                    <div className="text-lg font-bold text-navy-900">{formatCurrency(record.netPay)}</div>
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
                      <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-navy-100 bg-white text-navy-600 transition-colors hover:bg-navy-50">
                        <FileText size={16} />
                      </button>
                      <button className="h-9 px-4 flex items-center justify-center gap-2 rounded-lg bg-navy-900 text-xs font-bold text-white transition-all hover:bg-navy-800 active:scale-95">
                        Calculate
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-50 text-navy-200">
                      <Search size={32} />
                    </div>
                    <div>
                      <h4 className="text-lg text-navy-900">No records found</h4>
                      <p className="text-sm text-navy-400">Try adjusting your search or filters</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detailed Modal/Sidepanel could be added here */}
      <div className="glass-card border-none bg-navy-900 p-8 text-white">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gold-400">
              <AlertCircle size={20} />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Quick Tip</span>
            </div>
            <h3 className="text-2xl text-white">Automate your payroll</h3>
            <p className="max-w-xl text-navy-200/70">
              Connecting your attendance machine and POS system will allow for automatic calculation of commissions and late-mark deductions.
            </p>
          </div>
          <button className="btn-premium-accent">
            Configure Integrations
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalaryCalculationPage;
