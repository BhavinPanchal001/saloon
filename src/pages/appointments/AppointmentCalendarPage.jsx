import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Scissors,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  X,
  CreditCard,
  Check,
  Filter,
  Edit2,
} from "lucide-react";
import {
  fetchAppointmentsAPI,
  createAppointmentAPI,
  updateAppointmentAPI,
  updateAppointmentStatusAPI,
  deleteAppointmentAPI,
  fetchOutletsFromAPI,
  fetchServicesFromAPI,
  fetchStaff,
  fetchCustomersAPI,
} from "../../services/api";
import { useAuthStore } from "../../stores/authStore";

export function AppointmentCalendarPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(user?.outlet_id || "");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    customerPhone: "",
    outletId: "",
    serviceId: "",
    staffId: "",
    appointmentDate: new Date().toISOString().split("T")[0],
    startTime: "10:00",
    endTime: "",
    notes: "",
  });

  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const handleCustomerSearch = async (query) => {
    if (!query || query.trim().length < 2) {
      setCustomerSuggestions([]);
      setShowCustomerDropdown(false);
      return;
    }
    try {
      const res = await fetchCustomersAPI({ search: query });
      setCustomerSuggestions(res.customers || []);
      setShowCustomerDropdown(true);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        const [outletsRes, servicesRes, staffRes] = await Promise.all([
          fetchOutletsFromAPI(),
          fetchServicesFromAPI(),
          fetchStaff(),
        ]);
        setOutlets(outletsRes || []);
        if (outletsRes?.length > 0) {
          const defaultOutlet = selectedOutlet || user?.outlet_id || outletsRes[0].id;
          setSelectedOutlet(defaultOutlet);
          setFormData((prev) => ({ ...prev, outletId: defaultOutlet }));
        }
        setServices(servicesRes || []);
        setStaffList(staffRes || []);
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    };
    initData();
  }, []);

  const loadAppointments = async () => {
    if (!selectedOutlet) return;
    setLoading(true);
    try {
      const data = await fetchAppointmentsAPI({ outletId: selectedOutlet, date: selectedDate });
      setAppointments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [selectedOutlet, selectedDate]);

  // Filter staff by selected outlet
  const filteredStaff = useMemo(() => {
    const outletId = formData.outletId || selectedOutlet;
    if (!outletId) return staffList;
    return staffList.filter(
      (st) => !st.assignedOutletId || String(st.assignedOutletId) === String(outletId)
    );
  }, [staffList, formData.outletId, selectedOutlet]);

  const openBookingModal = () => {
    setError("");
    setEditingAppointmentId(null);
    const defaultOutlet = selectedOutlet || (outlets.length > 0 ? outlets[0].id : "");
    setFormData({
      customerId: "",
      customerName: "",
      customerPhone: "",
      outletId: defaultOutlet,
      serviceId: "",
      staffId: "",
      appointmentDate: selectedDate,
      startTime: "10:00",
      endTime: "",
      notes: "",
    });
    setShowModal(true);
  };

  const openEditModal = (apt) => {
    setError("");
    setEditingAppointmentId(apt.id);
    setFormData({
      customerId: apt.customer_id || "",
      customerName: apt.customer_name || "",
      customerPhone: apt.customer_phone || "",
      outletId: apt.outlet_id || selectedOutlet,
      serviceId: apt.service_id || "",
      staffId: apt.staff_id || "",
      appointmentDate: apt.appointment_date || selectedDate,
      startTime: apt.start_time || "10:00",
      endTime: apt.end_time || "",
      notes: apt.notes || "",
    });
    setShowModal(true);
  };

  // Helper to calculate end time from start time and duration
  const autoCalculateEndTime = (startTimeStr, serviceIdVal) => {
    if (!startTimeStr || !serviceIdVal) return "";
    const selectedSrv = services.find((s) => String(s.id) === String(serviceIdVal));
    const duration = selectedSrv?.duration || 30;

    const parts = startTimeStr.split(":");
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const totalMinutes = hours * 60 + minutes + duration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const handleServiceChange = (serviceIdVal) => {
    const calculated = autoCalculateEndTime(formData.startTime, serviceIdVal);
    setFormData((prev) => ({
      ...prev,
      serviceId: serviceIdVal,
      endTime: calculated,
    }));
  };

  const handleStartTimeChange = (timeVal) => {
    const calculated = autoCalculateEndTime(timeVal, formData.serviceId);
    setFormData((prev) => ({
      ...prev,
      startTime: timeVal,
      endTime: calculated,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    const targetOutlet = formData.outletId || selectedOutlet;
    if (!targetOutlet) {
      setError("Please select an outlet.");
      return;
    }
    try {
      if (editingAppointmentId) {
        await updateAppointmentAPI(editingAppointmentId, {
          ...formData,
          outletId: targetOutlet,
        });
      } else {
        await createAppointmentAPI({
          ...formData,
          outletId: targetOutlet,
        });
      }
      setShowModal(false);
      loadAppointments();
    } catch (err) {
      setError(err.message || "Failed to save appointment.");
    }
  };

  const handleAssignStaff = async (id, staffId) => {
    try {
      await updateAppointmentAPI(id, { staffId: staffId && staffId !== "" ? Number(staffId) : null });
      loadAppointments();
    } catch (err) {
      alert(err.message || "Failed to assign staff.");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateAppointmentStatusAPI(id, status);
      loadAppointments();
    } catch (err) {
      alert(err.message || "Failed to update status.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;
    try {
      await deleteAppointmentAPI(id);
      loadAppointments();
    } catch (err) {
      alert(err.message || "Failed to delete appointment.");
    }
  };

  const handleBillInPOS = (apt) => {
    navigate("/pos", {
      state: {
        customerName: apt.customer_name,
        customerPhone: apt.customer_phone,
        serviceId: apt.service_id,
        appointmentId: apt.id,
      },
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "requested":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "confirmed":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "in_progress":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const filteredAppointments = useMemo(() => {
    if (statusFilter === "all") return appointments;
    return appointments.filter((a) => a.status === statusFilter);
  }, [appointments, statusFilter]);

  const requestedCount = useMemo(
    () => appointments.filter((a) => a.status === "requested").length,
    [appointments]
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-indigo-600" /> Appointment Calendar
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Book, track, and manage client salon appointments and stylist availability.
          </p>
        </div>
        <button
          onClick={openBookingModal}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-indigo-200"
        >
          <Plus className="w-5 h-5" /> Book Appointment
        </button>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Select Outlet
            </label>
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
          {[
            { id: "all", label: "All" },
            { id: "requested", label: `Requested ${requestedCount > 0 ? `(${requestedCount})` : ""}` },
            { id: "confirmed", label: "Confirmed" },
            { id: "in_progress", label: "In Progress" },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Appointment Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Loading appointments...</div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl text-center border border-slate-100">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No Appointments Found</h3>
          <p className="text-slate-400 text-sm mt-1">
            There are no bookings matching the selected date, outlet, and status.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(
                      apt.status
                    )}`}
                  >
                    {apt.status.replace("_", " ")}
                  </span>
                  <div className="flex items-center gap-1 text-slate-700 font-semibold text-sm">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>{apt.start_time}</span>
                    {apt.end_time && (
                      <span className="text-slate-400 font-normal text-xs">- {apt.end_time}</span>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                    <User className="w-4 h-4 text-slate-400" /> {apt.customer_name}
                  </div>
                  <div className="text-xs text-slate-500 pl-6">{apt.customer_phone}</div>

                  {apt.service && (
                    <div className="flex items-center gap-2 text-slate-700 text-sm pl-1 pt-1">
                      <Scissors className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium">{apt.service.service_name}</span>
                      <span className="text-xs text-slate-400">
                        (₹{apt.service.price} • {apt.service.duration || 30}m)
                      </span>
                    </div>
                  )}

                  {/* Assign Staff Inline Selector */}
                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/70 p-2 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Employee:</span>
                    </div>
                    <select
                      value={apt.staff_id || ""}
                      onChange={(e) => handleAssignStaff(apt.id, e.target.value)}
                      className="text-xs font-medium py-1 px-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-indigo-400 focus:outline-none focus:border-indigo-600 max-w-[170px] truncate"
                    >
                      <option value="">-- Assign Employee --</option>
                      {filteredStaff.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} {st.role ? `(${st.role})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {apt.notes && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      "{apt.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <select
                    value={apt.status}
                    onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white text-slate-700 shadow-sm"
                  >
                    <option value="requested">Requested</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>

                  {apt.status === "requested" && (
                    <button
                      onClick={() => handleStatusChange(apt.id, "confirmed")}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                      title="Accept Online Booking"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleBillInPOS(apt)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 shadow-sm transition-colors"
                    title="Bill at POS"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> POS
                  </button>

                  <button
                    onClick={() => openEditModal(apt)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 shadow-sm transition-colors"
                    title="Edit / Reschedule Appointment"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>

                  <button
                    onClick={() => handleDelete(apt.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 shadow-sm transition-colors"
                    title="Delete appointment"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full my-8 max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Fixed) */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingAppointmentId ? "Edit / Reschedule Appointment" : "New Appointment Booking"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingAppointmentId
                    ? "Update appointment details, employee, or scheduled time"
                    : "Fill in client details and reserve a salon slot"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable Form) */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm font-medium">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Outlet *
                  </label>
                  <select
                    required
                    value={formData.outletId}
                    onChange={(e) => setFormData({ ...formData, outletId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-500 shadow-sm"
                  >
                    <option value="">Select Outlet</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Type name or search CRM client..."
                    value={formData.customerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, customerName: val, customerId: "" });
                      handleCustomerSearch(val);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
                  />

                  {/* Autocomplete Dropdown */}
                  {showCustomerDropdown && customerSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-40 overflow-y-auto">
                      {customerSuggestions.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              customerId: c.id,
                              customerName: c.name,
                              customerPhone: c.phone,
                            });
                            setShowCustomerDropdown(false);
                          }}
                          className="p-2.5 hover:bg-indigo-50 cursor-pointer transition-colors border-b border-slate-100 last:border-0 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-800">{c.name}</p>
                            <p className="text-slate-500 text-[11px]">{c.phone}</p>
                          </div>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {c.loyalty_points || 0} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={formData.customerPhone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, customerPhone: val });
                      handleCustomerSearch(val);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Service
                  </label>
                  <select
                    value={formData.serviceId}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-500 shadow-sm"
                  >
                    <option value="">Select Service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.serviceName || s.service_name} (₹{s.price} • {s.duration || 30} min)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Assigned Employee
                  </label>
                  <select
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-500 shadow-sm"
                  >
                    <option value="">-- Select Employee (Optional) --</option>
                    {filteredStaff.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} {st.role ? `(${st.role})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.appointmentDate}
                      onChange={(e) =>
                        setFormData({ ...formData, appointmentDate: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                </div>

                {formData.endTime && (
                  <div className="text-xs text-indigo-700 bg-indigo-50/80 border border-indigo-200 px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium">
                    <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Estimated Completion: <strong>{formData.endTime}</strong></span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Notes & Special Requests
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Allergies, preferences, stylist notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 shadow-sm resize-none"
                  ></textarea>
                </div>
              </div>

              {/* Modal Footer (Fixed at bottom) */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-indigo-200 transition-all cursor-pointer"
                >
                  {editingAppointmentId ? "Update Appointment" : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


