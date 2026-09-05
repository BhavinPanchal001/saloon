const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const getToken = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("glowy-auth") || "{}");
    return stored?.state?.user?.token || null;
  } catch {
    return null;
  }
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed.");
  return data;
};

// ─── Outlets ──────────────────────────────────────────────────────────────────

export const fetchOutletsFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}/outlets${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    headers: authHeaders(),
  });
  const data = await handleResponse(res);
  return data;
};

export const fetchOutletByIdFromAPI = async (id) => {
  const res = await fetch(`${API_BASE}/outlets/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchOutletFinancialSummaryFromAPI = async (id, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/outlets/${id}/financial-summary${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createOutletAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/outlets`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateOutletAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/outlets/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const toggleOutletStatusAPI = async (id) => {
  const res = await fetch(`${API_BASE}/outlets/${id}/toggle-status`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const deleteOutletAPI = async (id) => {
  const res = await fetch(`${API_BASE}/outlets/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Services ─────────────────────────────────────────────────────────────────

export const fetchServicesFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/services${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  const data = await handleResponse(res);
  return data.map((s) => ({
    ...s,
    serviceName: s.service_name,
    price: Number(s.price),
    duration: Number(s.duration),
    categoryId: s.category_id,
    productLinkages: s.product_linkages || [],
    assignedOutletIds: s.assigned_outlet_ids || [],
    status: s.status,
  }));
};

export const fetchServiceByIdFromAPI = async (id) => {
  const res = await fetch(`${API_BASE}/services/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createServiceAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/services`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateServiceAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/services/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteServiceAPI = async (id) => {
  const res = await fetch(`${API_BASE}/services/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Service Categories ───────────────────────────────────────────────────────

export const fetchServiceCategoriesFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/service-categories${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createServiceCategoryAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/service-categories`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateServiceCategoryAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/service-categories/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteServiceCategoryAPI = async (id) => {
  const res = await fetch(`${API_BASE}/service-categories/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Packages ─────────────────────────────────────────────────────────────────

export const fetchPackagesFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/packages${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchPackageProfileFromAPI = async (id) => {
  const res = await fetch(`${API_BASE}/packages/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createPackageAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/packages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updatePackageAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/packages/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const togglePackageStatusAPI = async (id) => {
  const res = await fetch(`${API_BASE}/packages/${id}/toggle-status`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const deletePackageAPI = async (id) => {
  const res = await fetch(`${API_BASE}/packages/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const fetchProductsFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/products${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  const data = await handleResponse(res);
  return data.map((p) => ({
    ...p,
    itemName: p.item_name,
    unitPrice: Number(p.unit_price),
    unitMasterId: p.unit_master_id,
    centralStock: Number(p.central_stock ?? p.opening_stock ?? 0),
    totalNetworkStock: Number(p.central_stock ?? p.opening_stock ?? 0),
    purchaseUnit: p.purchase_unit,
    consumptionUnit: p.consumption_unit,
    productMeasure: Number(p.product_measure || 1),
    productMeasureUnit: p.product_measure_unit,
    status: p.status,
    images: Array.isArray(p.images) ? p.images : [],
    unitMaster: p.unitMaster ? {
      id: p.unitMaster.id,
      groupName: p.unitMaster.group_name,
      primaryUnit: p.unitMaster.primary_unit,
      primaryAbbr: p.unitMaster.primary_abbr,
      secondaryUnit: p.unitMaster.secondary_unit,
      secondaryAbbr: p.unitMaster.secondary_abbr,
      conversionRatio: Number(p.unitMaster.conversion_ratio),
      status: p.unitMaster.status,
    } : null,
    productMeasureLabel: p.unitMaster && p.product_measure && p.product_measure_unit
      ? `${p.product_measure} ${p.product_measure_unit === 'primary' ? p.unitMaster.primary_abbr : p.unitMaster.secondary_abbr}`
      : null,
  }));
};

export const fetchProductByIdFromAPI = async (id) => {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createProductAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      item_name: payload.itemName,
      unit_price: payload.unitPrice,
      opening_stock: payload.openingStock,
      unit_master_id: payload.unitMasterId,
      purchase_unit: payload.purchaseUnit,
      consumption_unit: payload.consumptionUnit,
      product_measure: payload.productMeasure,
      product_measure_unit: payload.productMeasureUnit,
      images: Array.isArray(payload.images) ? payload.images : [],
    }),
  });
  return handleResponse(res);
};

export const updateProductAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteProductAPI = async (id) => {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Purchase Orders ───────────────────────────────────────────────────────────

export const fetchPurchaseOrdersFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/purchase-orders${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchPurchaseOrderByIdFromAPI = async (id) => {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

const authHeadersNoContentType = () => ({
  Authorization: `Bearer ${getToken()}`,
});

export const createPurchaseOrderAPI = async (payload, payment = null, attachmentFile = null) => {
  const form = new FormData();
  form.append("supplierName", payload.supplierName);
  if (payload.outletId) form.append("outletId", payload.outletId);
  if (payload.supplier_contact) form.append("supplier_contact", payload.supplier_contact);
  if (payload.supplier_phone) form.append("supplier_phone", payload.supplier_phone);
  form.append("taxRate", payload.taxRate ?? 0);
  form.append("notes", payload.notes || "");
  form.append("orderDate", payload.orderDate || "");
  form.append("items", JSON.stringify(payload.items || []));
  if (payment) form.append("payment", JSON.stringify(payment));
  if (attachmentFile) form.append("attachment", attachmentFile);
  const res = await fetch(`${API_BASE}/purchase-orders`, {
    method: "POST",
    headers: authHeadersNoContentType(),
    body: form,
  });
  return handleResponse(res);
};

export const approvePurchaseOrderAPI = async (id) => {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}/approve`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const receivePurchaseOrderAPI = async (id) => {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}/receive`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const cancelPurchaseOrderAPI = async (id) => {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}/cancel`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const updatePurchaseOrderAPI = async (id, payload, attachmentFile = null) => {
  const form = new FormData();
  form.append("supplierName", payload.supplierName);
  if (payload.supplierContact) form.append("supplierContact", payload.supplierContact);
  if (payload.supplierPhone) form.append("supplierPhone", payload.supplierPhone);
  form.append("taxRate", payload.taxRate ?? 0);
  form.append("notes", payload.notes || "");
  form.append("orderDate", payload.orderDate || "");
  form.append("items", JSON.stringify(payload.items || []));
  form.append("payment", JSON.stringify(payload.payment ?? false));
  if (attachmentFile) form.append("attachment", attachmentFile);
  const res = await fetch(`${API_BASE}/purchase-orders/${id}`, {
    method: "PUT",
    headers: authHeadersNoContentType(),
    body: form,
  });
  return handleResponse(res);
};

export const deletePurchaseOrderAPI = async (id) => {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const deleteAttachmentAPI = async (id) => {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}/attachment`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const deletePaymentAPI = async (id) => {
  const res = await fetch(`${API_BASE}/payments/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Unit Masters ─────────────────────────────────────────────────────────────

export const fetchUnitMastersFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/unit-masters${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createUnitMaster = async (payload) => {
  const res = await fetch(`${API_BASE}/unit-masters`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateUnitMaster = async (id, payload) => {
  const res = await fetch(`${API_BASE}/unit-masters/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const toggleUnitMasterStatusAPI = async (id) => {
  const res = await fetch(`${API_BASE}/unit-masters/${id}/toggle-status`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const deleteUnitMasterAPI = async (id) => {
  const res = await fetch(`${API_BASE}/unit-masters/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Outlet Inventory ─────────────────────────────────────────────────────────

export const fetchOutletInventoryFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/outlet-inventory${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  const data = await handleResponse(res);
  return data.map((item) => ({
    id: item.id,
    outletId: item.outlet_id,
    outletName: item.Outlet?.name || '',
    productId: item.product_id,
    itemName: item.Product?.item_name || '',
    unitPrice: Number(item.Product?.unit_price || 0),
    unitMasterId: item.Product?.unit_master_id,
    currentStock: Number(item.current_stock || 0),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    unitMaster: item.Product?.unitMaster ? {
      id: item.Product.unitMaster.id,
      groupName: item.Product.unitMaster.group_name,
      primaryUnit: item.Product.unitMaster.primary_unit,
      primaryAbbr: item.Product.unitMaster.primary_abbr,
      secondaryUnit: item.Product.unitMaster.secondary_unit,
      secondaryAbbr: item.Product.unitMaster.secondary_abbr,
      conversionRatio: Number(item.Product.unitMaster.conversion_ratio),
    } : null,
    consumptionUnit: item.Product?.consumption_unit || 'primary',
  }));
};

export const issueProductToOutletAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/outlet-inventory/issue`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const fetchStockIssuesFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/outlet-inventory/issues${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchOutletProductPricesFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/outlet-inventory/prices${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  const data = await handleResponse(res);
  // Backend only returns product prices for now - map to expected format
  return data.map((item) => ({
    id: item.id,
    type: 'product',
    outletId: item.outlet_id,
    productId: item.product_id,
    itemName: item.Product?.item_name || '',
    basePrice: Number(item.Product?.unit_price || 0),
    price: Number(item.price || 0),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
};

export const saveOutletProductPriceAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/outlet-inventory/prices`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteOutletProductPriceAPI = async (outletId, itemId, type = 'product') => {
  // type can be 'product', 'service', or 'package'
  // Backend currently only supports product prices
  const res = await fetch(`${API_BASE}/outlet-inventory/prices/${outletId}/${itemId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const fetchPaymentsFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/payments${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchPaymentByIdFromAPI = async (id) => {
  const res = await fetch(`${API_BASE}/payments/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createPaymentAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updatePaymentStatusAPI = async (id, status) => {
  const res = await fetch(`${API_BASE}/payments/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
};

// ─── Purchase Order Payments ──────────────────────────────────────────────────

export const fetchPaymentsByPurchaseOrderFromAPI = async (purchaseOrderId) => {
  const res = await fetch(`${API_BASE}/purchase-orders/${purchaseOrderId}/payments`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── POS ──────────────────────────────────────────────────────────────────────

export const fetchPOSCatalogFromAPI = async ({ outletId } = {}) => {
  const params = outletId ? { outletId } : {};
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/pos/catalog${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const checkoutBillAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/pos/checkout`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const fetchBillsFromAPI = async ({ outletId, search, paymentMethod } = {}) => {
  const params = {};
  if (outletId) params.outletId = outletId;
  if (search) params.search = search;
  if (paymentMethod) params.paymentMethod = paymentMethod;

  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/pos/bills${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchBillByIdFromAPI = async (id) => {
  const res = await fetch(`${API_BASE}/pos/bills/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const addBillPaymentAPI = async (billId, payload) => {
  const res = await fetch(`${API_BASE}/pos/bills/${billId}/payments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateBillAPI = async (billId, payload) => {
  const res = await fetch(`${API_BASE}/pos/bills/${billId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};


// Trigger thermal print for a specific bill
export const printReceiptAPI = async (billId) => {
  const res = await fetch(`${API_BASE}/pos/print-receipt/${billId}`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// Send WhatsApp receipt for a specific bill
export const sendWhatsAppBillAPI = async (billId) => {
  const res = await fetch(`${API_BASE}/pos/bills/${billId}/send-whatsapp`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(res);
};


// ─── Printer Settings ─────────────────────────────────────────────────────────

export const fetchPrinterStatusAPI = async () => {
  const res = await fetch(`${API_BASE}/printer/status`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const togglePrinterAPI = async (enabled) => {
  const res = await fetch(`${API_BASE}/printer/toggle`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ enabled }),
  });
  return handleResponse(res);
};

export const testPrintAPI = async () => {
  const res = await fetch(`${API_BASE}/printer/test-print`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const switchPrinterConnectionAPI = async (type) => {
  const res = await fetch(`${API_BASE}/printer/connection-type`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ type }),
  });
  return handleResponse(res);
};

export const savePrinterSettingsAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/printer/settings`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

// ─── Banks ────────────────────────────────────────────────────────────────────

export const fetchBanksFromAPI = async () => {
  const res = await fetch(`${API_BASE}/banks`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchActiveBanksFromAPI = async () => {
  const res = await fetch(`${API_BASE}/banks/active`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchBankByIdFromAPI = async (id) => {
  const res = await fetch(`${API_BASE}/banks/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createBankAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/banks`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateBankAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/banks/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteBankAPI = async (id) => {
  const res = await fetch(`${API_BASE}/banks/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const setDefaultBankAPI = async (id) => {
  const res = await fetch(`${API_BASE}/banks/${id}/set-default`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const depositAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/banks/${id}/deposit`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const withdrawAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/banks/${id}/withdraw`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const transferAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/banks/transfer`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const fetchBankTransactionsFromAPI = async (id) => {
  const res = await fetch(`${API_BASE}/banks/${id}/transactions`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Expenses ───────────────────────────────────────────────────────────────

export const fetchExpensesFromAPI = async ({ outletId, monthKey } = {}) => {
  const params = {};
  if (outletId) params.outletId = outletId;
  if (monthKey) params.monthKey = monthKey;
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/expenses${query ? `?${query}` : ''}`, {
    headers: authHeaders(),
  });
  const data = await handleResponse(res);
  // Transform snake_case to camelCase for frontend
  return data.map((e) => ({
    id: e.id,
    itemName: e.item_name,
    qty: e.qty ? Number(e.qty) : null,
    price: Number(e.price),
    totalAmount: Number(e.total_amount),
    billNo: e.bill_no,
    outletId: e.outlet_id,
    monthKey: e.month_key,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
    outlet: e.Outlet
      ? {
        id: e.Outlet.id,
        name: e.Outlet.name,
        code: e.Outlet.code,
      }
      : null,
    payments: (e.payments || []).map((p) => ({
      id: p.id,
      totalAmount: Number(p.total_amount),
      status: p.status,
      details: (p.details || []).map((d) => ({
        id: d.id,
        amount: Number(d.amount),
        paymentMode: d.payment_mode,
      })),
    })),
  }));
};

export const createExpenseAPI = async (payload) => {
  const body = {
    item_name: payload.itemName,
    qty: payload.qty,
    price: payload.price,
    total_amount: payload.totalAmount,
    bill_no: payload.billNo,
    outlet_id: payload.outletId,
    month_key: payload.monthKey,
  };
  if (payload.payment) body.payment = payload.payment;
  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
};

export const deleteExpenseAPI = async (id) => {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchBudgetSummaryFromAPI = async ({ outletId, monthKey } = {}) => {
  const params = {};
  if (outletId) params.outletId = outletId;
  if (monthKey) params.monthKey = monthKey;
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/budgets/summary${query ? `?${query}` : ''}`, {
    headers: authHeaders(),
  });
  const data = await handleResponse(res);
  // Transform snake_case to camelCase
  return {
    totalMonthlyBudget: data.total_monthly_budget,
    totalExpensesSoFar: data.total_expenses_so_far,
    remainingBalance: data.remaining_balance,
    spendPercentage: data.spend_percentage,
    monthKey: data.month_key,
    budgets: data.budgets?.map(b => ({
      outletId: b.outlet_id,
      outletName: b.outlet_name,
      amount: b.amount,
      spendPercentage: b.spend_percentage,
      currentExpenses: b.current_expenses,
      remainingBudget: b.remaining_budget,
    })) || [],
  };
};

export const updateMonthlyBudgetAPI = async ({ outletId, amount, monthKey, reason }) => {
  const res = await fetch(`${API_BASE}/budgets`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      outletId,
      amount,
      monthKey,
      reason,
    }),
  });
  return handleResponse(res);
};

export const fetchBudgetHistoryFromAPI = async ({ outletId, monthKey, limit = 50 } = {}) => {
  const params = { limit };
  if (outletId) params.outletId = outletId;
  if (monthKey) params.monthKey = monthKey;
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/budgets/history${query ? `?${query}` : ''}`, {
    headers: authHeaders(),
  });
  const data = await handleResponse(res);
  // Transform snake_case to camelCase
  return data.map(h => ({
    id: h.id,
    outletId: h.outlet_id,
    outletName: h.outlet_name,
    monthKey: h.month_key,
    previousAmount: h.previous_amount,
    newAmount: h.new_amount,
    changeAmount: h.change_amount,
    changeType: h.change_type,
    reason: h.reason,
    changedAt: h.changed_at,
  }));
};

export const fetchAvailableMonthsFromAPI = async () => {
  const res = await fetch(`${API_BASE}/budgets/months`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Audit Logs ────────────────────────────────────────────────────────────────

export const fetchAuditLogsFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}/audit-logs${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchEntityAuditTrailFromAPI = async (entityType, entityId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}/audit-logs/entity/${entityType}/${entityId}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchAuditSummaryFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}/audit-logs/summary${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchStockMovementsFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}/audit-logs/stock-movements${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const fetchNotificationsAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/notifications${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const markNotificationReadAPI = async (id) => {
  const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const markAllNotificationsReadAPI = async () => {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const deleteNotificationAPI = async (id) => {
  const res = await fetch(`${API_BASE}/notifications/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const clearAllNotificationsAPI = async () => {
  const res = await fetch(`${API_BASE}/notifications/clear-all`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── HR & Employee API Wrappers ──────────────────────────────────────────────

export const fetchStaff = async ({ outletId } = {}) => {
  const params = outletId ? { outletId } : {};
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/staff${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchStaffProfile = async (id) => {
  const res = await fetch(`${API_BASE}/staff/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const saveStaff = async (payload) => {
  const res = await fetch(`${API_BASE}/staff`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateStaffStatus = async (id, status) => {
  const res = await fetch(`${API_BASE}/staff/${id}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
};

export const resetStaffPassword = async (id) => {
  const res = await fetch(`${API_BASE}/staff/${id}/reset-password`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const grantAdvance = async (id, payload) => {
  const res = await fetch(`${API_BASE}/staff/${id}/advances`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteEmployee = async (id) => {
  const res = await fetch(`${API_BASE}/staff/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Contracts API Wrappers ──────────────────────────────────────────────────

export const fetchContracts = async () => {
  const res = await fetch(`${API_BASE}/contracts`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchContractById = async (id) => {
  const res = await fetch(`${API_BASE}/contracts/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const saveContract = async (payload) => {
  const res = await fetch(`${API_BASE}/contracts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteContract = async (id) => {
  const res = await fetch(`${API_BASE}/contracts/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── HR Masters API Wrappers ──────────────────────────────────────────────────

// 1. Roles
export const fetchRoles = async () => {
  const res = await fetch(`${API_BASE}/roles`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const saveRole = async (payload) => {
  const res = await fetch(`${API_BASE}/roles`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteRole = async (id) => {
  const res = await fetch(`${API_BASE}/roles/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const toggleRoleStatus = async (id) => {
  const res = await fetch(`${API_BASE}/roles/${id}/toggle`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// 2. Shifts
export const fetchShifts = async () => {
  const res = await fetch(`${API_BASE}/shifts`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const saveShift = async (payload) => {
  const res = await fetch(`${API_BASE}/shifts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteShift = async (id) => {
  const res = await fetch(`${API_BASE}/shifts/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const toggleShiftStatus = async (id) => {
  const res = await fetch(`${API_BASE}/shifts/${id}/toggle`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// 3. Leave Types
export const fetchLeaveTypes = async () => {
  const res = await fetch(`${API_BASE}/leave-types`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const saveLeaveType = async (payload) => {
  const res = await fetch(`${API_BASE}/leave-types`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteLeaveType = async (id) => {
  const res = await fetch(`${API_BASE}/leave-types/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// 4. Work Weeks
export const fetchWorkWeeks = async () => {
  const res = await fetch(`${API_BASE}/work-weeks`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const saveWorkWeek = async (payload) => {
  const res = await fetch(`${API_BASE}/work-weeks`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteWorkWeek = async (id) => {
  const res = await fetch(`${API_BASE}/work-weeks/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const toggleWorkWeekStatus = async (id) => {
  const res = await fetch(`${API_BASE}/work-weeks/${id}/toggle`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// 5. Contract Types
export const fetchContractTypes = async () => {
  const res = await fetch(`${API_BASE}/contract-types`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const saveContractType = async (payload) => {
  const res = await fetch(`${API_BASE}/contract-types`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteContractType = async (id) => {
  const res = await fetch(`${API_BASE}/contract-types/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const toggleContractTypeStatus = async (id) => {
  const res = await fetch(`${API_BASE}/contract-types/${id}/toggle`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// 6. Holiday Templates
export const fetchHolidayTemplates = async () => {
  const res = await fetch(`${API_BASE}/holiday-templates`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const saveHolidayTemplate = async (payload) => {
  const res = await fetch(`${API_BASE}/holiday-templates`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteHolidayTemplate = async (id) => {
  const res = await fetch(`${API_BASE}/holiday-templates/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// 7. Holidays (Occasions)
export const fetchHolidays = async () => {
  const res = await fetch(`${API_BASE}/holidays`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const saveHoliday = async (payload) => {
  const res = await fetch(`${API_BASE}/holidays`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteHoliday = async (id) => {
  const res = await fetch(`${API_BASE}/holidays/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// 8. Contract Groups
export const fetchContractGroups = async () => {
  const res = await fetch(`${API_BASE}/contract-groups`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const saveContractGroup = async (payload) => {
  const res = await fetch(`${API_BASE}/contract-groups`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteContractGroup = async (id) => {
  const res = await fetch(`${API_BASE}/contract-groups/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// 9. Salary Component Masters
export const fetchSalaryMasters = async () => {
  const res = await fetch(`${API_BASE}/salary-masters`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchSalaryMasterById = async (id) => {
  const res = await fetch(`${API_BASE}/salary-masters/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const saveSalaryMaster = async (payload) => {
  const res = await fetch(`${API_BASE}/salary-masters`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteSalaryMaster = async (id) => {
  const res = await fetch(`${API_BASE}/salary-masters/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const toggleSalaryMasterStatus = async (id) => {
  const res = await fetch(`${API_BASE}/salary-masters/${id}/toggle`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// Aliases for compatibility
export const fetchOutlets = fetchOutletsFromAPI;

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const fetchDashboardSummaryFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/dashboard/summary${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Attendance ──────────────────────────────────────────────────────────────
export const fetchAttendanceData = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null)
  );
  const query = new URLSearchParams(cleanParams).toString();
  const res = await fetch(`${API_BASE}/attendance${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchAttendanceSummary = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null)
  );
  const query = new URLSearchParams(cleanParams).toString();
  const res = await fetch(`${API_BASE}/attendance/summary${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const markAttendance = async (payload) => {
  const res = await fetch(`${API_BASE}/attendance/mark`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const checkInStaff = async (payload) => {
  const res = await fetch(`${API_BASE}/attendance/check-in`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const checkOutStaff = async (payload) => {
  const res = await fetch(`${API_BASE}/attendance/check-out`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const breakInStaff = async (payload) => {
  const res = await fetch(`${API_BASE}/attendance/break-in`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const breakOutStaff = async (payload) => {
  const res = await fetch(`${API_BASE}/attendance/break-out`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

// ─── App Users Management ───────────────────────────────────────────────────

export const fetchUsersFromAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/users${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createUserAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateUserAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const toggleUserStatusAPI = async (id) => {
  const res = await fetch(`${API_BASE}/users/${id}/toggle-status`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const deleteUserAPI = async (id) => {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Roles & Permissions Management ─────────────────────────────────────────

export const fetchRolesFromAPI = async () => {
  const res = await fetch(`${API_BASE}/roles`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const saveRoleAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/roles`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const toggleRoleStatusAPI = async (id) => {
  const res = await fetch(`${API_BASE}/roles/${id}/toggle`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const deleteRoleAPI = async (id) => {
  const res = await fetch(`${API_BASE}/roles/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Coupons Management ───────────────────────────────────────────────────────

export const fetchCouponsFromAPI = async () => {
  const res = await fetch(`${API_BASE}/coupons`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createCouponAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/coupons`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateCouponAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/coupons/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteCouponAPI = async (id) => {
  const res = await fetch(`${API_BASE}/coupons/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const validateCouponAPI = async (code, subtotal) => {
  const res = await fetch(`${API_BASE}/coupons/validate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ code, subtotal }),
  });
  return handleResponse(res);
};

// ─── Vouchers Management ──────────────────────────────────────────────────────

export const fetchVouchersAPI = async (params = {}) => {
  const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
    if (val !== undefined && val !== null && val !== "" && val !== "all") {
      acc[key] = val;
    }
    return acc;
  }, {});
  const query = new URLSearchParams(cleanParams).toString();
  const url = `${API_BASE}/vouchers${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchVoucherRedemptionsAPI = async (params = {}) => {
  const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      acc[key] = val;
    }
    return acc;
  }, {});
  const query = new URLSearchParams(cleanParams).toString();
  const url = `${API_BASE}/vouchers/redemptions${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchCustomerVouchersAPI = async (customerId, params = {}) => {
  const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      acc[key] = val;
    }
    return acc;
  }, {});
  const query = new URLSearchParams(cleanParams).toString();
  const url = `${API_BASE}/vouchers/customer/${customerId}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const issueVoucherAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/vouchers`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const validateVoucherAPI = async (code, subtotal, customerId) => {
  const res = await fetch(`${API_BASE}/vouchers/validate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ code, subtotal, customerId }),
  });
  return handleResponse(res);
};

export const updateVoucherAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/vouchers/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteVoucherAPI = async (id) => {
  const res = await fetch(`${API_BASE}/vouchers/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const cancelVoucherAPI = async (id) => {
  const res = await fetch(`${API_BASE}/vouchers/${id}/cancel`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const resendVoucherWhatsAppAPI = async (id) => {
  const res = await fetch(`${API_BASE}/vouchers/${id}/send-whatsapp`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchVoucherRewardRulesAPI = async () => {
  const res = await fetch(`${API_BASE}/vouchers/reward-rules`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const updateVoucherRewardRulesAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/vouchers/reward-rules`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

// ─── Customers API ────────────────────────────────────────────────────────────

export const fetchCustomersAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/customers?${query}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchCustomerByIdAPI = async (id) => {
  const res = await fetch(`${API_BASE}/customers/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createCustomerAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/customers`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateCustomerAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/customers/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteCustomerAPI = async (id) => {
  const res = await fetch(`${API_BASE}/customers/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Processed Payroll ────────────────────────────────────────────────────────

export const fetchPayrollSummaries = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/payroll${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchPayrollById = async (id) => {
  const res = await fetch(`${API_BASE}/payroll/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const savePayrollRun = async (payload) => {
  const res = await fetch(`${API_BASE}/payroll`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const payPayrollRun = async (id, payload) => {
  const res = await fetch(`${API_BASE}/payroll/${id}/pay`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deletePayrollRun = async (id) => {
  const res = await fetch(`${API_BASE}/payroll/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchCustomerLedgerAPI = async (id) => {
  const res = await fetch(`${API_BASE}/customers/${id}/ledger`, {
    headers: authHeaders(),
  }); 
  return handleResponse(res);
};

export const settleCustomerBalanceAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/customers/${id}/settle`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const sendCustomerDueReminderWhatsAppAPI = async (id, payload = {}) => {
  const res = await fetch(`${API_BASE}/customers/${id}/send-whatsapp-reminder`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const fetchCustomerCreditReportAPI = async () => {
  const res = await fetch(`${API_BASE}/reports/customer-credit`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Appointments API ─────────────────────────────────────────────────────────

export const fetchAppointmentsAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/appointments?${query}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createAppointmentAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/appointments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const fetchAppointmentByIdAPI = async (id) => {
  const res = await fetch(`${API_BASE}/appointments/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const updateAppointmentAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/appointments/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateAppointmentStatusAPI = async (id, status) => {
  const res = await fetch(`${API_BASE}/appointments/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
};

export const deleteAppointmentAPI = async (id) => {
  const res = await fetch(`${API_BASE}/appointments/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Reports API ──────────────────────────────────────────────────────────────

export const fetchShiftEndReportAPI = async (outletId, date) => {
  const res = await fetch(`${API_BASE}/reports/shift-end?outletId=${outletId}&date=${date || ''}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchProfitLossReportAPI = async (outletId, startDate, endDate) => {
  const res = await fetch(`${API_BASE}/reports/profit-loss?outletId=${outletId || ''}&startDate=${startDate || ''}&endDate=${endDate || ''}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchGstReportAPI = async (outletId, startDate, endDate) => {
  const res = await fetch(`${API_BASE}/reports/gst?outletId=${outletId || ''}&startDate=${startDate || ''}&endDate=${endDate || ''}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchTopSellingReportAPI = async (outletId, startDate, endDate) => {
  const res = await fetch(`${API_BASE}/reports/top-selling?outletId=${outletId || ''}&startDate=${startDate || ''}&endDate=${endDate || ''}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchStockSummaryReportAPI = async (outletId) => {
  const res = await fetch(`${API_BASE}/reports/stock-summary?outletId=${outletId || ''}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchLowStockReportAPI = async (outletId) => {
  const res = await fetch(`${API_BASE}/reports/low-stock?outletId=${outletId || ''}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchPurchaseOrdersReportAPI = async (outletId, startDate, endDate) => {
  const res = await fetch(`${API_BASE}/reports/purchase-orders?outletId=${outletId || ''}&startDate=${startDate || ''}&endDate=${endDate || ''}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchEmployeeAttendanceReportAPI = async (outletId, startDate, endDate) => {
  const res = await fetch(`${API_BASE}/reports/employee-attendance?outletId=${outletId || ''}&startDate=${startDate || ''}&endDate=${endDate || ''}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchEmployeePayrollReportAPI = async (monthKey) => {
  const res = await fetch(`${API_BASE}/reports/employee-payroll?monthKey=${monthKey || ''}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchGstr2ReportAPI = async (outletId, startDate, endDate) => {
  const res = await fetch(`${API_BASE}/reports/gstr2?outletId=${outletId || ''}&startDate=${startDate || ''}&endDate=${endDate || ''}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};


export const downloadReportFileAPI = async (type, format, params = {}) => {
  const query = new URLSearchParams({ type, ...params }).toString();
  const endpoint = format === 'pdf' ? '/reports/export-pdf' : '/reports/export-csv';
  const res = await fetch(`${API_BASE}${endpoint}?${query}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to download ${format.toUpperCase()} report`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `glowy_${type}_report_${Date.now()}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};


// ─── Settings API ─────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  profile: { fullName: 'Admin User', email: 'admin@glowy.com', phone: '', timezone: 'IST', language: 'English' },
  notifications: { emailAlerts: true, pushNotifications: true, marketingEmails: false, securityAlerts: true, autoSendWhatsAppOnPOS: true },
  appearance: { theme: 'light', compactMode: false, highContrast: false },
  security: { twoFactorEnabled: false, sessionTimeout: 30 },
  inventory: { allowOutOfStockCheckout: false },
};

export const fetchSettings = async () => {
  try {
    const saved = localStorage.getItem('glowy_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        notifications: {
          ...DEFAULT_SETTINGS.notifications,
          ...(parsed.notifications || {}),
        },
        inventory: {
          ...DEFAULT_SETTINGS.inventory,
          ...(parsed.inventory || {}),
        },
      };
    }
  } catch (err) {
    console.error("Error reading settings from localStorage:", err);
  }
  return DEFAULT_SETTINGS;
};


export const saveSettings = async (settingsPayload) => {
  try {
    const current = await fetchSettings();
    const updated = {
      ...current,
      ...settingsPayload,
      notifications: {
        ...(current.notifications || {}),
        ...(settingsPayload.notifications || {}),
      },
        inventory: {
        ...(current.inventory || {}),
        ...(settingsPayload.inventory || {}),
      },
    };
    localStorage.setItem('glowy_settings', JSON.stringify(updated));
    return { success: true, settings: updated };
  } catch (err) {
    console.error("Error saving settings to localStorage:", err);
    return { success: false, error: err.message };
  }
};

export const DEFAULT_BUSINESS_INFO = {
  name: "Glowy",
  tagline: "Glow to go with Glowy",
  logoUrl: "",
  showLogoOnReceipt: true,
  address: "Kuala Lumpur, Malaysia",
  phone: "+60 12-345 6789",
  ownerPhone: "",
  email: "hello@glowy.my",
  website: "www.glowy.my",
  taxNumber: "",
  currency: "RM",
  receiptHeader: "Welcome to Glowy",
  receiptFooter: "Thank you for visiting! Glow to go with Glowy ✨",
  terms: "Services and products once rendered/sold are non-refundable. Computer generated invoice.",
};

export const fetchBusinessSettingsAPI = async () => {
  try {
    const res = await fetch(`${API_BASE}/business-settings`, {
      headers: authHeaders(),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.success && json?.data) {
        localStorage.setItem('glowy_business_info', JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (err) {
    console.warn("Could not fetch business settings from server, falling back to cached/default:", err.message);
  }
  try {
    const cached = localStorage.getItem('glowy_business_info');
    if (cached) return { ...DEFAULT_BUSINESS_INFO, ...JSON.parse(cached) };
  } catch (_) {}
  return DEFAULT_BUSINESS_INFO;
};

export const saveBusinessSettingsAPI = async (payload) => {
  try {
    const res = await fetch(`${API_BASE}/business-settings`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await handleResponse(res);
    if (json?.success && json?.data) {
      localStorage.setItem('glowy_business_info', JSON.stringify(json.data));
      window.dispatchEvent(new Event('glowy_business_info_updated'));
      return json;
    }
    return json;
  } catch (err) {
    console.error("Failed to save business settings to server:", err);
    throw err;
  }
};

export const uploadBusinessLogoAPI = async (file) => {
  const form = new FormData();
  form.append("logo", file);

  const res = await fetch(`${API_BASE}/business-settings/logo`, {
    method: "POST",
    headers: authHeadersNoContentType(),
    body: form,
  });
  const json = await handleResponse(res);
  if (json?.success && json?.data?.logoUrl) {
    try {
      const cached = JSON.parse(localStorage.getItem('glowy_business_info') || '{}');
      const updated = { ...cached, logoUrl: json.data.logoUrl };
      localStorage.setItem('glowy_business_info', JSON.stringify(updated));
      window.dispatchEvent(new Event('glowy_business_info_updated'));
    } catch (_) {}
  }
  return json;
};



// ─── Payroll & Commission API Wrappers ────────────────────────────────────────

export const fetchCommissionBadgeConfig = async () => {
  return [
    { minSales: 0, maxSales: 10000, name: "Bronze", icon: "🥉", color: "#CD7F32", percent: 1 },
    { minSales: 10001, maxSales: 30000, name: "Silver", icon: "🥈", color: "#C0C0C0", percent: 2 },
    { minSales: 30001, maxSales: 50000, name: "Gold", icon: "🥇", color: "#FFD700", percent: 3 },
    { minSales: 50001, maxSales: Infinity, name: "Platinum", icon: "💎", color: "#E5E4E2", percent: 5 },
  ];
};

export const fetchPayrollWithCommission = async (monthKey) => {
  const staff = await fetchStaff();
  return (staff || []).map((s) => {
    const baseSalary = s.baseSalary || 25000;
    const totalSales = 15000; // default baseline sales
    const commissionAmount = Math.round(totalSales * 0.02);
    const grossSalary = baseSalary + commissionAmount;
    const pfDeduction = Math.round(baseSalary * 0.12);
    const netSalary = grossSalary - pfDeduction;

    return {
      employeeId: s.id,
      name: s.name,
      role: s.role || 'Staff',
      outletName: s.assignedOutletName || 'Main Branch',
      baseSalary,
      totalSales,
      commissionPercent: 2,
      commissionAmount,
      grossSalary,
      pfDeduction,
      netSalary,
      monthKey: monthKey || new Date().toISOString().slice(0, 7),
    };
  });
};

export const calculateAllSalaries = async (monthKey) => {
  return fetchPayrollWithCommission(monthKey);
};

// ─── Customer Reward & Loyalty API ──────────────────────────────────────────────

export const fetchRewardSettingsAPI = async () => {
  const res = await fetch(`${API_BASE}/rewards/settings`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const updateRewardSettingsAPI = async (settings) => {
  const res = await fetch(`${API_BASE}/rewards/settings`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ settings }),
  });
  return handleResponse(res);
};

export const fetchRewardTiersAPI = async () => {
  const res = await fetch(`${API_BASE}/rewards/tiers`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createRewardTierAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/rewards/tiers`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateRewardTierAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/rewards/tiers/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteRewardTierAPI = async (id) => {
  const res = await fetch(`${API_BASE}/rewards/tiers/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const fetchCustomerPointsHistoryAPI = async (customerId) => {
  const res = await fetch(`${API_BASE}/rewards/customers/${customerId}/history`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const adjustCustomerPointsAPI = async (customerId, { points, notes }) => {
  const res = await fetch(`${API_BASE}/rewards/customers/${customerId}/adjust`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ points, notes }),
  });
  return handleResponse(res);
};

// ─── WhatsApp Settings & Baileys ──────────────────────────────────────────────

export const fetchWhatsAppSettingsAPI = async () => {
  const res = await fetch(`${API_BASE}/whatsapp/settings`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const saveWhatsAppSettingsAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/whatsapp/settings`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const fetchWhatsAppStatusAPI = async () => {
  const res = await fetch(`${API_BASE}/whatsapp/status`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const connectBaileysAPI = async () => {
  const res = await fetch(`${API_BASE}/whatsapp/baileys/connect`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const disconnectBaileysAPI = async () => {
  const res = await fetch(`${API_BASE}/whatsapp/baileys/disconnect`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const sendWhatsAppTestMessageAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/whatsapp/test-message`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const fetchWhatsAppLogsAPI = async (limit = 50) => {
  const res = await fetch(`${API_BASE}/whatsapp/logs?limit=${limit}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// ─── Global Search ───────────────────────────────────────────────────────────

export const globalSearchAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/search${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};






