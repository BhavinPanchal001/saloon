import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToastStore } from "../../stores/toastStore";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/format";
import { 
  Calculator,
  ChevronDown,
  Download,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar
} from "lucide-react";

import { fetchStaff, fetchOutlets, fetchPayrollSummaries } from "../../services/api";

// Calculate dynamic month-wise salary data based on active staff and their contracts
const calculateSalaryDataFromStaff = (activeStaff, year) => {
  const months = [
    { key: "04", abbrev: "Apr", name: "April" },
    { key: "05", abbrev: "May", name: "May" },
    { key: "06", abbrev: "Jun", name: "June" },
    { key: "07", abbrev: "Jul", name: "July" },
    { key: "08", abbrev: "Aug", name: "August" },
    { key: "09", abbrev: "Sep", name: "September" },
    { key: "10", abbrev: "Oct", name: "October" },
    { key: "11", abbrev: "Nov", name: "November" },
    { key: "12", abbrev: "Dec", name: "December" },
    { key: "01", abbrev: "Jan", name: "January" },
    { key: "02", abbrev: "Feb", name: "February" },
    { key: "03", abbrev: "Mar", name: "March" }
  ];

  // Current year/month from current local date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth() + 1; // 1-based index (1-12)
  
  return months.map((monthItem, index) => {
    // Determine the calendar year for this fiscal month
    const calYear = index < 9 ? parseInt(year) : parseInt(year) + 1;
    
    // Determine status relative to current date (July 2026):
    // Past months -> paid
    // Current month -> pending
    // Future months -> calculated
    let status = "calculated";
    let ptPaidDate = "";
    
    if (calYear < currentYear || (calYear === currentYear && parseInt(monthItem.key) < currentMonthNum)) {
      status = "paid";
      ptPaidDate = `05-${monthItem.abbrev}-${calYear}`;
    } else if (calYear === currentYear && parseInt(monthItem.key) === currentMonthNum) {
      status = "pending";
    }

    // Sum details from actual activeStaff list
    let totalSalary = 0;
    let totalTax = 0;
    let totalDeduct = 0;
    
    activeStaff.forEach((staff) => {
      const baseVal = Number(staff.baseSalary) || 30000;
      const taxRate = Number(staff.taxValue) || 5;
      const taxVal = Math.round(baseVal * (taxRate / 100));
      const deductVal = Number(staff.pfDeduction) || Math.round(baseVal * 0.12);
      
      totalSalary += baseVal;
      totalTax += taxVal;
      totalDeduct += deductVal;
    });

    const totalPayable = totalSalary - totalDeduct;
    const totalPaid = status === "paid" ? totalPayable : 0;
    const remaining = totalPayable - totalPaid;

    return {
      id: `sal_${year}_${monthItem.key}`,
      month: `${monthItem.abbrev}-${String(calYear).substring(2, 4)}`,
      fullMonth: `${monthItem.name} ${calYear}`,
      totalSalary,
      totalTax,
      totalDeductAmount: totalDeduct,
      totalPaidSalary: totalPaid,
      totalPayableSalary: totalPayable,
      remainingSalary: remaining,
      ptPaidDate,
      status,
      employeeCount: activeStaff.length,
    };
  });
};

