import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";
import { 
  ChevronLeft,
  Calendar,
  Building2,
  Check,
  X,
  ChevronDown,
  Save,
  Printer,
  ArrowRight
} from "lucide-react";

// Mock bank accounts
const BANK_ACCOUNTS = [
  { id: "bank_1", name: "HDFC Bank - 1234567890", bank: "HDFC" },
  { id: "bank_2", name: "ICICI Bank - 9876543210", bank: "ICICI" },
  { id: "bank_3", name: "SBI Bank - 5555666677", bank: "SBI" },
];

// Mock employees for payment
const generateMockEmployees = (month) => {
  const employees = [
    { id: "emp_1", code: "NST0058", name: "Aayushi Patel", salary: 3800 },
    { id: "emp_2", code: "NST0056", name: "Abhi Patel", salary: 11760 },
    { id: "emp_3", code: "NST0051", name: "Abhi Patel", salary: 29800 },
    { id: "emp_4", code: "NS0026", name: "Bhavin Panchal", salary: 50800 },
    { id: "emp_5", code: "NS0031", name: "Feni Patel", salary: 22685 },
    { id: "emp_6", code: "NS0032", name: "Kinjal Patel", salary: 26534 },
    { id: "emp_7", code: "NST0049", name: "Nishi Avadhiya", salary: 14800 },
    { id: "emp_8", code: "NST0052", name: "Raj Panchal", salary: 14800 },
  ];
  
  return employees.map(emp => ({
    ...emp,
    selected: true,
    payAccount: "",
    payDate: "",
  }));
};

