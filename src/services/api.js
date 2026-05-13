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
