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

// Terminals
export const fetchTerminalsAPI = async (outletId) => {
  const query = outletId ? `?outlet_id=${outletId}` : "";
  const res = await fetch(`${API_BASE}/pos-shifts/terminals${query}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const createTerminalAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/pos-shifts/terminals`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateTerminalAPI = async (id, payload) => {
  const res = await fetch(`${API_BASE}/pos-shifts/terminals/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteTerminalAPI = async (id) => {
  const res = await fetch(`${API_BASE}/pos-shifts/terminals/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
};

// POS Shifts
export const fetchActiveShiftAPI = async (terminalId) => {
  const query = terminalId ? `?terminal_id=${terminalId}` : "";
  const res = await fetch(`${API_BASE}/pos-shifts/shifts/active${query}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const openShiftAPI = async (payload) => {
  const res = await fetch(`${API_BASE}/pos-shifts/shifts/open`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateShiftAPI = async (shiftId, payload) => {
  const res = await fetch(`${API_BASE}/pos-shifts/shifts/${shiftId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const addCashMovementAPI = async (shiftId, payload) => {
  const res = await fetch(`${API_BASE}/pos-shifts/shifts/${shiftId}/cash-movement`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const fetchXReportAPI = async (shiftId) => {
  const res = await fetch(`${API_BASE}/pos-shifts/shifts/${shiftId}/x-report`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};

export const closeShiftAPI = async (shiftId, payload) => {
  const res = await fetch(`${API_BASE}/pos-shifts/shifts/${shiftId}/close`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const fetchShiftHistoryAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/pos-shifts/shifts/history${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
};
