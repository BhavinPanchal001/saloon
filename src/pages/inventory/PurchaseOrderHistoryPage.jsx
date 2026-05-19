import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";
import {
  fetchPurchaseOrdersFromAPI,
  updatePurchaseOrderAPI,
  deletePurchaseOrderAPI,
  deletePaymentAPI,
} from "../../services/api";
import {
  Package,
  Calendar,
  CheckCircle,
  Search,
  ChevronDown,
  Plus,
  CreditCard,
  Banknote,
  Pencil,
  Trash2,
  X,
  Paperclip,
} from "lucide-react";

const statusColors = {
  received: { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle },
};

export function PurchaseOrderHistoryPage() {
  const toast = useToastStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState(null);
  
  
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchPurchaseOrdersFromAPI();
      setOrders(data);
    } catch (error) {
      toast.error("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (orderId) => {
    navigate(`/inventory/purchase-orders/${orderId}/edit`);
  };

  const handleDelete = async (orderId) => {
    if (!confirm("Are you sure you want to delete this purchase order? This action cannot be undone.")) {
      return;
    }
    try {
      await deletePurchaseOrderAPI(orderId);
      toast.success("Purchase order deleted successfully");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "Failed to delete purchase order");
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm("Are you sure you want to delete this payment?")) {
      return;
    }
    try {
      await deletePaymentAPI(paymentId);
      toast.success("Payment deleted successfully");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "Failed to delete payment");
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchQuery ||
      order.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplierName?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (dateRange !== "all" && order.orderDate) {
      const orderTime = new Date(order.orderDate).getTime();
      const now = new Date();
      if (dateRange === "thisMonth") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        matchesDate = orderTime >= start;
      } else if (dateRange === "lastMonth") {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
        const end = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        matchesDate = orderTime >= start && orderTime < end;
      } else if (dateRange === "thisYear") {
        const start = new Date(now.getFullYear(), 0, 1).getTime();
        matchesDate = orderTime >= start;
      }
    }

    let matchesPayment = true;
    if (paymentFilter !== "all") {
      const totalPaid = order.payments?.reduce((sum, p) => sum + (p.totalAmount || 0), 0) ?? 0;
      const hasPending = order.payments?.some(p => p.status === 'pending');
      const hasPayments = order.payments && order.payments.length > 0;
      if (paymentFilter === "paid") {
        matchesPayment = hasPayments && totalPaid >= order.totalCost && !hasPending;
      } else if (paymentFilter === "partial") {
        matchesPayment = hasPayments && (totalPaid < order.totalCost || hasPending);
      } else if (paymentFilter === "unpaid") {
        matchesPayment = !hasPayments;
      }
    }

    return matchesSearch && matchesDate && matchesPayment;
  });

  const stats = {
    total: orders.length,
    totalValue: orders.reduce((sum, o) => sum + (o.totalCost || 0), 0),
  };

  
  if (loading) {
    return (
      <div>
        <PageHeader title="Purchase Orders" />
        <LoadingState message="Loading purchase orders..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500">Track, manage and create purchase orders</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate("/inventory/purchase-orders/new")} className="btn-premium-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New PO
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card p-5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Orders</p>
          <p className="mt-2 text-2xl font-black text-navy-900">{stats.total}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Value</p>
          <p className="mt-2 text-2xl font-black text-navy-900">{formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PO number or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="premium-input pl-10 w-full"
            />
          </div>
                    <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="premium-input"
            >
              <option value="all">All Time</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisYear">This Year</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-slate-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="premium-input"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon="package"
          title="No purchase orders found"
          description="Try adjusting your filters or create a new purchase order."
          action={<a href="/inventory" className="btn-premium-primary">Create PO</a>}
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusStyle = statusColors[order.status] || statusColors.received;
            const StatusIcon = statusStyle.icon;
            const isExpanded = expandedOrder === order.id;

            return (
              <div
                key={order.id}
                className="glass-card overflow-hidden"
              >
                {/* Order Header - Always visible */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${statusStyle.bg}`}>
                      <Package className={`h-6 w-6 ${statusStyle.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-navy-900">{order.poNumber}</span>
                      </div>
                      <p className="text-sm text-slate-500">{order.supplierName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold text-navy-900">{formatCurrency(order.totalCost)}</p>
                      <p className="text-xs text-slate-500">{order.items?.length || 0} items</p>
                    </div>
                    {/* Payment Summary */}
                    <div className="text-right hidden md:block">
                      {order.payments && order.payments.length > 0 ? (
                        (() => {
                          const hasPending = order.payments.some(p => p.status === 'pending');
                          const hasCompleted = order.payments.some(p => p.status === 'completed');
                          const totalPaid = order.payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
                          const isPartial = totalPaid < order.totalCost;
                          
                          if (hasPending || isPartial) {
                            return (
                              <>
                                <p className="text-sm font-medium text-amber-600 flex items-center gap-1 justify-end">
                                  <Banknote className="h-3 w-3" />
                                  Partial
                                </p>
                                <p className="text-xs text-slate-400">
                                  {formatCurrency(totalPaid)} / {formatCurrency(order.totalCost)}
                                </p>
                              </>
                            );
                          }
                          return (
                            <>
                              <p className="text-sm font-medium text-green-600 flex items-center gap-1 justify-end">
                                <Banknote className="h-3 w-3" />
                                Paid
                              </p>
                              <p className="text-xs text-slate-400">
                                {order.payments.length} payment{order.payments.length > 1 ? 's' : ''}
                              </p>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <p className="text-sm font-medium text-slate-500">Unpaid</p>
                          <p className="text-xs text-slate-400">No payment</p>
                        </>
                      )}
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-slate-600">{new Date(order.orderDate).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-400">Order Date</p>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/30 p-5">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-semibold text-navy-900 mb-3">Order Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">PO Number:</span>
                            <span className="font-medium text-navy-900">{order.poNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Order Date:</span>
                            <span className="font-medium text-navy-900">
                              {new Date(order.orderDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-navy-900 mb-3">Supplier Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Supplier:</span>
                            <span className="font-medium text-navy-900">{order.supplierName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Contact:</span>
                            <span className="font-medium text-navy-900">{order.supplierContact || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Phone:</span>
                            <span className="font-medium text-navy-900">{order.supplierPhone || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Product</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Unit Price</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {order.items?.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-3 text-sm text-navy-900">{item.productName}</td>
                              <td className="px-4 py-3 text-center text-sm text-slate-600">{item.qty}</td>
                              <td className="px-4 py-3 text-right text-sm text-slate-600">
                                {formatCurrency(item.unitPrice)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-navy-900">
                                {formatCurrency(item.qty * item.unitPrice)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-semibold">
                            <td colSpan={3} className="px-4 py-3 text-right text-sm text-navy-900">
                              Total
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-navy-900">
                              {formatCurrency(order.totalCost)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Attachment */}
                    {order.attachmentPath && (
                      <div className="mt-4 flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50">
                        <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                        <a
                          href={`http://localhost:5001/uploads/${order.attachmentPath}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:underline truncate"
                        >
                          {order.attachmentPath.split('/').pop()}
                        </a>
                      </div>
                    )}

                    {/* Payment Details */}
                    {order.payments && order.payments.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-navy-900 mb-3 flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gold-500" />
                          Payment Details
                        </h4>
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                          <table className="w-full">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Mode</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Amount</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {order.payments.map((payment, idx) => (
                                payment.details?.map((detail, dIdx) => (
                                  <tr key={`${idx}-${dIdx}`}>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                      {new Date(payment.paymentDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-navy-900 capitalize">
                                      {detail.paymentMode?.replace('_', ' ')}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-medium text-navy-900">
                                      {formatCurrency(detail.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                        payment.status === 'completed'
                                          ? 'bg-green-50 text-green-700'
                                          : payment.status === 'pending'
                                          ? 'bg-amber-50 text-amber-700'
                                          : 'bg-rose-50 text-rose-700'
                                      }`}>
                                        {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ))}
                              <tr className="bg-slate-50 font-semibold">
                                <td colSpan={2} className="px-4 py-3 text-right text-sm text-navy-900">
                                  Total Paid
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-green-600">
                                  {formatCurrency(order.payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0))}
                                </td>
                                <td></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        {order.payments[0]?.transactionReference && (
                          <p className="mt-2 text-xs text-slate-500">
                            Transaction Ref: {order.payments[0].transactionReference}
                          </p>
                        )}
                        {order.payments[0]?.notes && (
                          <p className="mt-1 text-xs text-slate-500">
                            Notes: {order.payments[0].notes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => handleEdit(order.id)}
                        className="flex-1 btn-premium-outline flex items-center justify-center gap-2 text-sm"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit Order
                      </button>
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="flex-1 flex items-center justify-center gap-2 text-sm bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-lg px-4 py-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
