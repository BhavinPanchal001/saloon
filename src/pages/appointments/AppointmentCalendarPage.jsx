import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, User, Scissors, Plus, CheckCircle, XCircle, AlertCircle, Trash2, X } from "lucide-react";
import { fetchAppointmentsAPI, createAppointmentAPI, updateAppointmentStatusAPI, deleteAppointmentAPI, fetchOutletsFromAPI, fetchServicesFromAPI, fetchStaff, fetchCustomersAPI } from "../../services/api";
import { useAuthStore } from "../../stores/authStore";

export function AppointmentCalendarPage() {
  const user = useAuthStore((state) => state.user);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(user?.outlet_id || "");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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

  const openBookingModal = () => {
    setError("");
    setFormData({
      customerId: "",
      customerName: "",
      customerPhone: "",
      outletId: selectedOutlet || (outlets.length > 0 ? outlets[0].id : ""),
      serviceId: "",
      staffId: "",
      appointmentDate: selectedDate,
      startTime: "10:00",
      notes: "",
    });
    setShowModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    const targetOutlet = formData.outletId || selectedOutlet;
    if (!targetOutlet) {
      setError("Please select an outlet.");
      return;
    }
    try {
      await createAppointmentAPI({
        ...formData,
        outletId: targetOutlet,
      });
      setShowModal(false);
      loadAppointments();
    } catch (err) {
      setError(err.message || "Failed to create appointment.");
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

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "in_progress": return "bg-amber-50 text-amber-700 border-amber-200";
      case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled": return "bg-rose-50 text-rose-700 border-rose-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-indigo-600" /> Appointment Calendar
          </h1>
          <p className="text-slate-500 text-sm mt-1">Book, track, and manage client salon appointments and stylist availability.</p>
        </div>
        <button
          onClick={openBookingModal}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-indigo-200"
        >
          <Plus className="w-5 h-5" /> Book Appointment
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Outlet</label>
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Appointment Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl text-center border border-slate-100">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No Appointments Scheduled</h3>
          <p className="text-slate-400 text-sm mt-1">There are no bookings for the selected date and outlet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(apt.status)}`}>
                    {apt.status.replace("_", " ")}
                  </span>
                  <div className="flex items-center gap-1 text-slate-700 font-semibold text-sm">
                    <Clock className="w-4 h-4 text-indigo-500" /> {apt.start_time}
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
                      <span className="text-xs text-slate-400">(₹{apt.service.price})</span>
                    </div>
                  )}

                  {apt.staff && (
                    <div className="text-xs text-slate-500 pl-6">
                      Stylist: <span className="font-semibold text-slate-700">{`${apt.staff.first_name} ${apt.staff.last_name}`.trim()}</span>
                    </div>
                  )}

                  {apt.notes && (
                    <div className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      "{apt.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <select
                  value={apt.status}
                  onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white text-slate-700"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </select>

                <button
                  onClick={() => handleDelete(apt.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">New Appointment Booking</h3>
            {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-sm font-medium">{error}</div>}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Outlet *</label>
                <select
                  required
                  value={formData.outletId}
                  onChange={(e) => setFormData({ ...formData, outletId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium text-slate-700"
                >
                  <option value="">Select Outlet</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Type to search CRM client..."
                  value={formData.customerName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, customerName: val, customerId: "" });
                    handleCustomerSearch(val);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />

                {/* Autocomplete Dropdown */}
                {showCustomerDropdown && customerSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-40 overflow-y-auto">
                    {customerSuggestions.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setFormData({ ...formData, customerId: c.id, customerName: c.name, customerPhone: c.phone });
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
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Phone Number *</label>
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Service</label>
                <select
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="">Select Service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.serviceName || s.service_name} (₹{s.price})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Assigned Stylist</label>
                <select
                  value={formData.staffId}
                  onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="">Select Staff</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.appointmentDate}
                    onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Special requests or stylist notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
