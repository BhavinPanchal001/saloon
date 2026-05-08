import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { generatePayrollPreview, exportPayrollToCSV } from "../../services/mockApi";
import { useAuthStore } from "../../stores/authStore";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";
import { Download, Printer } from "lucide-react";

export function PayrollPage() {
  const user = useAuthStore((state) => state.user);
  const toast = useToastStore();
  const [rows, setRows] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);

  const loadPayroll = async () => {
    const preview = await generatePayrollPreview({
      outletId: user?.role === "admin" ? undefined : user?.outlet_id,
    });
    setRows(preview);
  };

  useEffect(() => {
    if (user) {
      loadPayroll();
    }
  }, [user]);

  const handleGeneratePayroll = async () => {
    // Simulate API call for payroll generation
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Generate payroll entries for all staff
    const newPayrollEntries = rows.map((member) => {
      const baseSalary = member.baseSalary || 3000;
      const attendanceDays = Math.floor(Math.random() * 5) + 25; // 25-30 days
      const dailyRate = baseSalary / 30;
      const earnedSalary = Math.round(dailyRate * attendanceDays);
      const overtimeHours = Math.floor(Math.random() * 10);
      const overtimeRate = dailyRate / 8 * 1.5;
      const overtimePay = Math.round(overtimeHours * overtimeRate);
      const deductions = Math.round(baseSalary * 0.11); // 11% for EPF/SOCSO
      const netSalary = earnedSalary + overtimePay - deductions;
      
      return {
        id: `payroll_${Date.now()}_${member.id}`,
        staffId: member.id,
        staffName: member.name,
        period: "selectedMonthYear",
        baseSalary,
        attendanceDays,
        earnedSalary,
        overtimeHours,
        overtimePay,
        deductions,
        netSalary,
        status: "pending",
        generatedAt: new Date().toISOString(),
      };
    });
    
    setRows(newPayrollEntries);
    setShowModal(false);
  };

  const handleExportCSV = async () => {
    if (rows.length === 0) {
      toast.error("No payroll data to export");
      return;
    }
    setExporting(true);
    try {
      const csvData = exportPayrollToCSV(rows);
      const csvContent = csvData.map(row => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `payroll_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Payroll exported to CSV successfully");
    } catch (err) {
      toast.error("Failed to export payroll");
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    if (rows.length === 0) {
      toast.error("No payroll data to print");
      return;
    }
    setPrinting(true);
    setTimeout(() => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups to print");
        setPrinting(false);
        return;
      }

      const printContent = `
        <html>
          <head>
            <title>Payroll Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #1e293b; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
              th { background: #f1f5f9; font-weight: bold; }
              .text-right { text-align: right; }
              .summary { margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; }
            </style>
          </head>
          <body>
            <h1>Payroll Report - ${new Date().toLocaleDateString()}</h1>
            <table>
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Role</th>
                  <th>Outlet</th>
                  <th class="text-right">Base Salary</th>
                  <th class="text-right">Commissions</th>
                  <th class="text-right">Taxes</th>
                  <th class="text-right">PF</th>
                  <th class="text-right">Advance EMI</th>
                  <th class="text-right">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(row => `
                  <tr>
                    <td>${row.name}</td>
                    <td>${row.role}</td>
                    <td>${row.assignedOutletName}</td>
                    <td class="text-right">${formatCurrency(row.baseSalary)}</td>
                    <td class="text-right">${formatCurrency(row.commissions)}</td>
                    <td class="text-right">${formatCurrency(row.taxes)}</td>
                    <td class="text-right">${formatCurrency(row.pfDeduction)}</td>
                    <td class="text-right">${formatCurrency(row.advanceEmi)}</td>
                    <td class="text-right"><strong>${formatCurrency(row.netPay)}</strong></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            <div class="summary">
              <h3>Summary</h3>
              <p><strong>Total Employees:</strong> ${rows.length}</p>
              <p><strong>Total Net Pay:</strong> ${formatCurrency(rows.reduce((sum, r) => sum + r.netPay, 0))}</p>
              <p><strong>Total Base Salary:</strong> ${formatCurrency(rows.reduce((sum, r) => sum + r.baseSalary, 0))}</p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      toast.success("Payroll sent to printer");
      setPrinting(false);
    }, 500);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Payroll"
        title="Payroll Generation"
        description="Preview payroll-ready records with commission, taxes, PF, and advance EMI all represented before backend export logic is introduced."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost flex items-center gap-2"
              onClick={handleExportCSV}
              disabled={exporting || rows.length === 0}
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
            <button
              type="button"
              className="btn-ghost flex items-center gap-2"
              onClick={handlePrint}
              disabled={printing || rows.length === 0}
            >
              <Printer className="h-4 w-4" />
              {printing ? "Preparing..." : "Print"}
            </button>
            <button type="button" className="btn-primary" onClick={() => setShowModal(true)}>
              Generate Payroll
            </button>
          </div>
        }
      />

      <div className="table-shell">
        <table className="min-w-full">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-4">Staff</th>
              <th className="px-4 py-4">Role</th>
              <th className="px-4 py-4">Outlet</th>
              <th className="px-4 py-4">Base Salary</th>
              <th className="px-4 py-4">Net Pay</th>
            </tr>
          </thead>
          <tbody className="bg-white/90">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="table-cell font-semibold text-slate-900">{row.name}</td>
                <td className="table-cell">{row.role}</td>
                <td className="table-cell">{row.assignedOutletName}</td>
                <td className="table-cell">{formatCurrency(row.baseSalary)}</td>
                <td className="table-cell">{formatCurrency(row.netPay)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
          <div className="glass-panel max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  Mocked Payslips
                </p>
                <h2 className="mt-2 text-3xl text-slate-900">Payroll breakdown</h2>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              {rows.map((row) => (
                <div key={row.id} className="rounded-3xl border border-slate-100 bg-white/90 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-2xl text-slate-900">{row.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {row.role} • {row.assignedOutletName}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-brand-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.22em] text-brand-700">Net Pay</p>
                      <p className="mt-2 text-lg font-semibold text-brand-800">
                        {formatCurrency(row.netPay)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-5">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                      Base Salary
                      <div className="mt-2 font-semibold text-slate-900">
                        {formatCurrency(row.baseSalary)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                      Commissions
                      <div className="mt-2 font-semibold text-slate-900">
                        {formatCurrency(row.commissions)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                      Taxes
                      <div className="mt-2 font-semibold text-slate-900">
                        {formatCurrency(row.taxes)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                      PF
                      <div className="mt-2 font-semibold text-slate-900">
                        {formatCurrency(row.pfDeduction)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                      Advance EMI
                      <div className="mt-2 font-semibold text-slate-900">
                        {formatCurrency(row.advanceEmi)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
