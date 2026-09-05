import React, { useState, useEffect } from "react";
import {
  Ticket,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Sparkles,
  Send,
  Copy,
  Clock,
  Calendar,
  Gift,
  Phone,
  User,
  ExternalLink,
  Ban,
  Filter,
  Edit2,
  Trash2,
  Power,
  ToggleLeft,
  ToggleRight,
  History,
  Receipt,
  FileText,
  Building2,
  ArrowUpRight,
  RefreshCw,
  Eye,
  TrendingUp,
  Sliders,
  Percent,
  Save,
  Award,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  fetchVouchersAPI,
  fetchVoucherRedemptionsAPI,
  fetchVoucherRewardRulesAPI,
  updateVoucherRewardRulesAPI,
  issueVoucherAPI,
  updateVoucherAPI,
  deleteVoucherAPI,
  cancelVoucherAPI,
  resendVoucherWhatsAppAPI,
  fetchCustomersAPI,
  fetchBillByIdFromAPI,
} from "../../services/api";
import { BillDetailModal } from "../pos/BillDetailModal";

export function VoucherManagementPage() {
  const [activeTab, setActiveTab] = useState("vouchers"); // "vouchers" | "redemptions" | "rewardRules"
  const [vouchers, setVouchers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, redeemed: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Redemption History State
  const [redemptions, setRedemptions] = useState([]);
  const [redemptionStats, setRedemptionStats] = useState({ count: 0, discount: 0, sales: 0 });
  const [redemptionLoading, setRedemptionLoading] = useState(false);
  const [redemptionSearch, setRedemptionSearch] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [loadingBillId, setLoadingBillId] = useState(null);

  // Auto-Reward Rules State
  const [rewardRules, setRewardRules] = useState({
    enabled: true,
    min_bill_amount: 100,
    mode: "tiered",
    percentage: 10,
    max_voucher_amount: 500,
    validity_days: 30,
    min_spend_to_redeem: 0,
    tiers: [
      { min_spend: 300, voucher_amount: 30 },
      { min_spend: 500, voucher_amount: 50 },
      { min_spend: 1000, voucher_amount: 100 },
      { min_spend: 2000, voucher_amount: 250 },
    ],
  });
  const [loadingRules, setLoadingRules] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [rulesSuccessMsg, setRulesSuccessMsg] = useState("");
  const [rulesErrorMsg, setRulesErrorMsg] = useState("");
  const [testSpendAmount, setTestSpendAmount] = useState("1000");

  // Modals & Feedback
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedCode, setCopiedCode] = useState(null);

  // Customer search in issue modal
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Issue Form State
  const initialFormState = {
    voucherType: "cash",
    value: "",
    minSpend: "",
    validityDays: "30",
    customValidUntil: "",
    customCode: "",
    notes: "",
    sendWhatsApp: true,
  };
  const [formData, setFormData] = useState(initialFormState);

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    value: "",
    minSpend: "",
    validUntil: "",
    notes: "",
    status: "active",
  });

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim();

      const res = await fetchVouchersAPI(params);
      if (res.success) {
        setVouchers(res.data || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error("Failed to fetch vouchers:", err);
      setErrorMsg("Failed to load vouchers");
    } finally {
      setLoading(false);
    }
  };

  const loadRedemptions = async () => {
    try {
      setRedemptionLoading(true);
      const params = {};
      if (redemptionSearch && redemptionSearch.trim()) {
        params.search = redemptionSearch.trim();
      }
      const res = await fetchVoucherRedemptionsAPI(params);
      if (res && res.success) {
        setRedemptions(res.data || []);
        const totalDisc = res.total_discount_amount != null
          ? res.total_discount_amount
          : (res.data || []).reduce((sum, item) => sum + (item.discount_amount || 0), 0);
        const totalSalesVal = (res.data || []).reduce((sum, item) => sum + (item.total || 0), 0);
        setRedemptionStats({
          count: res.total_count ?? (res.data?.length || 0),
          discount: totalDisc,
          sales: totalSalesVal,
        });
      }
    } catch (err) {
      console.error("Failed to fetch redemptions:", err);
    } finally {
      setRedemptionLoading(false);
    }
  };

  const handleViewBill = async (billId) => {
    if (!billId) return;
    try {
      setLoadingBillId(billId);
      const res = await fetchBillByIdFromAPI(billId);
      setSelectedBill(res);
    } catch (err) {
      console.error("Failed to load bill:", err);
      alert(err.message || "Failed to load bill details");
    } finally {
      setLoadingBillId(null);
    }
  };

  const formatDateTime = (iso) => {
    if (!iso) return { date: "—", time: "" };
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { date: "—", time: "" };
    return {
      date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const loadRewardRules = async () => {
    try {
      setLoadingRules(true);
      const res = await fetchVoucherRewardRulesAPI();
      if (res.success && res.data) {
        setRewardRules({
          ...res.data,
          tiers: Array.isArray(res.data.tiers) ? res.data.tiers : [],
        });
      }
    } catch (err) {
      console.error("Failed to load voucher reward rules:", err);
      setRulesErrorMsg("Failed to load auto-reward voucher rules");
    } finally {
      setLoadingRules(false);
    }
  };

  const handleSaveRewardRules = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingRules(true);
      setRulesErrorMsg("");
      setRulesSuccessMsg("");
      const res = await updateVoucherRewardRulesAPI(rewardRules);
      if (res.success) {
        setRulesSuccessMsg("Auto-reward voucher rules updated and active!");
        setTimeout(() => setRulesSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error("Failed to save voucher reward rules:", err);
      setRulesErrorMsg(err.message || "Failed to update voucher reward rules");
    } finally {
      setSavingRules(false);
    }
  };

  const handleAddTier = () => {
    const currentTiers = [...(rewardRules.tiers || [])];
    const lastSpend = currentTiers.length > 0 ? Number(currentTiers[currentTiers.length - 1].min_spend) + 500 : 500;
    const lastVoucher = currentTiers.length > 0 ? Number(currentTiers[currentTiers.length - 1].voucher_amount) + 50 : 50;
    setRewardRules({
      ...rewardRules,
      tiers: [...currentTiers, { min_spend: lastSpend, voucher_amount: lastVoucher }],
    });
  };

  const handleRemoveTier = (index) => {
    const updated = (rewardRules.tiers || []).filter((_, i) => i !== index);
    setRewardRules({ ...rewardRules, tiers: updated });
  };

  const handleUpdateTier = (index, field, value) => {
    const updated = [...(rewardRules.tiers || [])];
    updated[index] = { ...updated[index], [field]: Number(value) };
    setRewardRules({ ...rewardRules, tiers: updated });
  };

  const calculateSimulatedReward = (spend) => {
    const amt = Number(spend) || 0;
    if (!rewardRules.enabled) {
      return { eligible: false, reason: "Auto-award rules are currently turned OFF." };
    }
    if (amt < (Number(rewardRules.min_bill_amount) || 0)) {
      return {
        eligible: false,
        reason: `Bill amount is less than minimum qualifying bill of ₹${rewardRules.min_bill_amount}.`,
      };
    }
    if (rewardRules.mode === "percentage") {
      const pct = Number(rewardRules.percentage) || 0;
      let val = Math.round((amt * pct) / 100);
      const cap = Number(rewardRules.max_voucher_amount) || 0;
      if (cap > 0 && val > cap) val = cap;
      if (val <= 0) return { eligible: false, reason: "Calculated voucher value is 0." };
      return {
        eligible: true,
        voucher_amount: val,
        validity_days: rewardRules.validity_days || 30,
        min_spend_to_redeem: rewardRules.min_spend_to_redeem || 0,
      };
    } else {
      const sorted = [...(rewardRules.tiers || [])].sort((a, b) => Number(b.min_spend) - Number(a.min_spend));
      const match = sorted.find((t) => amt >= Number(t.min_spend));
      if (!match || Number(match.voucher_amount) <= 0) {
        return { eligible: false, reason: "Bill amount does not reach any milestone tier." };
      }
      return {
        eligible: true,
        voucher_amount: Number(match.voucher_amount),
        min_spend_tier: match.min_spend,
        validity_days: rewardRules.validity_days || 30,
        min_spend_to_redeem: rewardRules.min_spend_to_redeem || 0,
      };
    }
  };

  useEffect(() => {
    if (activeTab === "vouchers") {
      loadVouchers();
    } else if (activeTab === "redemptions") {
      loadRedemptions();
    } else if (activeTab === "rewardRules") {
      loadRewardRules();
    }
  }, [activeTab, statusFilter, searchQuery, redemptionSearch]);

  // Customer query
  const handleCustomerQuery = async (query) => {
    setCustomerSearch(query);
    if (!query || query.trim().length < 2) {
      setCustomerSuggestions([]);
      return;
    }
    try {
      setSearchingCustomer(true);
      const res = await fetchCustomersAPI({ search: query.trim() });
      setCustomerSuggestions(res.customers || []);
    } catch (err) {
      console.error("Error searching customers:", err);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const handleSelectCustomer = (cust) => {
    setSelectedCustomer(cust);
    setCustomerSearch(`${cust.name} (${cust.phone})`);
    setCustomerSuggestions([]);
  };

  const handleOpenIssueModal = () => {
    setFormData(initialFormState);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setErrorMsg("Please search and select a customer.");
      return;
    }
    if (!formData.value || Number(formData.value) <= 0) {
      setErrorMsg("Please enter a valid voucher value.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      let validUntil = formData.customValidUntil;
      if (!validUntil && formData.validityDays !== "custom") {
        const days = parseInt(formData.validityDays, 10) || 30;
        const d = new Date();
        d.setDate(d.getDate() + days);
        validUntil = d.toISOString().split("T")[0];
      }

      const payload = {
        customerId: selectedCustomer.id,
        voucherType: formData.voucherType,
        value: Number(formData.value),
        minSpend: formData.minSpend ? Number(formData.minSpend) : 0,
        validUntil: validUntil || undefined,
        customCode: formData.customCode ? formData.customCode.trim() : undefined,
        notes: formData.notes.trim() || undefined,
        sendWhatsApp: formData.sendWhatsApp,
      };

      const res = await issueVoucherAPI(payload);
      if (res.success) {
        setSuccessMsg(res.message || "Voucher issued successfully!");
        setIsModalOpen(false);
        loadVouchers();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error("Error issuing voucher:", err);
      setErrorMsg(err.message || "Failed to issue voucher.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (voucher) => {
    setEditingVoucher(voucher);
    setEditFormData({
      value: voucher.initial_value,
      minSpend: voucher.min_spend || "",
      validUntil: voucher.valid_until || "",
      notes: voucher.notes || "",
      status: voucher.status,
    });
    setErrorMsg("");
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingVoucher) return;
    try {
      setSubmitting(true);
      setErrorMsg("");
      const res = await updateVoucherAPI(editingVoucher.id, {
        value: Number(editFormData.value),
        minSpend: editFormData.minSpend ? Number(editFormData.minSpend) : 0,
        validUntil: editFormData.validUntil || null,
        notes: editFormData.notes.trim() || null,
        status: editFormData.status,
      });
      if (res.success) {
        setSuccessMsg("Voucher updated successfully!");
        setIsEditModalOpen(false);
        setEditingVoucher(null);
        loadVouchers();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error("Error updating voucher:", err);
      setErrorMsg(err.message || "Failed to update voucher");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Toggle Active / Inactive
  const handleToggleStatus = async (voucher) => {
    if (voucher.status === "redeemed") return;
    const newStatus = voucher.status === "active" ? "inactive" : "active";
    try {
      const res = await updateVoucherAPI(voucher.id, { status: newStatus });
      if (res.success) {
        setSuccessMsg(`Voucher ${voucher.code} is now ${newStatus.toUpperCase()}`);
        loadVouchers();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      alert(err.message || "Failed to update voucher status");
    }
  };

  // Delete Voucher
  const handleDeleteVoucher = async (voucher) => {
    if (voucher.status === "redeemed") {
      alert("Cannot delete a redeemed voucher as it is tied to past billing records.");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete voucher "${voucher.code}"?`)) return;
    try {
      const res = await deleteVoucherAPI(voucher.id);
      if (res.success) {
        setSuccessMsg(`Voucher ${voucher.code} deleted successfully.`);
        loadVouchers();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      alert(err.message || "Failed to delete voucher.");
    }
  };

  const handleResendWhatsApp = async (voucher) => {
    try {
      const res = await resendVoucherWhatsAppAPI(voucher.id);
      if (res.success) {
        setSuccessMsg(`WhatsApp sent to ${voucher.customer?.name}!`);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      alert(err.message || "Failed to send WhatsApp message.");
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(val) || 0);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Voucher Management"
        description="Issue personalized vouchers to customers, send WhatsApp updates, and track redemptions."
        eyebrow="CRM & Loyalty"
        action={
          <button
            onClick={handleOpenIssueModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Voucher</span>
          </button>
        }
      />

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("vouchers")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "vouchers"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Issued Vouchers</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              activeTab === "vouchers"
                ? "bg-amber-100 text-amber-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {stats.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("redemptions")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "redemptions"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Redemption History</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              activeTab === "redemptions"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {redemptionStats.count || stats.redeemed}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rewardRules")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "rewardRules"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Auto-Reward Rules</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
              rewardRules.enabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {rewardRules.enabled ? "Active" : "Off"}
          </span>
        </button>
      </div>

      {/* ISSUED VOUCHERS TAB CONTENT */}
      {activeTab === "vouchers" && (
        <div className="space-y-6">
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-500 font-medium">Total Issued</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
                <div className="text-xs text-gray-500 font-medium">Active & Usable</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50/70 flex items-center justify-center text-amber-600">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{stats.inactive || 0}</div>
                <div className="text-xs text-gray-500 font-medium">Inactive / Paused</div>
              </div>
            </div>

            <div
              onClick={() => setActiveTab("redemptions")}
              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
              title="Click to view full redemption history"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600">{stats.redeemed}</span>
                  <ArrowUpRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <div className="text-xs text-gray-500 font-medium">Redeemed at POS</div>
              </div>
            </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600">{stats.expired}</div>
            <div className="text-xs text-gray-500 font-medium">Expired</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-xl w-full md:w-auto">
          {[
            { id: "all", label: "All Vouchers" },
            { id: "active", label: "Active" },
            { id: "inactive", label: "Inactive" },
            { id: "redeemed", label: "Redeemed" },
            { id: "expired", label: "Expired" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code, customer, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading vouchers...</p>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
            <p className="text-base font-semibold text-gray-700">No vouchers found</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try clearing filters or search query."
                : "Issue your first customer voucher to get started."}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <button
                onClick={handleOpenIssueModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Issue Voucher Now</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5">Voucher Code</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Type & Value</th>
                  <th className="px-5 py-3.5">Validity</th>
                  <th className="px-5 py-3.5">Status & Toggle</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vouchers.map((v) => {
                  const isExpired =
                    v.status === "expired" ||
                    (v.status === "active" &&
                      v.valid_until &&
                      v.valid_until < new Date().toISOString().split("T")[0]);

                  return (
                    <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Code */}
                      <td className="px-5 py-4 font-mono font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-50 text-amber-800 border border-amber-200/60 px-2.5 py-1 rounded-lg">
                            {v.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(v.code)}
                            title="Copy code"
                            className="text-gray-400 hover:text-amber-600 transition-colors p-1"
                          >
                            {copiedCode === v.code ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {v.notes && (
                          <div className="text-[11px] font-sans text-gray-400 mt-1 truncate max-w-xs">
                            {v.notes}
                          </div>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-800">
                          {v.customer?.name || (v.customer_id ? `Customer #${v.customer_id}` : "Walk-in Guest")}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{v.customer?.phone || "No phone linked"}</span>
                        </div>
                      </td>

                      {/* Type & Value */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-emerald-700">
                          {v.voucher_type === "percent"
                            ? `${Number(v.initial_value)}% OFF`
                            : formatCurrency(v.initial_value)}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {v.voucher_type === "cash" ? (
                            <span>
                              Balance: <strong className="text-gray-700">{formatCurrency(v.balance_value)}</strong>
                            </span>
                          ) : (
                            <span className="capitalize">{v.voucher_type} Discount</span>
                          )}
                          {Number(v.min_spend) > 0 && (
                            <span className="block text-[11px] text-gray-400">
                              Min Bill: {formatCurrency(v.min_spend)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Validity */}
                      <td className="px-5 py-4 text-xs">
                        <div className="text-gray-700 font-medium">
                          {v.valid_until ? `Until ${v.valid_until}` : "No Expiry"}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Issued: {v.valid_from || v.created_at?.split("T")[0]}
                        </div>
                      </td>

                      {/* Status with Quick Toggle */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {v.status === "redeemed" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <CheckCircle2 className="w-3 h-3" /> Redeemed
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <Clock className="w-3 h-3" /> Expired
                            </span>
                          ) : v.status === "inactive" ? (
                            <button
                              onClick={() => handleToggleStatus(v)}
                              title="Click to Activate"
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors"
                            >
                              <ToggleLeft className="w-4 h-4 text-amber-500" />
                              <span>Inactive</span>
                            </button>
                          ) : v.status === "cancelled" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                              <Ban className="w-3 h-3" /> Cancelled
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(v)}
                              title="Click to Deactivate / Pause"
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-colors"
                            >
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                              <span>Active</span>
                            </button>
                          )}
                        </div>
                        {v.redeemedBill && (
                          <button
                            type="button"
                            onClick={() => handleViewBill(v.redeemedBill.id)}
                            disabled={loadingBillId === v.redeemedBill.id}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline mt-1 font-mono group"
                            title="Click to view bill & receipt"
                          >
                            {loadingBillId === v.redeemedBill.id ? (
                              <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Receipt className="w-3 h-3 group-hover:scale-110 transition-transform" />
                            )}
                            <span>Bill #{v.redeemedBill.bill_number}</span>
                          </button>
                        )}
                      </td>

                      {/* Actions: Edit, Delete, Resend WhatsApp, View Receipt */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Bill Receipt if redeemed */}
                          {v.redeemedBill && (
                            <button
                              onClick={() => handleViewBill(v.redeemedBill.id)}
                              disabled={loadingBillId === v.redeemedBill.id}
                              title="View redeemed bill receipt"
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              {loadingBillId === v.redeemedBill.id ? (
                                <div className="w-3.5 h-3.5 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Receipt className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Resend WhatsApp */}
                          {v.customer?.phone && (
                            <button
                              onClick={() => handleResendWhatsApp(v)}
                              title="Resend WhatsApp notification"
                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Voucher */}
                          {v.status !== "redeemed" && (
                            <button
                              onClick={() => handleOpenEditModal(v)}
                              title="Edit Voucher details"
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Voucher */}
                          {v.status !== "redeemed" && (
                            <button
                              onClick={() => handleDeleteVoucher(v)}
                              title="Delete Voucher"
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )}

  {/* REDEMPTION HISTORY TAB CONTENT */}
  {activeTab === "redemptions" && (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{redemptionStats.count}</div>
            <div className="text-xs text-gray-500 font-medium">Total Redemptions</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(redemptionStats.discount)}</div>
            <div className="text-xs text-gray-500 font-medium">Customer Savings Granted</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(redemptionStats.sales)}</div>
            <div className="text-xs text-gray-500 font-medium">Associated Sales Volume</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-700">
              {formatCurrency(redemptionStats.count > 0 ? redemptionStats.discount / redemptionStats.count : 0)}
            </div>
            <div className="text-xs text-gray-500 font-medium">Avg. Discount / Bill</div>
          </div>
        </div>
      </div>

      {/* Search & Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by voucher code, customer, bill#, outlet..."
            value={redemptionSearch}
            onChange={(e) => setRedemptionSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={loadRedemptions}
            disabled={redemptionLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all"
            title="Refresh redemption list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${redemptionLoading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>
          <span className="text-xs text-gray-400 font-medium">
            {redemptions.length} {redemptions.length === 1 ? "record" : "records"}
          </span>
        </div>
      </div>

      {/* Redemption Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {redemptionLoading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading redemption history...</p>
          </div>
        ) : redemptions.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30 text-blue-500" />
            <p className="text-base font-semibold text-gray-700">No redemptions found</p>
            <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
              {redemptionSearch
                ? "No redemptions matched your search query. Try searching with different terms."
                : "When customers redeem vouchers during checkout at the POS terminal, their redemption records and full bills will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5">Redemption Time</th>
                  <th className="px-5 py-3.5">Voucher Code</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Discount Given</th>
                  <th className="px-5 py-3.5">Bill Number</th>
                  <th className="px-5 py-3.5">Outlet</th>
                  <th className="px-5 py-3.5">Bill Total</th>
                  <th className="px-5 py-3.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {redemptions.map((item) => {
                  const dt = formatDateTime(item.redeemed_at);
                  return (
                    <tr key={item.bill_id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Time */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{dt.date}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{dt.time}</span>
                        </div>
                      </td>

                      {/* Voucher Code */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-50 text-amber-800 border border-amber-200/60 font-mono font-bold px-2.5 py-1 rounded-lg text-xs">
                            {item.voucher_code || "VOUCHER"}
                          </span>
                          {item.voucher_code && (
                            <button
                              onClick={() => handleCopyCode(item.voucher_code)}
                              title="Copy code"
                              className="text-gray-400 hover:text-amber-600 transition-colors p-1"
                            >
                              {copiedCode === item.voucher_code ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1 capitalize">
                          {item.voucher_type} Voucher
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{item.customer_name}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{item.customer_phone || "Walk-in"}</span>
                        </div>
                      </td>

                      {/* Discount Given */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-emerald-600 text-sm">
                          −{formatCurrency(item.discount_amount)}
                        </div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          Deducted
                        </span>
                      </td>

                      {/* Bill Number */}
                      <td className="px-5 py-4 font-mono font-bold">
                        <button
                          type="button"
                          onClick={() => handleViewBill(item.bill_id)}
                          disabled={loadingBillId === item.bill_id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs border border-blue-200 transition-all font-semibold"
                          title="Click to view complete bill details"
                        >
                          {loadingBillId === item.bill_id ? (
                            <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Receipt className="w-3.5 h-3.5" />
                          )}
                          <span>#{item.bill_number}</span>
                        </button>
                      </td>

                      {/* Outlet */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-gray-800 font-medium text-xs">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          <span>{item.outlet_name}</span>
                        </div>
                      </td>

                      {/* Bill Total & Payment Mode */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900">{formatCurrency(item.total)}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 uppercase">
                          {item.payment_method || "Paid"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleViewBill(item.bill_id)}
                          disabled={loadingBillId === item.bill_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-navy-900 hover:text-white rounded-xl border border-gray-200 shadow-sm transition-all"
                        >
                          {loadingBillId === item.bill_id ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          <span>View Bill</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )}

      {/* AUTO-REWARD RULES TAB CONTENT */}
      {activeTab === "rewardRules" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Status feedback notifications */}
          {rulesSuccessMsg && (
            <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl shadow-sm animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <span className="text-sm font-semibold">{rulesSuccessMsg}</span>
            </div>
          )}

          {rulesErrorMsg && (
            <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl shadow-sm animate-fadeIn">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span className="text-sm font-semibold">{rulesErrorMsg}</span>
            </div>
          )}

          {/* Banner Card with Master Switch */}
          <div className="bg-gradient-to-r from-navy-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-inner">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-wide">Automatic Next-Visit Voucher Rewards</h2>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    rewardRules.enabled ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-gray-700 text-gray-300"
                  }`}>
                    {rewardRules.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Automatically award a discount voucher to customers when their bill spend crosses threshold milestones. The awarded code is instantly printed on their receipt and sent via WhatsApp.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl self-stretch md:self-auto justify-between md:justify-start">
              <span className="text-xs font-semibold text-slate-200">Auto-Award at Checkout:</span>
              <button
                type="button"
                onClick={() => setRewardRules({ ...rewardRules, enabled: !rewardRules.enabled })}
                className="transition-transform active:scale-95"
              >
                {rewardRules.enabled ? (
                  <ToggleRight className="w-8 h-8 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Form & Simulator Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Configuration */}
            <div className="lg:col-span-2 space-y-6">
              {/* Calculation Mode Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-500" />
                    Reward Calculation Method
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRewardRules({ ...rewardRules, mode: "tiered" })}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      rewardRules.mode === "tiered"
                        ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">Spend Milestones (Tiered)</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Popular
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Award fixed voucher discounts based on total bill tier (e.g. Spend RM 500 → Get RM 50, Spend RM 1,000 → Get RM 100).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRewardRules({ ...rewardRules, mode: "percentage" })}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      rewardRules.mode === "percentage"
                        ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">Percentage Cashback</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Dynamic
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Award a percentage of the bill total as voucher credit (e.g. 10% of total bill up to max RM 500).
                    </p>
                  </button>
                </div>
              </div>

              {/* Tiered Milestones Table Card */}
              {rewardRules.mode === "tiered" && (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        Spend Milestone Tiers
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        POS checks the highest milestone reached by the bill total and awards that voucher value.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddTier}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Milestone
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-3">Tier Milestone</th>
                          <th className="px-4 py-3">When Bill Amount Reaches (RM)</th>
                          <th className="px-4 py-3">Reward Voucher Amount (RM)</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(rewardRules.tiers || []).map((tier, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3 font-semibold text-gray-700">
                              Tier {idx + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-gray-500">RM</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={tier.min_spend}
                                  onChange={(e) => handleUpdateTier(idx, "min_spend", e.target.value)}
                                  className="w-28 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-gray-500">RM</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={tier.voucher_amount}
                                  onChange={(e) => handleUpdateTier(idx, "voucher_amount", e.target.value)}
                                  className="w-28 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-bold text-emerald-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveTier(idx)}
                                disabled={(rewardRules.tiers || []).length <= 1}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Delete tier"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Percentage Mode Configuration Card */}
              {rewardRules.mode === "percentage" && (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Percent className="w-4 h-4 text-blue-500" />
                    Percentage Reward Settings
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Reward Percentage (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={rewardRules.percentage}
                          onChange={(e) => setRewardRules({ ...rewardRules, percentage: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="absolute right-3 top-2 text-sm font-bold text-gray-400">%</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">e.g. 10% of RM 1,000 bill generates RM 100 voucher</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Maximum Voucher Cap (RM)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={rewardRules.max_voucher_amount}
                          onChange={(e) => setRewardRules({ ...rewardRules, max_voucher_amount: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="absolute right-3 top-2 text-xs font-bold text-gray-400">RM</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Upper limit cap on awarded voucher value (0 for no cap)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* General Conditions Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  Voucher Validity & Conditions
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Min. Qualifying Bill (RM)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={rewardRules.min_bill_amount}
                      onChange={(e) => setRewardRules({ ...rewardRules, min_bill_amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Bills below this won't generate any voucher</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Validity Period (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={rewardRules.validity_days}
                      onChange={(e) => setRewardRules({ ...rewardRules, validity_days: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Voucher expires X days after bill issue date</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Min Spend on Next Visit (RM)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={rewardRules.min_spend_to_redeem}
                      onChange={(e) => setRewardRules({ ...rewardRules, min_spend_to_redeem: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Minimum spend required when redeeming voucher</p>
                  </div>
                </div>
              </div>

              {/* Action Save Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={loadRewardRules}
                  disabled={loadingRules || savingRules}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
                >
                  Reset Changes
                </button>
                <button
                  type="button"
                  onClick={handleSaveRewardRules}
                  disabled={savingRules}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {savingRules ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{savingRules ? "Saving Rules..." : "Save & Apply Rules"}</span>
                </button>
              </div>
            </div>

            {/* Right 1 Col: Live Bill Simulator & Thermal Receipt Preview */}
            <div className="space-y-6">
              {/* Simulator Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Live Bill Simulator
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    Real-time
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Simulate Customer Bill Amount (RM):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-gray-400">RM</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={testSpendAmount}
                      onChange={(e) => setTestSpendAmount(e.target.value)}
                      className="w-full pl-11 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-base font-black text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Simulation Result */}
                {(() => {
                  const sim = calculateSimulatedReward(testSpendAmount);
                  if (!sim.eligible) {
                    return (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center space-y-1">
                        <div className="inline-flex p-2 rounded-full bg-gray-200 text-gray-500 mb-1">
                          <Ban className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-gray-700">No Voucher Awarded</p>
                        <p className="text-[11px] text-gray-500">{sim.reason}</p>
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Voucher Unlocked!
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                          {rewardRules.validity_days} Days Valid
                        </span>
                      </div>

                      <div className="text-center py-2 bg-white/80 border border-emerald-200 rounded-lg">
                        <div className="text-[10px] text-emerald-700 font-semibold uppercase">Awarded Voucher Value</div>
                        <div className="text-2xl font-black text-emerald-700">
                          {formatCurrency(sim.voucher_amount)} OFF
                        </div>
                        <div className="text-[10px] font-mono font-bold text-gray-600 mt-1">
                          Auto-generated: VCH-XXXXXX
                        </div>
                      </div>

                      {sim.min_spend_to_redeem > 0 && (
                        <p className="text-[11px] text-emerald-800 text-center">
                          📌 Min spend on next visit: {formatCurrency(sim.min_spend_to_redeem)}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Thermal Receipt Print Mockup */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-[11px] font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    Receipt Print Mockup:
                  </div>
                  <div className="p-3 bg-slate-50 border border-dashed border-gray-300 rounded-lg text-center font-mono text-[10px] leading-relaxed text-gray-800">
                    <div className="border border-black p-2 bg-white">
                      <p className="font-black text-[10px] uppercase">🎉 NEXT VISIT VOUCHER 🎉</p>
                      <p className="text-[8px] text-gray-600">Special Gift for Your Next Visit!</p>
                      <div className="my-1">
                        <span className="text-xs font-black px-2 py-0.5 border border-black bg-gray-50 inline-block">
                          RM {Number(calculateSimulatedReward(testSpendAmount).voucher_amount || 50).toFixed(2)} OFF
                        </span>
                      </div>
                      <p className="text-[9px] font-bold">CODE: VCH-7X8K2P</p>
                      <p className="text-[7.5px] text-gray-500 mt-1">
                        Present receipt on next visit to redeem.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How it works info */}
              <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200/70 text-xs text-amber-900 space-y-2">
                <h4 className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  How Auto-Awarding Works
                </h4>
                <ul className="space-y-1.5 text-[11.5px] text-amber-800/90 list-disc list-inside">
                  <li>Triggered automatically during POS checkout for eligible bills.</li>
                  <li>Generates a cryptographically unique code linked to the bill.</li>
                  <li>Printed right inside the thermal receipt & displayed on invoices.</li>
                  <li>Included in WhatsApp message sent to customer phone.</li>
                  <li>Automatically listed in CRM under customer's active vouchers.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT VOUCHER MODAL */}
      {isEditModalOpen && editingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100/70 text-indigo-700 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Edit Voucher</h3>
                  <p className="text-xs text-gray-500 font-mono">{editingVoucher.code} ({editingVoucher.customer?.name || "Walk-in Guest"})</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Value & Min Spend */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Value {editingVoucher.voucher_type === "percent" ? "(%)" : "(₹)"} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={editFormData.value}
                    onChange={(e) => setEditFormData({ ...editFormData, value: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Min Spend (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editFormData.minSpend}
                    onChange={(e) => setEditFormData({ ...editFormData, minSpend: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Expiry Date & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.validUntil}
                    onChange={(e) => setEditFormData({ ...editFormData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive / Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Occasion / Internal Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Special treat, customer retention"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{submitting ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISSUE VOUCHER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100/70 text-amber-700 rounded-xl">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Issue Customer Voucher</h3>
                  <p className="text-xs text-gray-500">Create a personalized voucher code & alert customer</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleIssueSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Customer Search */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Customer <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by customer name or phone..."
                    value={customerSearch}
                    onChange={(e) => handleCustomerQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                    required
                  />
                  {/* Suggestions Dropdown */}
                  {customerSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-gray-100">
                      {customerSuggestions.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className="px-4 py-2.5 hover:bg-amber-50/50 cursor-pointer flex justify-between items-center transition-colors text-xs"
                        >
                          <div>
                            <span className="font-semibold text-gray-800">{c.name}</span>
                            <span className="text-gray-400 ml-2">({c.phone})</span>
                          </div>
                          {c.loyalty_points > 0 && (
                            <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded font-medium">
                              {c.loyalty_points} pts
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Voucher Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Voucher Type
                  </label>
                  <select
                    value={formData.voucherType}
                    onChange={(e) => setFormData({ ...formData, voucherType: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none font-medium"
                  >
                    <option value="cash">Cash / Gift Value (₹)</option>
                    <option value="flat">Flat Discount (₹)</option>
                    <option value="percent">Percentage Discount (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Value {formData.voucherType === "percent" ? "(%)" : "(₹)"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder={formData.voucherType === "percent" ? "e.g. 20" : "e.g. 500"}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Min Spend & Validity Presets */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Min Bill Spend (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 (No minimum)"
                    value={formData.minSpend}
                    onChange={(e) => setFormData({ ...formData, minSpend: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Validity Period
                  </label>
                  <select
                    value={formData.validityDays}
                    onChange={(e) => setFormData({ ...formData, validityDays: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="15">15 Days</option>
                    <option value="30">30 Days (Standard)</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                    <option value="custom">Custom Expiry Date</option>
                  </select>
                </div>
              </div>

              {/* Custom Expiry Date (if selected) */}
              {formData.validityDays === "custom" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Custom Expiry Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={formData.customValidUntil}
                    onChange={(e) => setFormData({ ...formData, customValidUntil: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
              )}

              {/* Notes / Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Occasion / Reason (Internal note)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Birthday Special, VIP Perk, Apology / Goodwill"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Custom Code (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Custom Voucher Code <span className="text-gray-400 font-normal">(Leave blank to auto-generate)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. GLOW-VIP-500"
                  value={formData.customCode}
                  onChange={(e) => setFormData({ ...formData, customCode: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-sm font-mono uppercase bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* WhatsApp Notification Checkbox */}
              <div className="pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sendWhatsApp}
                    onChange={(e) => setFormData({ ...formData, sendWhatsApp: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-gray-800">
                      Send instant WhatsApp message to customer
                    </span>
                    <p className="text-[11px] text-gray-400">
                      Includes personalized voucher code, value, validity, and terms
                    </p>
                  </div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{submitting ? "Issuing..." : "Issue Voucher"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BILL DETAIL MODAL */}
      {selectedBill && (
        <BillDetailModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </div>
  );
}
