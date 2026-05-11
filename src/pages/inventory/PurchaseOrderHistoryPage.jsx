import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";
import {
  fetchPurchaseOrders,
  approvePurchaseOrder,
  receivePurchaseOrder,
} from "../../services/mockApi";
import {
  Package,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Search,
  Filter,
  ChevronDown,
  FileText,
  Plus,
} from "lucide-react";

const statusColors = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", icon: Clock },
  approved: { bg: "bg-blue-50", text: "text-blue-700", icon: CheckCircle },
  received: { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle },
  cancelled: { bg: "bg-rose-50", text: "text-rose-700", icon: AlertCircle },
};

export function PurchaseOrderHistoryPage() {
  const toast = useToastStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [processingOrderId, setProcessingOrderId] = useState(null);

  const handleApproveOrder = async (orderId) => {
    setProcessingOrderId(orderId);
    try {
      await approvePurchaseOrder(orderId);
      toast.success("Purchase order approved successfully");
      const data = await fetchPurchaseOrders();
      setOrders(data);
    } catch (err) {
      toast.error("Failed to approve order");
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleReceiveOrder = async (orderId) => {
    setProcessingOrderId(orderId);
    try {
      await receivePurchaseOrder(orderId);
      toast.success("Purchase order marked as received");
      const data = await fetchPurchaseOrders();
      setOrders(data);
    } catch (err) {
      toast.error("Failed to update order status");
    } finally {
      setProcessingOrderId(null);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchPurchaseOrders();
      setOrders(data);
    } catch (error) {
      toast.error("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchQuery ||
      order.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplierName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    approved: orders.filter((o) => o.status === "approved").length,
    received: orders.filter((o) => o.status === "received").length,
    totalValue: orders.reduce((sum, o) => sum + (o.totalCost || 0), 0),
  };

  const handleExport = () => {
    toast.success("Purchase order history exported");
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
          <button onClick={handleExport} className="btn-premium-outline flex items-center gap-2">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={() => navigate("/inventory/purchase-orders/new")} className="btn-premium-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New PO
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass-card p-5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Orders</p>
          <p className="mt-2 text-2xl font-black text-navy-900">{stats.total}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Pending</p>
          <p className="mt-2 text-2xl font-black text-amber-600">{stats.pending}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Received</p>
          <p className="mt-2 text-2xl font-black text-emerald-600">{stats.received}</p>
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
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="premium-input"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
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
            const statusStyle = statusColors[order.status] || statusColors.pending;
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
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          <StatusIcon className="h-3 w-3" />
                          {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{order.supplierName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold text-navy-900">{formatCurrency(order.totalCost)}</p>
                      <p className="text-xs text-slate-500">{order.items?.length || 0} items</p>
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
                          <div className="flex justify-between">
                            <span className="text-slate-500">Expected Delivery:</span>
                            <span className="font-medium text-navy-900">
                              {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : "Not set"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Status:</span>
                            <span className={`font-medium ${statusStyle.text}`}>
                              {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
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
                            <span className="text-slate-500">Email:</span>
                            <span className="font-medium text-navy-900">{order.supplierEmail || "N/A"}</span>
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

                    {/* Action Buttons */}
                    <div className="mt-6 flex items-center justify-end gap-3">
                      <button className="btn-premium-outline flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        View PDF
                      </button>
                      {order.status === "pending" && (
                        <button
                          onClick={() => handleApproveOrder(order.id)}
                          disabled={processingOrderId === order.id}
                          className="btn-premium-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingOrderId === order.id ? "Processing..." : "Approve Order"}
                        </button>
                      )}
                      {order.status === "approved" && (
                        <button
                          onClick={() => handleReceiveOrder(order.id)}
                          disabled={processingOrderId === order.id}
                          className="btn-premium-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingOrderId === order.id ? "Processing..." : "Mark as Received"}
                        </button>
                      )}
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
