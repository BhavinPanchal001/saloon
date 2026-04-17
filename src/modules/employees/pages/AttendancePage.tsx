import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  MoreHorizontal, 
  UserPlus, 
  X
} from "lucide-react";
import { useAuthStore } from "../../../stores/authStore";
import { fetchAttendanceData, markAttendance } from "../../../services/mockApi";

export default function AttendancePage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const formatDateLabel = (d) => {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  };

  const formatDateKey = (d) => {
    // Use local date for the key to avoid UTC shifts
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const data = await fetchAttendanceData({
        date: formatDateKey(date),
        outletId: user?.role === "admin" ? undefined : user?.outlet_id,
      });
      setAttendance(data);
    } catch (error) {
      console.error("Failed to load attendance", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [date, user]);

  const handleMark = async (staffId, status) => {
    try {
      await markAttendance({
        staffId,
        date: formatDateKey(date),
        status,
      });
      setOpenMenuId(null);
      await loadAttendance();
    } catch (error) {
      console.error("Failed to mark attendance", error);
    }
  };

  const stats = attendance.reduce((acc, member) => {
    if (member.attendanceStatus === 'present') acc.present++;
    else if (member.attendanceStatus === 'absent') acc.absent++;
    else if (member.attendanceStatus === 'half_day') acc.halfDay++;
    else if (member.attendanceStatus === 'paid_leave') acc.paidLeave++;
    return acc;
  }, { present: 0, absent: 0, halfDay: 0, paidLeave: 0 });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-navy-900">Staff Attendance</h1>
          <button 
            onClick={() => navigate(-1)}
            className="rounded-full p-2 transition-colors hover:bg-slate-100"
          >
            <X className="h-6 w-6 text-navy-500" />
          </button>
        </div>

        {/* Date Selector */}
        <div className="glass-card flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-navy-500" />
            <span className="font-semibold text-navy-900">{formatDateLabel(date)}</span>
          </div>
          <button className="text-sm font-bold uppercase tracking-wide text-navy-600 transition-colors hover:text-navy-800">
            Change
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="glass-card flex flex-col gap-1 p-4 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-navy-400">
              Present (P)
            </span>
            <span className="text-2xl font-bold text-navy-900">{stats.present}</span>
          </div>
          <div className="glass-card flex flex-col gap-1 p-4 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-navy-400">
              Absent (A)
            </span>
            <span className="text-2xl font-bold text-navy-900">{stats.absent}</span>
          </div>
          <div className="glass-card flex flex-col gap-1 p-4 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-navy-400">
              Half Day (HD)
            </span>
            <span className="text-2xl font-bold text-navy-900">{stats.halfDay}</span>
          </div>
          <div className="glass-card flex flex-col gap-1 p-4 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-navy-400">
              Paid Leaves (PL)
            </span>
            <span className="text-2xl font-bold text-navy-900">{stats.paidLeave}</span>
          </div>
        </div>

        {/* List Header */}
        <div className="mt-4 flex items-center justify-between px-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-navy-400">
            Staff Name
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-navy-400">
            Attendance Status
          </span>
        </div>

        {/* Staff List */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-navy-400">Loading attendance data...</div>
          ) : (
            attendance.map((member) => (
              <div
                key={member.id}
                style={{ zIndex: openMenuId === member.id ? 50 : 1 }}
                className={`glass-card relative flex items-center justify-between p-5 transition-transform hover:scale-[1.01]`}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-bold text-navy-900">{member.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        member.attendanceStatus === "not_marked"
                          ? "text-navy-300"
                          : "text-emerald-600"
                      }`}
                    >
                      {member.attendanceStatus === "not_marked"
                        ? "Not Marked"
                        : member.attendanceStatus.replace("_", " ")}
                    </span>
                    {member.assignedOutletName && (
                      <span className="text-[10px] text-navy-300">• {member.assignedOutletName}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleMark(member.id, "present")}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl font-black transition-all active:scale-95 ${
                      member.attendanceStatus === "present"
                        ? "bg-navy-900 text-white shadow-xl shadow-navy-900/20"
                        : "border border-navy-100 bg-white/50 text-navy-400 hover:border-navy-200 hover:bg-white"
                    }`}
                  >
                    P
                  </button>
                  <button
                    onClick={() => handleMark(member.id, "absent")}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl font-black transition-all active:scale-95 ${
                      member.attendanceStatus === "absent"
                        ? "bg-navy-900 text-white shadow-xl shadow-navy-900/20"
                        : "border border-navy-100 bg-white/50 text-navy-400 hover:border-navy-200 hover:bg-white"
                    }`}
                  >
                    A
                  </button>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === member.id ? null : member.id);
                      }}
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-navy-100 transition-all active:scale-95 ${
                        openMenuId === member.id ? "bg-navy-900 text-white" : "bg-white/50 text-navy-400 hover:border-navy-200 hover:bg-white"
                      }`}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                    {openMenuId === member.id && (
                      <div className="absolute right-0 top-full z-[100] mt-2 w-48 overflow-hidden rounded-2xl border border-white/50 bg-white/90 p-2 shadow-2xl backdrop-blur-xl">
                        <button 
                          onClick={() => handleMark(member.id, "half_day")}
                          className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-navy-700 hover:bg-navy-50"
                        >
                          Half Day (HD)
                        </button>
                        <button 
                          onClick={() => handleMark(member.id, "paid_leave")}
                          className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-navy-700 hover:bg-navy-50"
                        >
                          Paid Leave (PL)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Staff Button */}
        <div className="mt-8 flex justify-center pb-12">
          <button 
            onClick={() => navigate("/staff/add")}
            className="btn-premium-primary gap-3 shadow-2xl transition-transform hover:scale-105 active:scale-95"
          >
            <UserPlus className="h-5 w-5" />
            <span>Add Staff</span>
          </button>
        </div>
      </div>
    </div>
  );
}
