import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { fetchPayrollWithCommission, calculateAllSalaries } from "../../services/mockApi";
import { useToastStore } from "../../stores/toastStore";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/format";
import { 
  Calculator, 
  Plus, 
  ChevronDown,
  Trash2,
  Save,
  RotateCcw,
  Search,
  Filter,
  Download,
  Printer,
  Settings,
  Award,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Building2
} from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = ["2025", "2026", "2027"];

const LEAVE_TYPES = [
  { key: "cl", label: "CL", full: "Casual Leave" },
  { key: "sl", label: "SL", full: "Sick Leave" },
  { key: "ol", label: "OL", full: "Other Leave" },
];

export function SalaryAddPage() {
  const navigate = useNavigate();
  const toast = useToastStore();
  const user = useAuthStore((state) => state.user);
  
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedMonth, setSelectedMonth] = useState("April");
  const [status, setStatus] = useState("Calculated");
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [payrollData, setPayrollData] = useState([]);
  const [editedData, setEditedData] = useState({});

  const monthKey = `${selectedYear}-${String(MONTHS.indexOf(selectedMonth) + 1).padStart(2, "0")}`;

  useEffect(() => {
    loadPayrollData();
  }, [selectedYear, selectedMonth]);

  const loadPayrollData = async () => {
    setIsLoading(true);
    try {
      const records = await fetchPayrollWithCommission(monthKey);
      const transformed = records.map((record) => ({
        id: record.id,
        employeeId: record.employeeId,
        employeeCode: record.employeeId.replace("staff_", "NST").toUpperCase(),
        name: record.name,
        baseSalary: record.baseSalary,
        professionalTax: record.deductions * 0.2,
        cl: 0,
        sl: 0,
        ol: 0,
        full: "C",
        hour: "C",
        r: "C",
        deductionDays: 0,
        adjustment: 0,
        overtime: 0,
        extraHours: 0,
        deductionAmount: record.deductions,
        commission: record.commissions,
        commissionInfo: record.commissionInfo,
        finalSalary: record.netPay,
        status: record.status,
        present: record.attendance?.present || 26,
        absent: record.attendance?.absent || 0,
        leaves: record.attendance?.leaves || 0,
      }));
      setPayrollData(transformed);
      setEditedData({});
      setSelectedRows(new Set());
      setSelectAll(false);
    } catch (err) {
      toast.error("Failed to load payroll data");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return payrollData;
    const query = searchQuery.toLowerCase();
    return payrollData.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.employeeCode.toLowerCase().includes(query)
    );
  }, [payrollData, searchQuery]);

  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, row) => ({
        grossSalary: acc.grossSalary + row.baseSalary,
        proTax: acc.proTax + row.professionalTax,
        finalSalary: acc.finalSalary + row.finalSalary,
        totalDeduct: acc.totalDeduct + row.deductionAmount,
        commission: acc.commission + row.commission,
      }),
      { grossSalary: 0, proTax: 0, finalSalary: 0, totalDeduct: 0, commission: 0 }
    );
  }, [filteredData]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredData.map((r) => r.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectRow = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
    setSelectAll(newSelected.size === filteredData.length);
  };

  const handleFieldChange = (id, field, value) => {
    setEditedData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: parseFloat(value) || 0,
      },
    }));
    
    setPayrollData((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: parseFloat(value) || 0 };
        const dailyRate = updated.baseSalary / 30;
        const leaveDeduction = (updated.cl + updated.sl + updated.ol) * dailyRate;
        const overtimePay = updated.overtime * (dailyRate / 8) * 1.5;
        updated.finalSalary =
          updated.baseSalary +
          updated.commission +
          overtimePay +
          updated.adjustment -
          updated.professionalTax -
          leaveDeduction -
          updated.deductionAmount;
        return updated;
      })
    );
  };

  const handleRecalculate = async () => {
    setIsCalculating(true);
    try {
      await calculateAllSalaries(monthKey);
      await loadPayrollData();
      toast.success("Salaries recalculated successfully");
    } catch (err) {
      toast.error("Failed to recalculate salaries");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success("Payroll saved successfully");
      setEditedData({});
    } catch (err) {
      toast.error("Failed to save payroll");
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) {
      toast.error("Please select rows to delete");
      return;
    }
    const newData = payrollData.filter((row) => !selectedRows.has(row.id));
    setPayrollData(newData);
    setSelectedRows(new Set());
    setSelectAll(false);
    toast.success(`${selectedRows.size} row(s) removed`);
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Page Header */}
      <PageHeader
        eyebrow="Payroll"
        title="Salary Calculation"
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/payroll/commission-masters')}
              className="btn-premium-outline flex items-center gap-2"
              title="Configure Commission Badges"
            >
              <Settings size={16} />
              Commission Rules
            </button>
            <button
              onClick={() => navigate('/bank')}
              className="btn-premium-outline flex items-center gap-2"
            >
              <Building2 size={16} />
              Bank
            </button>
            <button
              onClick={handleSave}
              className="btn-premium-primary flex items-center gap-2"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        }
      />

      {/* Filters Card */}
      <div className="glass-card !p-5 mx-6 mt-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Back Button & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/payroll')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-50 text-navy-700 hover:bg-navy-100 text-sm font-medium"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <div className="h-6 w-px bg-navy-200"></div>
            <span className="text-navy-900 font-semibold">{selectedMonth}-{selectedYear}</span>
          </div>

          <div className="h-8 w-px bg-navy-200 mx-2"></div>

          {/* Year Dropdown */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="premium-input !py-2.5 !pr-10 !pl-4 w-28 text-sm font-medium"
            >
              {YEARS.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 pointer-events-none" />
          </div>

          {/* Month Dropdown */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="premium-input !py-2.5 !pr-10 !pl-4 w-36 text-sm font-medium"
            >
              {MONTHS.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 pointer-events-none" />
          </div>

          {/* Status Badge */}
          <span className="status-badge status-success">
            <CheckCircle2 size={12} className="mr-1" />
            {status}
          </span>

          {/* Re-Calculate Button */}
          <button
            onClick={handleRecalculate}
            disabled={isCalculating}
            className="btn-premium-primary flex items-center gap-2"
          >
            <RotateCcw className={`w-4 h-4 ${isCalculating ? "animate-spin" : ""}`} />
            {isCalculating ? "Calculating..." : "Re-Calculate Salary"}
          </button>

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="premium-input !py-2.5 !pl-10 w-56 text-sm"
            />
          </div>

          {/* Delete Button */}
          <button
            onClick={handleDeleteSelected}
            disabled={selectedRows.size === 0}
            className="btn-premium-outline flex items-center gap-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-navy-100">
          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
            WorkDays 25
          </span>
          <span className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">
            Holidays 1
          </span>
          <span className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-xs font-bold">
            Special Holidays 0
          </span>
          <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
            Compulsory Holidays 0
          </span>
          <div className="ml-auto flex items-center gap-4 text-sm text-navy-600">
            <span className="flex items-center gap-1">
              <User size={14} />
              {filteredData.length} Employees
            </span>
            <span className="flex items-center gap-1">
              <DollarSign size={14} />
              Selected: {selectedRows.size}
            </span>
          </div>
        </div>
      </div>

      {/* Salary Table */}
      <div className="mx-6 mt-6">
        <div className="table-container">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600"></div>
            </div>
          ) : (
            <table className="premium-table text-sm">
              <thead>
                <tr>
                  <th className="w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-navy-300"
                    />
                  </th>
                  <th className="min-w-[200px]">EMPLOYEE</th>
                  <th className="text-right">SALARY</th>
                  <th className="text-center bg-amber-50/50">COMMISSION</th>
                  <th className="text-right bg-yellow-50/50">PRO. TAX</th>
                  <th className="text-center bg-blue-50/50">CL</th>
                  <th className="text-center bg-blue-50/50">SL</th>
                  <th className="text-center bg-blue-50/50">OL</th>
                  <th className="text-center bg-green-50/50">FULL</th>
                  <th className="text-center bg-green-50/50">HOUR</th>
                  <th className="text-center bg-green-50/50">R</th>
                  <th className="text-right bg-rose-50/50">DEDUCT</th>
                  <th className="text-right bg-violet-50/50">ADJUST.</th>
                  <th className="text-right bg-amber-50/50">O.TIME</th>
                  <th className="text-right bg-cyan-50/50">EXT. HR</th>
                  <th className="text-right bg-rose-100/50">DEDUCT(₹)</th>
                  <th className="text-right bg-emerald-100/50">FINAL SALARY</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => (
                  <tr
                    key={row.id}
                    className={selectedRows.has(row.id) ? "bg-blue-50/50" : ""}
                  >
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        className="w-4 h-4 rounded border-navy-300"
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          row.status === "paid" ? "bg-emerald-500" : 
                          row.status === "calculated" ? "bg-blue-500" : "bg-amber-500"
                        }`}></div>
                        <div>
                          <div className="font-bold text-navy-900">
                            {row.employeeCode} - {row.name}
                          </div>
                          {row.commissionInfo?.badge && (
                            <div className="text-[11px] text-navy-400 mt-0.5">
                              {row.commissionInfo.saleCount} sales · {row.commissionInfo.badge.commissionPercent}% commission
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-right font-semibold text-navy-800">
                      {formatCurrency(row.baseSalary)}
                    </td>
                    <td className="text-center bg-amber-50/30">
                      {row.commissionInfo?.badge ? (
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
                            style={{ backgroundColor: row.commissionInfo.badge.color }}
                          >
                            {row.commissionInfo.badge.icon} {row.commissionInfo.badge.name}
                          </span>
                          <span className="text-xs font-semibold text-emerald-600">
                            +{formatCurrency(row.commission)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-navy-400">-</span>
                      )}
                    </td>
                    <td className="text-right bg-yellow-50/30">
                      <input
                        type="number"
                        value={row.professionalTax.toFixed(2)}
                        onChange={(e) => handleFieldChange(row.id, "professionalTax", e.target.value)}
                        className="w-24 text-right border border-navy-200 rounded-lg px-2 py-1 text-sm focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                        step="0.01"
                      />
                    </td>
                    {LEAVE_TYPES.map((lt) => (
                      <td key={lt.key} className="text-center bg-blue-50/20">
                        <input
                          type="number"
                          value={row[lt.key]}
                          onChange={(e) => handleFieldChange(row.id, lt.key, e.target.value)}
                          className="w-14 text-center border border-navy-200 rounded-lg px-1 py-1 text-sm focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                          min="0"
                          step="0.5"
                        />
                      </td>
                    ))}
                    <td className="text-center bg-green-50/20">
                      <span className="px-2 py-1 bg-navy-100 text-navy-700 rounded text-xs font-medium">{row.full}</span>
                    </td>
                    <td className="text-center bg-green-50/20">
                      <span className="px-2 py-1 bg-navy-100 text-navy-700 rounded text-xs font-medium">{row.hour}</span>
                    </td>
                    <td className="text-center bg-green-50/20">
                      <span className="px-2 py-1 bg-navy-100 text-navy-700 rounded text-xs font-medium">{row.r}</span>
                    </td>
                    <td className="text-right bg-rose-50/20">
                      <input
                        type="number"
                        value={row.deductionDays}
                        onChange={(e) => handleFieldChange(row.id, "deductionDays", e.target.value)}
                        className="w-14 text-right border border-navy-200 rounded-lg px-1 py-1 text-sm focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                        min="0"
                      />
                    </td>
                    <td className="text-right bg-violet-50/20">
                      <input
                        type="number"
                        value={row.adjustment.toFixed(3)}
                        onChange={(e) => handleFieldChange(row.id, "adjustment", e.target.value)}
                        className="w-24 text-right border border-navy-200 rounded-lg px-2 py-1 text-sm focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                        step="0.001"
                      />
                    </td>
                    <td className="text-right bg-amber-50/20">
                      <input
                        type="number"
                        value={row.overtime.toFixed(2)}
                        onChange={(e) => handleFieldChange(row.id, "overtime", e.target.value)}
                        className="w-16 text-right border border-navy-200 rounded-lg px-1 py-1 text-sm focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                        step="0.01"
                      />
                    </td>
                    <td className="text-right bg-cyan-50/20">
                      <input
                        type="number"
                        value={row.extraHours.toFixed(0)}
                        onChange={(e) => handleFieldChange(row.id, "extraHours", e.target.value)}
                        className="w-14 text-right border border-navy-200 rounded-lg px-1 py-1 text-sm focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                      />
                    </td>
                    <td className="text-right font-semibold text-rose-600">
                      {formatCurrency(row.deductionAmount)}
                    </td>
                    <td className="text-right font-bold text-emerald-600 text-base">
                      {formatCurrency(row.finalSalary)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-navy-50/50 border-t-2 border-navy-200">
                <tr>
                  <td></td>
                  <td className="font-bold text-navy-900 text-sm">TOTAL</td>
                  <td className="text-right font-bold text-navy-900">
                    {formatCurrency(totals.grossSalary)}
                  </td>
                  <td className="text-right font-bold text-emerald-700 bg-amber-100/50">
                    {formatCurrency(totals.commission)}
                  </td>
                  <td className="text-right font-bold text-navy-900 bg-yellow-100/50">
                    {formatCurrency(totals.proTax)}
                  </td>
                  <td className="bg-blue-50/50"></td>
                  <td className="bg-blue-50/50"></td>
                  <td className="bg-blue-50/50"></td>
                  <td className="bg-green-50/50"></td>
                  <td className="bg-green-50/50"></td>
                  <td className="bg-green-50/50"></td>
                  <td className="bg-rose-50/50"></td>
                  <td className="bg-violet-50/50"></td>
                  <td className="bg-amber-50/50"></td>
                  <td className="bg-cyan-50/50"></td>
                  <td className="text-right font-bold text-rose-700 bg-rose-100/50">
                    {formatCurrency(totals.totalDeduct)}
                  </td>
                  <td className="text-right font-bold text-emerald-700 bg-emerald-100/50 text-base">
                    {formatCurrency(totals.finalSalary)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Bottom Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mx-6 mt-6 mb-8">
        <div className="glass-card !p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-navy-100 flex items-center justify-center text-navy-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Total Gross Salary</p>
            <p className="text-xl font-black text-navy-900">{formatCurrency(totals.grossSalary)}</p>
          </div>
        </div>
        <div className="glass-card !p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center text-yellow-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Total Pro. Tax</p>
            <p className="text-xl font-black text-navy-900">{formatCurrency(totals.proTax)}</p>
          </div>
        </div>
        <div className="glass-card !p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Total Final Salary</p>
            <p className="text-xl font-black text-emerald-600">{formatCurrency(totals.finalSalary)}</p>
          </div>
        </div>
        <div className="glass-card !p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
            <ArrowDownRight size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Total Deduct</p>
            <p className="text-xl font-black text-rose-600">{formatCurrency(totals.totalDeduct)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
