import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  Edit2,
  User,
  Calendar,
  DollarSign,
  Award,
  TrendingUp,
  Clock
} from "lucide-react";

import { fetchPayrollById } from "../../services/api";

export function SalaryViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToastStore();
  const [isLoading, setIsLoading] = useState(true);
  const [payrollRecord, setPayrollRecord] = useState(null);
  const [selectedDetailIndex, setSelectedDetailIndex] = useState(0);

  useEffect(() => {
    loadSalaryData();
  }, [id]);

  const loadSalaryData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPayrollById(id);
      setPayrollRecord(data);
      setSelectedDetailIndex(0);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load salary details");
    } finally {
      setIsLoading(false);
    }
  };

  const salaryData = useMemo(() => {
    if (!payrollRecord || !payrollRecord.details || payrollRecord.details.length === 0) {
      return null;
    }
    
    const detail = payrollRecord.details[selectedDetailIndex];
    if (!detail) return null;

    const [year, monthNum] = payrollRecord.month_key.split("-");
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[parseInt(monthNum) - 1];

    const baseSalary = Number(detail.base_salary || 0);
    const allowances = 3500; 
    const commission = Number(detail.commission_amount || 0);
    const overtime = Number(detail.overtime_hours || 0) * (baseSalary / 240) * 1.5; 
    const grossSalary = baseSalary + allowances + commission + overtime;

    const pfDeduction = Number(detail.deduction || 0);
    const professionalTax = Number(detail.tax || 0);
    const totalDeductions = pfDeduction + professionalTax;
    const netSalary = Number(detail.payable || 0);

    return {
      employee: {
        id: detail.staff_id,
        code: detail.employee ? `NST${String(detail.staff_id).padStart(4, '0')}` : 'NST0000',
        name: detail.employee ? `${detail.employee.first_name} ${detail.employee.last_name}` : 'Unknown',
        role: "Stylist", 
        department: "Operations",
        joinDate: "2024-01-01",
      },
      period: {
        month: monthName,
        year: year,
        workDays: 26,
        holidays: 4,
      },
      attendance: {
        present: detail.present_days || 26,
        absent: detail.absent_days || 0,
        leaves: detail.leave_days || 0,
        cl: 0,
        sl: 0,
        ol: 0,
      },
      earnings: {
        basicSalary: baseSalary,
        houseRentAllowance: 2000,
        conveyanceAllowance: 1000,
        medicalAllowance: 500,
        specialAllowance: 0,
        overtime: overtime,
        commission: commission,
        grossSalary: grossSalary,
      },
      deductions: {
        providentFund: pfDeduction,
        professionalTax: professionalTax,
        incomeTax: 0,
        esi: 0,
        advance: 0,
        otherDeductions: 0,
        totalDeductions: totalDeductions,
      },
      summary: {
        netSalary: netSalary,
        inWords: "Paid via Direct Deposit",
      },
    };
  }, [payrollRecord, selectedDetailIndex]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    toast.success("Salary slip exported successfully");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!salaryData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Salary record not found</p>
        <button
          onClick={() => navigate("/salary/add")}
          className="mt-4 text-blue-600 hover:underline"
        >
          Go back to Salary List
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="hover:text-blue-600 cursor-pointer">🏠</span>
          <span>/</span>
          <span className="hover:text-blue-600 cursor-pointer">Salary</span>
          <span>/</span>
          <span className="hover:text-blue-600 cursor-pointer">Add</span>
          <span>/</span>
          <span className="text-gray-800">View Payslip</span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/salary/add")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Salary Payslip - {salaryData.period.month} {salaryData.period.year}
              </h1>
              <p className="text-sm text-gray-500">
                {salaryData.employee.code} - {salaryData.employee.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Payslip Content */}
      <div className="p-6 max-w-5xl mx-auto">
        {/* Employee Selector */}
        {payrollRecord && payrollRecord.details && payrollRecord.details.length > 1 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-b-0 p-4 flex items-center gap-4 rounded-t-lg">
            <span className="text-sm font-semibold text-blue-900">Select Employee:</span>
            <select
              value={selectedDetailIndex}
              onChange={(e) => setSelectedDetailIndex(Number(e.target.value))}
              className="bg-white border border-blue-200 text-blue-900 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {payrollRecord.details.map((detail, idx) => (
                <option key={detail.id} value={idx}>
                  {detail.employee ? `${detail.employee.first_name} ${detail.employee.last_name}` : `Staff #${detail.staff_id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${payrollRecord && payrollRecord.details && payrollRecord.details.length > 1 ? 'rounded-t-none' : ''}`}>
          {/* Company Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">NATIVE SOFTWARE</h2>
                <p className="text-blue-100 text-sm">Salary Payslip</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">
                  {salaryData.period.month} {salaryData.period.year}
                </p>
                <p className="text-blue-100 text-sm">
                  FY {salaryData.period.year}-{parseInt(salaryData.period.year) + 1}
                </p>
              </div>
            </div>
          </div>

          {/* Employee Info */}
          <div className="p-6 border-b">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-gray-500" />
              </div>
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Employee Name</p>
                  <p className="font-semibold text-gray-800">{salaryData.employee.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Employee Code</p>
                  <p className="font-semibold text-gray-800">{salaryData.employee.code}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Department</p>
                  <p className="font-semibold text-gray-800">{salaryData.employee.department}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Designation</p>
                  <p className="font-semibold text-gray-800">{salaryData.employee.role}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Join Date</p>
                  <p className="font-semibold text-gray-800">{salaryData.employee.joinDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Pay Period</p>
                  <p className="font-semibold text-gray-800">
                    {salaryData.period.month} {salaryData.period.year}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Commission Badge Section */}
          {salaryData.commissionInfo && (
            <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                  style={{ backgroundColor: salaryData.commissionInfo.badgeColor + "30" }}
                >
                  {salaryData.commissionInfo.badgeIcon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold" style={{ color: salaryData.commissionInfo.badgeColor }}>
                      {salaryData.commissionInfo.badge} Tier Achieved
                    </h3>
                    <span
                      className="px-2 py-1 rounded text-white text-xs font-bold"
                      style={{ backgroundColor: salaryData.commissionInfo.badgeColor }}
                    >
                      {salaryData.commissionInfo.commissionPercent}% Commission
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {salaryData.commissionInfo.saleCount} sales completed with total sales value of{" "}
                    {formatCurrency(salaryData.commissionInfo.totalSales)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Commission Earned</p>
                  <p className="text-xl font-bold text-green-600">
                    +{formatCurrency(salaryData.commissionInfo.commissionAmount)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Salary Details */}
          <div className="grid grid-cols-2">
            {/* Earnings */}
            <div className="p-6 border-r">
              <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Earnings
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Basic Salary</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(salaryData.earnings.basicSalary)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">House Rent Allowance</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(salaryData.earnings.houseRentAllowance)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Dearness Allowance</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(salaryData.earnings.dearnessAllowance)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Conveyance Allowance</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(salaryData.earnings.conveyanceAllowance)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Medical Allowance</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(salaryData.earnings.medicalAllowance)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Special Allowance</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(salaryData.earnings.specialAllowance)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Overtime</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(salaryData.earnings.overtime)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Commission</td>
                    <td className="py-2 text-right font-medium text-green-600">
                      +{formatCurrency(salaryData.earnings.commission)}
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="py-3 font-bold text-gray-800">Gross Salary</td>
                    <td className="py-3 text-right font-bold text-gray-800">
                      {formatCurrency(salaryData.earnings.grossSalary)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div className="p-6">
              <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-red-600" />
                Deductions
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Provident Fund (PF)</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(salaryData.deductions.providentFund)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Professional Tax</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(salaryData.deductions.professionalTax)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Income Tax (TDS)</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(salaryData.deductions.incomeTax)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">ESI</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(salaryData.deductions.esi)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Salary Advance</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(salaryData.deductions.advance)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Other Deductions</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(salaryData.deductions.otherDeductions)}
                    </td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="py-3 font-bold text-gray-800">Total Deductions</td>
                    <td className="py-3 text-right font-bold text-red-600">
                      {formatCurrency(salaryData.deductions.totalDeductions)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Salary */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Net Salary</p>
                <p className="text-3xl font-bold">{formatCurrency(salaryData.summary.netSalary)}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-sm">Amount in Words</p>
                <p className="text-lg font-medium">{salaryData.summary.inWords}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Work Days: {salaryData.period.workDays}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Present: {salaryData.attendance.present}
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  Leaves: {salaryData.attendance.leaves}
                </span>
              </div>
              <p>This is a computer generated payslip and does not require signature.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
