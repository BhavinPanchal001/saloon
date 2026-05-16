import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { fetchBillsFromAPI, fetchProductsFromAPI } from "../../services/api";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/format";
import { InvoiceModal } from "./InvoiceModal";
import { BillDetailModal } from "./BillDetailModal";
import { Search, Download, Filter, FileText, Eye } from "lucide-react";

const paymentFilters = ["All", "Cash", "Card", "UPI"];

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

export default function BillingListPage() {
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [selectedBill, setSelectedBill] = useState(null);
  const [viewBill, setViewBill] = useState(null);
  const [productMasters, setProductMasters] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const outletId = (user?.role === "admin" || user?.role === "super_admin") ? undefined : user?.outlet_id;
      const [billsData, productsData] = await Promise.all([
        fetchBillsFromAPI({ outletId }),
        fetchProductsFromAPI(),
      ]);
      setBills(billsData);
      setProductMasters(productsData);
      setLoading(false);
    };
    if (user) load();
  }, [user]);

  const filtered = bills.filter((b) => {
    const matchesSearch =
      !search ||
      b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer?.phone?.includes(search);
    const matchesPayment = paymentFilter === "All" || b.paymentMethod === paymentFilter;
    return matchesSearch && matchesPayment;
  });

  const handleDownload = (bill) => {
    setSelectedBill(bill);
    // Trigger print after modal opens
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const totalRevenue = filtered
    .filter((b) => b.status === "paid")
    .reduce((s, b) => s + b.total, 0);

  return (
    <div>
      <PageHeader
        eyebrow="POS"
        title="Billing History"
        description="View all past transactions, search invoices, and download beautifully crafted receipts for your clients."
      />

      {/* Stats row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="glass-card !p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-500/10 text-navy-600">
            <FileText size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-400">Total Bills</p>
            <p className="mt-1 text-2xl font-black text-navy-900">{bills.length}</p>
          </div>
        </div>
        <div className="glass-card !p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <span className="text-lg">RM</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-400">Revenue</p>
            <p className="mt-1 text-2xl font-black text-navy-900">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
        <div className="glass-card !p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-600">
            <Filter size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-400">Showing</p>
            <p className="mt-1 text-2xl font-black text-navy-900">{filtered.length}</p>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="glass-card !p-6 mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              className="premium-input !pl-11 !py-3"
              placeholder="Search by bill #, customer name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {paymentFilters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setPaymentFilter(f)}
                className={
                  paymentFilter === f
                    ? "rounded-2xl bg-navy-900 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white ring-2 ring-navy-200"
                    : "rounded-2xl border border-navy-100 bg-white px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-navy-600 transition hover:bg-navy-50"
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-navy-50 text-3xl text-navy-300">
            📋
          </div>
          <p className="text-sm font-medium text-slate-500">No bills found matching your search.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bill) => (
                <tr key={bill.id}>
                  <td>
                    <span className="inline-flex items-center rounded-xl bg-navy-50 px-3 py-1.5 text-xs font-bold text-navy-700">
                      {bill.billNumber}
                    </span>
                  </td>
                  <td>
                    <p className="text-sm font-semibold text-navy-800">{formatDate(bill.createdAt)}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{formatTime(bill.createdAt)}</p>
                  </td>
                  <td>
                    <p className="font-semibold text-navy-900">{bill.customer?.name || "Walk-in"}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{bill.customer?.phone || "—"}</p>
                  </td>
                  <td>
                    <span className="text-sm text-navy-600">
                      {bill.lineItems.length} item{bill.lineItems.length > 1 ? "s" : ""}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${
                      bill.paymentMethod === "Cash" ? "bg-emerald-50 text-emerald-700" :
                      bill.paymentMethod === "Card" ? "bg-indigo-50 text-indigo-700" :
                      "bg-violet-50 text-violet-700"
                    }`}>
                      {bill.paymentMethod}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${
                      bill.status === "paid" ? "status-active" : "status-danger"
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="text-sm font-black text-navy-900">{formatCurrency(bill.total)}</span>
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setViewBill(bill)}
                        className="group inline-flex items-center gap-1.5 rounded-2xl border border-navy-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-navy-600 transition-all hover:bg-navy-900 hover:text-white hover:border-navy-900"
                        title="View Details"
                      >
                        <Eye size={13} />
                        View
                      </button>
                      <button
                        onClick={() => handleDownload(bill)}
                        className="group inline-flex items-center gap-1.5 rounded-2xl border border-gold-300/50 bg-gold-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gold-700 transition-all hover:bg-gold-400 hover:text-navy-900 hover:shadow-gold"
                        title="Print Invoice"
                      >
                        <Download size={13} />
                        Invoice
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedBill && (
        <InvoiceModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
      )}

      {/* View Bill Details Modal */}
      {viewBill && (
        <BillDetailModal 
          bill={viewBill} 
          productMasters={productMasters}
          onClose={() => setViewBill(null)} 
        />
      )}
    </div>
  );
}
