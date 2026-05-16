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
  console.log('[API] Fetching outlets from:', url);
  const res = await fetch(url, {
    headers: authHeaders(),
  });
  const data = await handleResponse(res);
  console.log('[API] Outlets response:', data);
  return data;
};

export const fetchOutletByIdFromAPI = async (id) => {
  const res = await fetch(`${API_BASE}/outlets/${id}`, {
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
  if (payload.supplier_contact) form.append("supplier_contact", payload.supplier_contact);
  if (payload.supplier_email) form.append("supplier_email", payload.supplier_email);
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
  if (payload.supplierEmail) form.append("supplierEmail", payload.supplierEmail);
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
  // Flatten nested Product/Outlet and convert snake_case to camelCase
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