export function SalaryPayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastStore();
  
  const { month = "Apr-2026", salaryData = {} } = location.state || {};
  
  const [paymentDate, setPaymentDate] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [payOnDiffDate, setPayOnDiffDate] = useState(false);
  const [payOnDiffAcc, setPayOnDiffAcc] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Load employees for this month
    const empData = generateMockEmployees(month);
    setEmployees(empData);
  }, [month]);

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setEmployees(prev => prev.map(emp => ({ ...emp, selected: newSelectAll })));
  };

  const handleSelectEmployee = (id) => {
    setEmployees(prev => 
      prev.map(emp => 
        emp.id === id ? { ...emp, selected: !emp.selected } : emp
      )
    );
    // Update selectAll based on if all are selected
    const updated = employees.map(emp => emp.id === id ? { ...emp, selected: !emp.selected } : emp);
    setSelectAll(updated.every(e => e.selected));
  };

  const handleEmployeeBankChange = (id, bankId) => {
    setEmployees(prev =>
      prev.map(emp =>
        emp.id === id ? { ...emp, payAccount: bankId } : emp
      )
    );
  };

  const handleEmployeeDateChange = (id, date) => {
    setEmployees(prev =>
      prev.map(emp =>
        emp.id === id ? { ...emp, payDate: date } : emp
      )
    );
  };

  const selectedEmployees = employees.filter(e => e.selected);
  const totalAmount = selectedEmployees.reduce((sum, emp) => sum + emp.salary, 0);

  const handleConfirmPay = async () => {
    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }
    if (!paymentDate && !payOnDiffDate) {
      toast.error("Please select a payment date");
      return;
    }
    if (!selectedBank && !payOnDiffAcc) {
      toast.error("Please select a bank account");
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Salary payment of ${formatCurrency(totalAmount)} processed for ${selectedEmployees.length} employees`);
      navigate("/payroll");
    } catch (err) {
      toast.error("Failed to process payment");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Page Header */}
      <PageHeader
        eyebrow="Payroll"
        title={`Pay Salary - ${month}`}
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="btn-premium-outline flex items-center gap-2"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          </div>
        }
      />

      {/* Payment Form Card */}
      <div className="glass-card !p-5 mx-6 mt-6">
        <div className="flex flex-wrap items-end gap-6">
          {/* Date */}
          <div className="flex-1 min-w-[200px]">
            <label className="premium-label !text-[10px] !mb-1.5">Date</label>
            <div className="relative">
              <input
                type="text"
                placeholder="DD-MM-YYYY"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="premium-input !py-2.5 !pl-3 !pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
            </div>
            <label className="flex items-center gap-2 mt-2 text-sm text-navy-600 cursor-pointer">
              <input
                type="checkbox"
                checked={payOnDiffDate}
                onChange={(e) => setPayOnDiffDate(e.target.checked)}
                className="w-4 h-4 rounded border-navy-300"
              />
              Pay on Diff Dt
            </label>
          </div>

          {/* Account */}
          <div className="flex-1 min-w-[200px]">
            <label className="premium-label !text-[10px] !mb-1.5">Account</label>
            <div className="relative">
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="premium-input !py-2.5 !pr-10 appearance-none"
              >
                <option value="">Select Bank Account</option>
                {BANK_ACCOUNTS.map(bank => (
                  <option key={bank.id} value={bank.id}>{bank.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 pointer-events-none" />
            </div>
            <label className="flex items-center gap-2 mt-2 text-sm text-navy-600 cursor-pointer">
              <input
                type="checkbox"
                checked={payOnDiffAcc}
                onChange={(e) => setPayOnDiffAcc(e.target.checked)}
                className="w-4 h-4 rounded border-navy-300"
              />
              Pay on Diff Acc
            </label>
          </div>

          {/* Month Display */}
          <div className="flex-1 min-w-[150px]">
            <label className="premium-label !text-[10px] !mb-1.5">Period</label>
            <div className="premium-input !py-2.5 bg-navy-50 text-navy-900 font-semibold">
              {month}
            </div>
          </div>

          {/* Confirm & Pay Button */}
          <div className="flex-shrink-0">
            <label className="premium-label !text-[10px] !mb-1.5 opacity-0">Action</label>
            <button
              onClick={handleConfirmPay}
              disabled={isProcessing}
              className="btn-premium-primary flex items-center gap-2 !bg-navy-600 hover:!bg-navy-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Confirm & Pay
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="mx-6 mt-6">
        <div className="table-container">
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
                <th className="min-w-[250px]">EMPLOYEE</th>
                <th className="text-right">SALARY</th>
                <th className="min-w-[200px]">PAY ACC</th>
                <th className="min-w-[150px]">PAY DATE</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={emp.selected}
                      onChange={() => handleSelectEmployee(emp.id)}
                      className="w-4 h-4 rounded border-navy-300"
                    />
                  </td>
                  <td>
                    <div className="font-bold text-navy-900">
                      {emp.code} - {emp.name}
                    </div>
                  </td>
                  <td className="text-right font-semibold text-navy-800">
                    {formatCurrency(emp.salary)}
                  </td>
                  <td>
                    <div className="relative">
                      <select
                        value={emp.payAccount}
                        onChange={(e) => handleEmployeeBankChange(emp.id, e.target.value)}
                        className="w-full premium-input !py-2 !pr-8 !text-sm appearance-none"
                        disabled={!emp.selected}
                      >
                        <option value="">Select Account</option>
                        {BANK_ACCOUNTS.map(bank => (
                          <option key={bank.id} value={bank.id}>{bank.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-navy-400 pointer-events-none" />
                    </div>
                  </td>
                  <td>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="DD-MM-YYYY"
                        value={emp.payDate}
                        onChange={(e) => handleEmployeeDateChange(emp.id, e.target.value)}
                        className="w-full premium-input !py-2 !pr-8 !text-sm"
                        disabled={!emp.selected}
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-navy-400" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-navy-50/50 border-t-2 border-navy-200">
              <tr>
                <td></td>
                <td className="font-bold text-navy-900">
                  TOTAL ({selectedEmployees.length} employees)
                </td>
                <td className="text-right font-bold text-navy-900 text-base">
                  {formatCurrency(totalAmount)}
                </td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mx-6 mt-6 mb-8">
        <div className="glass-card !p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-navy-100 flex items-center justify-center text-navy-600">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Bank Account</p>
            <p className="text-lg font-bold text-navy-900">
              {selectedBank ? BANK_ACCOUNTS.find(b => b.id === selectedBank)?.bank : "Not Selected"}
            </p>
          </div>
        </div>
        <div className="glass-card !p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Check size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Selected Employees</p>
            <p className="text-lg font-bold text-emerald-600">{selectedEmployees.length}</p>
          </div>
        </div>
        <div className="glass-card !p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
            <ArrowRight size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Total Payable</p>
            <p className="text-lg font-bold text-amber-600">{formatCurrency(totalAmount)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
