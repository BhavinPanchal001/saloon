import React, { useState, useEffect } from "react";
import { X, Wallet, ArrowDownRight, ArrowUpRight, ShieldAlert, History, PlusCircle, CreditCard, ArrowLeft, Search, CheckCircle2, Phone, Mail, Award, MessageCircle } from "lucide-react";
import { fetchCustomerLedgerAPI, settleCustomerBalanceAPI } from "../../services/api";
import { WhatsAppReminderModal } from "./WhatsAppReminderModal";

export function CustomerLedgerModal({ customer, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState("history"); // "history" | "settle"
  const [ledgers, setLedgers] = useState([]);
  const [pendingBills, setPendingBills] = useState([]);
  const [currentCustomer, setCurrentCustomer] = useState(customer);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTargetBill, setReminderTargetBill] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    type: "deposit",
    amount: "",
    payment_method: "Cash",
    notes: "",
    bill_id: "",
  });

  const loadLedger = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomerLedgerAPI(customer.id);
      setLedgers(data.ledgers || []);
      setPendingBills(data.pendingBills || []);
      if (data.customer) {
        setCurrentCustomer(data.customer);
        if (Number(data.customer.credit_balance || 0) < 0 || (data.pendingBills && data.pendingBills.length > 0)) {
          setFormData((prev) => ({ ...prev, type: "settlement" }));
        }
      }
    } catch (err) {
      console.error("Error loading customer ledger:", err);
      setError(err.message || "Failed to load transaction history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customer?.id) {
      loadLedger();
    }
  }, [customer?.id]);

  const handleSelectPendingBill = (billId) => {
    const selected = pendingBills.find((b) => String(b.id) === String(billId));
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        bill_id: selected.id,
        amount: Number(selected.remainingDue).toFixed(2),
        notes: `Settling Bill #${selected.billNumber}`,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        bill_id: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      await settleCustomerBalanceAPI(customer.id, {
        type: formData.type,
        amount: numAmount,
        payment_method: formData.payment_method,
        notes: formData.notes,
        bill_id: formData.bill_id || undefined,
      });

      setSuccessMsg("Transaction recorded successfully!");
      setFormData({ type: "deposit", amount: "", payment_method: "Cash", notes: "", bill_id: "" });
      await loadLedger();
      if (onUpdate) onUpdate();

      setTimeout(() => {
        setSuccessMsg("");
        setActiveTab("history");
      }, 1200);
    } catch (err) {
      setError(err.message || "Failed to record transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  const netBalance = Number(currentCustomer?.credit_balance || 0);

  const filteredLedgers = ledgers.filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (item.notes && item.notes.toLowerCase().includes(q)) ||
      (item.payment_method && item.payment_method.toLowerCase().includes(q)) ||
      (item.type && item.type.toLowerCase().includes(q)) ||
      (item.bill && item.bill.bill_number.toLowerCase().includes(q))
    );
  });

  const getLedgerBadge = (type) => {
    switch (type) {
      case "deposit":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" /> Advance Deposit</span>;
      case "settlement":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200"><ArrowDownRight className="w-3.5 h-3.5 text-teal-600" /> Due Repayment</span>;
      case "bill_payment":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200"><CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Bill Redeem</span>;
      case "due_charge":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200"><ArrowUpRight className="w-3.5 h-3.5 text-rose-600" /> Bill Due</span>;
      case "adjustment":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Adjustment</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  return (
    <div className="w-full space-y-6 animate-fadeIn pb-12">
      {/* In-Page Customer Statement Header Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Back Navigation & Customer Identity */}
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-200 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" /> Back to Customers
          </button>

          <div className="h-8 w-px bg-slate-200 hidden md:block" />

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{currentCustomer?.name}</h1>
              {currentCustomer?.gender && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  {currentCustomer.gender}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1 font-semibold">
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-indigo-600" /> {currentCustomer?.phone}</span>
              {currentCustomer?.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {currentCustomer.email}</span>}
              <span className="flex items-center gap-1.5 text-amber-600 font-extrabold"><Award className="w-3.5 h-3.5 text-amber-500" /> {currentCustomer?.loyalty_points || 0} Loyalty Points</span>
            </div>
          </div>
        </div>

        {/* Customer Net Balance Indicator Card */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl shadow-xs">
            <Wallet className="w-6 h-6 text-indigo-600 shrink-0" />
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Net Account Balance</span>
              {netBalance > 0 ? (
                <span className="text-base font-extrabold text-emerald-600 flex items-center gap-1">
                  <ArrowDownRight className="w-4.5 h-4.5" /> +₹{netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Store Credit)
                </span>
              ) : netBalance < 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-rose-600 flex items-center gap-1">
                    <ShieldAlert className="w-4.5 h-4.5 text-rose-500" /> -₹{Math.abs(netBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Outstanding Due)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReminderTargetBill(null);
                      setShowReminderModal(true);
                    }}
                    className="p-1.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                    title="Send WhatsApp Payment Reminder"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              ) : (
                <span className="text-base font-extrabold text-slate-700">₹0.00 (Account Clean)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Sub-Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-2 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab("history"); setError(""); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "history"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "bg-transparent text-slate-600 hover:bg-slate-100"
            }`}
          >
            <History className="w-4 h-4" /> Transaction History & Ledger
          </button>
          <button
            onClick={() => { setActiveTab("settle"); setError(""); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "settle"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "bg-transparent text-slate-600 hover:bg-slate-100"
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Record Payment / Settle Dues
          </button>
        </div>

        {/* Filter Search Input (History view) */}
        {activeTab === "history" && (
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search ledger notes, bill #..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Main Content Body */}
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 text-rose-700 text-sm font-semibold border border-rose-200 flex items-center gap-3 shadow-sm">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" /> {error}
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-sm font-semibold border border-emerald-200 flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" /> {successMsg}
          </div>
        )}

        {/* Pending Unpaid Bills Banner */}
        {pendingBills.length > 0 && activeTab === "history" && (
          <div className="bg-amber-50/90 border border-amber-200 p-5 rounded-3xl shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Unpaid Bills Pending Settlement ({pendingBills.length})
                </span>
                <p className="text-xs text-amber-700 mt-0.5">The following POS bills have outstanding unpaid balances.</p>
              </div>
              <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                <span className="text-sm font-black text-amber-900 bg-amber-100/80 px-3.5 py-1.5 rounded-xl border border-amber-300/60">
                  Total Due: ₹{pendingBills.reduce((sum, b) => sum + Number(b.remainingDue), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setReminderTargetBill(null);
                    setShowReminderModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-all"
                  title="Send WhatsApp Payment Reminder for all pending bills"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send WhatsApp Reminder</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingBills.map((b) => (
                <div key={b.id} className="p-4 bg-white rounded-2xl border border-amber-200/80 shadow-xs flex items-center justify-between gap-3 hover:shadow-md transition-all">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm truncate">Bill #{b.billNumber}</span>
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {b.status || 'unpaid'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Date: {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • Total: ₹{Number(b.total).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1.5">
                    <span className="block text-sm font-black text-rose-600">₹{Number(b.remainingDue).toFixed(2)}</span>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setReminderTargetBill(b);
                          setShowReminderModal(true);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-lg transition-colors"
                        title="Send WhatsApp reminder for this bill"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>Remind</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("settle");
                          setFormData((prev) => ({
                            ...prev,
                            type: "settlement",
                            bill_id: b.id,
                            amount: Number(b.remainingDue).toFixed(2),
                            notes: `Settling Bill #${b.billNumber}`,
                          }));
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Settle →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction History Tab */}
        {activeTab === "history" && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Account Audit Trail & Ledger</h3>
                <p className="text-xs text-slate-500 mt-0.5">Complete chronological statement of all payments, bill dues, and deposits.</p>
              </div>
              <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                {filteredLedgers.length} Records
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400 font-medium">Loading ledger statements...</div>
            ) : filteredLedgers.length === 0 ? (
              <div className="py-16 text-center bg-slate-50/50">
                <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-700 font-bold text-base">No Transaction History Found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchFilter ? `No records matching "${searchFilter}"` : "Use the 'Record Payment / Settle Dues' tab to record advance deposits or settle outstanding bills."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4">Transaction Type</th>
                      <th className="px-6 py-4 text-right">Amount (₹)</th>
                      <th className="px-6 py-4 text-right">Balance After</th>
                      <th className="px-6 py-4">Payment Mode</th>
                      <th className="px-6 py-4">Linked Bill</th>
                      <th className="px-6 py-4">Remarks / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {filteredLedgers.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getLedgerBadge(item.type)}</td>
                        <td className={`px-6 py-4 text-right font-extrabold text-base whitespace-nowrap ${
                          item.type === "deposit" || item.type === "settlement"
                            ? "text-emerald-600"
                            : item.type === "due_charge" || item.type === "bill_payment"
                            ? "text-rose-600"
                            : "text-slate-800"
                        }`}>
                          {item.type === "deposit" || item.type === "settlement" ? "+" : "-"}₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          ₹{Number(item.balance_after).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                            {item.payment_method || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs whitespace-nowrap">
                          {item.bill ? (
                            <span className="inline-flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                              Bill #{item.bill.bill_number}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 max-w-sm">
                          {item.notes || <span className="text-slate-300 italic">No notes</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Record Payment / Settlement Tab */}
        {activeTab === "settle" && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 max-w-3xl mx-auto space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800">Record Payment & Settle Customer Dues</h3>
              <p className="text-xs text-slate-500 mt-1">Collect cash/card/UPI payments against unpaid bills or accept advance store credit deposits.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Transaction Purpose *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, bill_id: "" })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-semibold text-slate-800 bg-white"
                >
                  <option value="settlement">Settle Pending Due (Customer pays outstanding balance)</option>
                  <option value="deposit">Deposit Advance Store Credit (Customer pays in advance)</option>
                  <option value="due_charge">Add Manual Customer Due / Charge (Customer owes money)</option>
                  <option value="adjustment">Manual Balance Adjustment</option>
                </select>
              </div>

              {formData.type === "settlement" && (
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Select Pending Bill to Settle (Optional)</span>
                    {pendingBills.length > 0 && (
                      <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                        {pendingBills.length} Unpaid Bill(s) Available
                      </span>
                    )}
                  </label>
                  {pendingBills.length > 0 ? (
                    <select
                      value={formData.bill_id}
                      onChange={(e) => handleSelectPendingBill(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm bg-indigo-50/40 font-bold text-indigo-900"
                    >
                      <option value="">— General Settlement (Unspecified / All Dues) —</option>
                      {pendingBills.map((b) => (
                        <option key={b.id} value={b.id}>
                          Bill #{b.billNumber} — Remaining Due: ₹{Number(b.remainingDue).toFixed(2)} ({new Date(b.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500">
                      No specific bill-linked dues found. You can record a general settlement payment below.
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Payment Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-black text-base">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-base font-extrabold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Payment Collection Method *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {["Cash", "UPI", "Card", "Bank"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_method: mode })}
                      className={`py-3 rounded-2xl text-xs font-extrabold border transition-all ${
                        formData.payment_method === mode
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 scale-[1.02]"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Notes & Remarks
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g., Cash payment collected by front desk for Bill #GL-2026-0001..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-8 py-3 text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                >
                  {submitting ? "Processing..." : "Save & Complete Transaction"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* WhatsApp Payment Reminder Modal */}
      {showReminderModal && (
        <WhatsAppReminderModal
          customer={currentCustomer}
          targetBill={reminderTargetBill}
          initialPendingBills={reminderTargetBill ? [reminderTargetBill] : pendingBills}
          onClose={() => {
            setShowReminderModal(false);
            setReminderTargetBill(null);
          }}
          onSent={() => {
            loadLedger();
            if (onUpdate) onUpdate();
          }}
        />
      )}
    </div>
  );
}
