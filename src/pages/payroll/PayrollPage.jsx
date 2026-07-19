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

import { fetchStaff } from "../../services/api";

// Mock month-wise salary data
const generateMockSalaryData = (year) => {
  const months = [
    "Apr", "May", "Jun", "Jul", "Aug", "Sep", 
    "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"
  ];
  
  return months.map((month, index) => {
    const totalSalary = 180000 + Math.random() * 50000;
    const totalTax = totalSalary * 0.05;
    const totalDeduct = totalSalary * 0.15;
    const totalPaid = index < 3 ? totalSalary - totalDeduct : 0; // First 3 months paid
    const totalPayable = totalSalary - totalDeduct;
    const remaining = totalPayable - totalPaid;
    
    return {
      id: `sal_${year}_${index}`,
      month: `${month}-${year.substring(2, 4)}`,
      fullMonth: `${month} ${index < 9 ? year : parseInt(year) + 1}`,
      totalSalary: Math.round(totalSalary),
      totalTax: Math.round(totalTax),
      totalDeductAmount: Math.round(totalDeduct),
      totalPaidSalary: Math.round(totalPaid),
      totalPayableSalary: Math.round(totalPayable),
      remainingSalary: Math.round(remaining),
      ptPaidDate: index < 3 ? `05-${month}-${index < 9 ? year : parseInt(year) + 1}` : "",
      status: index < 3 ? "paid" : index === 3 ? "pending" : "calculated",
      employeeCount: 8 + Math.floor(Math.random() * 5),
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

  useEffect(() => {
    loadSalaryData();
  }, [selectedMonth]);

  const loadSalaryData = async () => {
    setIsLoading(true);
    try {
      let activeStaff = [];
      try {
        activeStaff = await fetchStaff();
      } catch (err) {
        console.error("Failed to fetch staff list:", err);
      }

      if (activeStaff && activeStaff.length > 0) {
        const year = selectedMonth.split("-")[0];
        const data = generateMockSalaryData(year);
        setSalaryData(data);
      } else {
        setSalaryData([]);
      }
    } catch (err) {
      toast.error("Failed to load salary data");
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
          <div className="flex items-center gap-3">
            {/* Month Selector */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="premium-input !py-2.5 !pr-10 !pl-4 w-36 text-sm font-bold text-navy-900"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 pointer-events-none" />
            </div>

            <button
              onClick={() => navigate("/salary/add")}
              className="btn-premium-primary flex items-center gap-2"
            >
              <Calculator size={18} />
              Calculate Salary
            </button>
            <button
              className="btn-premium-outline flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        }
      />

      {/* Main Table */}
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
          )}
        </div>

        {/* Empty State */}
        {!isLoading && salaryData.length === 0 && (
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
        )}
      </div>

      {/* Bottom Summary Section */}
      <div className="glass-card !p-5 mx-6 mt-6 mb-8">
        <div className="grid grid-cols-6 gap-6">
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
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-navy-100">
          <div className="text-sm text-navy-500">
            SHOWING 1-{salaryData.length} OF {salaryData.length} ITEM(S)
          </div>
          <div className="flex items-center gap-2">
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