export function PayrollPage() {
  const navigate = useNavigate();
  const toast = useToastStore();
  const user = useAuthStore((state) => state.user);
  
  const [selectedMonth, setSelectedMonth] = useState("2026-04");
  const [currentPage, setCurrentPage] = useState(1);
  const [salaryData, setSalaryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState("all");

  const MONTHS = [
    { value: "2026-04", label: "Apr 2026" },
    { value: "2026-05", label: "May 2026" },
    { value: "2026-06", label: "Jun 2026" },
    { value: "2026-07", label: "Jul 2026" },
    { value: "2026-08", label: "Aug 2026" },
    { value: "2026-09", label: "Sep 2026" },
    { value: "2026-10", label: "Oct 2026" },
    { value: "2026-11", label: "Nov 2026" },
    { value: "2026-12", label: "Dec 2026" },
    { value: "2027-01", label: "Jan 2027" },
    { value: "2027-02", label: "Feb 2027" },
    { value: "2027-03", label: "Mar 2027" },
  ];

  // Load Outlets list on mount
  useEffect(() => {
    const loadOutlets = async () => {
      try {
        const data = await fetchOutlets();
        setOutlets(data || []);
      } catch (err) {
        console.error("Failed to load outlets:", err);
      }
    };
    loadOutlets();
  }, []);

  useEffect(() => {
    loadSalaryData();
  }, [selectedMonth, selectedOutlet]);

  const loadSalaryData = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (selectedOutlet !== "all") {
        params.outletId = selectedOutlet;
      }
      
      const data = await fetchPayrollSummaries(params);
      
      const year = selectedMonth.split("-")[0];
      const startYear = parseInt(year);
      const endYear = startYear + 1;
      
      const fiscalMonths = [
        `${startYear}-04`, `${startYear}-05`, `${startYear}-06`, `${startYear}-07`, `${startYear}-08`, `${startYear}-09`, `${startYear}-10`, `${startYear}-11`, `${startYear}-12`,
        `${endYear}-01`, `${endYear}-02`, `${endYear}-03`
      ];

      const filteredData = data.filter(p => fiscalMonths.includes(p.month_key || p.month));

      const mappedData = filteredData.map(p => {
        const [y, m] = (p.month_key || p.month).split("-");
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthFullName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthIndex = parseInt(m) - 1;
        const abbrev = monthNames[monthIndex];
        const fullName = monthFullName[monthIndex];

        return {
          id: p.id,
          month: `${abbrev}-${y.substring(2, 4)}`,
          fullMonth: `${fullName} ${y}`,
          totalSalary: Number(p.totalSalary || 0),
          totalTax: Number(p.totalTax || 0),
          totalDeductAmount: Number(p.totalDeductAmount || 0),
          totalPaidSalary: Number(p.totalPaidSalary || 0),
          totalPayableSalary: Number(p.totalPayableSalary || 0),
          remainingSalary: Number(p.remainingSalary || 0),
          ptPaidDate: p.ptPaidDate || "",
          status: p.status || "calculated",
          employeeCount: p.employeeCount || 0,
        };
      });

      setSalaryData(mappedData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load salary data");
      setSalaryData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totals = useMemo(() => {
    return salaryData.reduce((acc, row) => ({
      totalSalary: acc.totalSalary + row.totalSalary,
      totalTax: acc.totalTax + row.totalTax,
      totalDeduct: acc.totalDeduct + row.totalDeductAmount,
      totalPaid: acc.totalPaid + row.totalPaidSalary,
      totalPayable: acc.totalPayable + row.totalPayableSalary,
      totalRemaining: acc.totalRemaining + row.remainingSalary,
    }), { totalSalary: 0, totalTax: 0, totalDeduct: 0, totalPaid: 0, totalPayable: 0, totalRemaining: 0 });
  }, [salaryData]);

  const handleCalculateSalary = (monthData) => {
    navigate("/salary/add", { 
      state: { 
        month: monthData.fullMonth,
        year: selectedMonth.split("-")[0],
        salaryData: monthData 
      }
    });
  };

  const handlePaySalary = (monthData) => {
    navigate("/salary/pay", { 
      state: { 
        month: monthData.fullMonth,
        monthKey: monthData.id,
        selectedMonth: selectedMonth,
        salaryData: monthData 
      }
    });
  };

  const handleViewDetails = (monthData) => {
    navigate(`/salary/view/${monthData.id}`, { state: { salaryData: monthData } });
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Page Header */}
      <PageHeader
        eyebrow="Payroll"
        title="Salary List"
        action={
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Outlet Selector */}
            <div className="relative w-full sm:w-44">
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="premium-input !py-2.5 !pr-10 !pl-4 text-sm font-bold text-navy-900 appearance-none bg-white"
              >
                <option value="all">All Outlets</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 pointer-events-none" />
            </div>

            {/* Month Selector */}
            <div className="relative w-full sm:w-36">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="premium-input !py-2.5 !pr-10 !pl-4 text-sm font-bold text-navy-900 appearance-none bg-white"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 pointer-events-none" />
            </div>

            <button
              onClick={() => navigate("/salary/add")}
              className="btn-premium-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Calculator size={18} />
              <span>Calculate Salary</span>
            </button>
            <button
              className="btn-premium-outline flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Download size={16} />
              <span>Export</span>
            </button>
          </div>
        }
      />

      {/* Main Content Area (Table / Card Grid) */}
      <div className="mx-6 mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600"></div>
          </div>
        ) : salaryData.length === 0 ? (
          <div className="glass-card !p-12 text-center mt-6">
            <div className="w-16 h-16 rounded-full bg-navy-50 flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-navy-300" />
            </div>
            <h3 className="text-lg font-bold text-navy-900 mb-2">No salary records found</h3>
            <button 
              onClick={() => loadSalaryData()}
              className="btn-premium-outline"
            >
              Reload
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block table-container overflow-x-auto custom-scrollbar">
              <table className="premium-table text-sm min-w-[1000px]">
                <thead>
                  <tr>
                    <th className="w-12 text-center">#</th>
                    <th>MONTH</th>
                    <th className="text-right">TOTAL<br/>SALARY</th>
                    <th className="text-right">TOTAL<br/>TAX</th>
                    <th className="text-right">TOTAL DEDUCT<br/>AMOUNT</th>
                    <th className="text-right">TOTAL PAID<br/>SALARY</th>
                    <th className="text-right">TOTAL PAYABLE<br/>SALARY</th>
                    <th className="text-right">REMAINING<br/>SALARY</th>
                    <th className="text-center">PT PAID<br/>DATE</th>
                    <th className="text-center w-32">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryData.map((row, index) => (
                    <tr key={row.id}>
                      <td className="text-center font-medium text-navy-500">
                        {index + 1}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            row.status === "paid" ? "bg-emerald-500" : 
                            row.status === "pending" ? "bg-amber-500" : "bg-blue-500"
                          }`}></div>
                          <div>
                            <div className="font-bold text-navy-900">{row.month}</div>
                            <div className="text-xs text-navy-400">{row.employeeCount} employees</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right font-semibold text-navy-800">
                        {formatCurrency(row.totalSalary)}
                      </td>
                      <td className="text-right text-navy-600">
                        {formatCurrency(row.totalTax)}
                      </td>
                      <td className="text-right font-medium text-rose-600">
                        {formatCurrency(row.totalDeductAmount)}
                      </td>
                      <td className="text-right font-medium text-emerald-600">
                        {formatCurrency(row.totalPaidSalary)}
                      </td>
                      <td className="text-right font-bold text-navy-900">
                        {formatCurrency(row.totalPayableSalary)}
                      </td>
                      <td className="text-right font-bold text-amber-600">
                        {formatCurrency(row.remainingSalary)}
                      </td>
                      <td className="text-center">
                        {row.ptPaidDate ? (
                          <span className="text-sm text-navy-600">{row.ptPaidDate}</span>
                        ) : (
                          <span className="text-xs text-navy-400">-</span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleViewDetails(row)}
                            className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400 hover:text-navy-600"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400 hover:text-navy-600"
                            title="Edit"
                          >
                            <FileText size={16} />
                          </button>
                          <button 
                            className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400 hover:text-navy-600"
                            title="Print"
                          >
                            <FileText size={16} />
                          </button>
                          <button 
                            className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400 hover:text-navy-600"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                          {row.status !== "paid" && (
                            <button 
                              onClick={() => handlePaySalary(row)}
                              className="ml-1 px-3 py-1.5 bg-navy-600 text-white text-xs font-bold rounded-lg hover:bg-navy-700"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Grid View */}
            <div className="block md:hidden space-y-4">
              {salaryData.map((row, index) => (
                <div key={row.id} className="glass-card !p-4 border border-white/50 bg-white/60 shadow-sm">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-navy-100/50">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        row.status === "paid" ? "bg-emerald-500" : 
                        row.status === "pending" ? "bg-amber-500" : "bg-blue-500"
                      }`}></div>
                      <div>
                        <span className="font-bold text-base text-navy-900">{row.month}</span>
                        <span className="text-xs text-navy-400 ml-2">({row.employeeCount} employees)</span>
                      </div>
                    </div>
                    <span className={`status-badge ${
                      row.status === "paid" ? "status-success" :
                      row.status === "pending" ? "status-warning" : "status-active"
                    }`}>
                      {row.status}
                    </span>
                  </div>

                  {/* Card Body - Grid of Values */}
                  <div className="grid grid-cols-2 gap-3 py-4 text-xs">
                    <div>
                      <p className="text-navy-400 mb-0.5 font-medium uppercase tracking-wider text-[9px]">Total Salary</p>
                      <p className="font-semibold text-navy-800 text-sm">{formatCurrency(row.totalSalary)}</p>
                    </div>
                    <div>
                      <p className="text-navy-400 mb-0.5 font-medium uppercase tracking-wider text-[9px]">Total Tax</p>
                      <p className="font-medium text-navy-600 text-sm">{formatCurrency(row.totalTax)}</p>
                    </div>
                    <div>
                      <p className="text-navy-400 mb-0.5 font-medium uppercase tracking-wider text-[9px]">Deduction</p>
                      <p className="font-medium text-rose-600 text-sm">{formatCurrency(row.totalDeductAmount)}</p>
                    </div>
                    <div>
                      <p className="text-navy-400 mb-0.5 font-medium uppercase tracking-wider text-[9px]">Paid Salary</p>
                      <p className="font-medium text-emerald-600 text-sm">{formatCurrency(row.totalPaidSalary)}</p>
                    </div>
                    <div>
                      <p className="text-navy-400 mb-0.5 font-medium uppercase tracking-wider text-[9px]">Payable Salary</p>
                      <p className="font-bold text-navy-900 text-sm">{formatCurrency(row.totalPayableSalary)}</p>
                    </div>
                    <div>
                      <p className="text-navy-400 mb-0.5 font-medium uppercase tracking-wider text-[9px]">Remaining</p>
                      <p className="font-bold text-amber-600 text-sm">{formatCurrency(row.remainingSalary)}</p>
                    </div>
                  </div>

                  {/* Card Footer - Info & Actions */}
                  <div className="flex flex-col gap-3 pt-3 border-t border-navy-100/50 justify-between items-stretch">
                    <div className="text-xs text-navy-500">
                      <span>PT Paid Date: </span>
                      <span className="font-semibold text-navy-700">{row.ptPaidDate || "-"}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 justify-end">
                      <button 
                        onClick={() => handleViewDetails(row)}
                        className="p-2 rounded-xl bg-navy-50 hover:bg-navy-100 text-navy-500 hover:text-navy-700 active:scale-95"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="p-2 rounded-xl bg-navy-50 hover:bg-navy-100 text-navy-500 hover:text-navy-700 active:scale-95"
                        title="Edit"
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        className="p-2 rounded-xl bg-navy-50 hover:bg-navy-100 text-navy-500 hover:text-navy-700 active:scale-95"
                        title="Print"
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        className="p-2 rounded-xl bg-navy-50 hover:bg-navy-100 text-navy-500 hover:text-navy-700 active:scale-95"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      {row.status !== "paid" && (
                        <button 
                          onClick={() => handlePaySalary(row)}
                          className="px-4 py-2 bg-navy-600 text-white text-xs font-bold rounded-xl hover:bg-navy-700 shadow-sm active:scale-95"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom Summary Section */}
      <div className="glass-card !p-5 mx-6 mt-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-1">Total Salary</p>
            <p className="text-lg font-bold text-navy-900">{formatCurrency(totals.totalSalary)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-1">Total Tax</p>
            <p className="text-lg font-bold text-amber-600">{formatCurrency(totals.totalTax)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-1">Total Deduct</p>
            <p className="text-lg font-bold text-rose-600">{formatCurrency(totals.totalDeduct)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-1">Total Payable</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(totals.totalPayable)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-1">Total Paid</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.totalPaid)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-1">Remaining</p>
            <p className="text-lg font-bold text-violet-600">{formatCurrency(totals.totalRemaining)}</p>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mt-6 pt-4 border-t border-navy-100">
          <div className="text-sm text-navy-500 text-center sm:text-left">
            SHOWING 1-{salaryData.length} OF {salaryData.length} ITEM(S)
          </div>
          <div className="flex items-center justify-center gap-2">
            <button 
              className="p-2 rounded-lg border border-navy-200 hover:bg-navy-50 disabled:opacity-50"
              disabled
            >
              <ChevronLeft size={16} className="text-navy-600" />
            </button>
            <button className="w-8 h-8 rounded-lg bg-navy-600 text-white text-sm font-bold">
              1
            </button>
            <button className="w-8 h-8 rounded-lg border border-navy-200 text-navy-600 text-sm font-bold hover:bg-navy-50">
              2
            </button>
            <button className="w-8 h-8 rounded-lg border border-navy-200 text-navy-600 text-sm font-bold hover:bg-navy-50">
              3
            </button>
            <button className="p-2 rounded-lg border border-navy-200 hover:bg-navy-50">
              <ChevronRight size={16} className="text-navy-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
