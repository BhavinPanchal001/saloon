import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  MoreHorizontal,
  UserPlus,
  Users,
  UserCheck,
  UserX,
  Clock,
  LogIn,
  LogOut,
  Coffee,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "../../../stores/authStore";
import {
  fetchAttendanceData,
  markAttendance,
  checkInStaff,
  checkOutStaff,
  breakInStaff,
  breakOutStaff,
} from "../../../services/mockApi";
import { PageHeader } from "../../../components/ui/PageHeader";
import { CheckInOutModal } from "../components/CheckInOutModal";
import { useToastStore } from "../../../stores/toastStore";

interface BreakRecord {
  in: string;
  out: string | null;
}

interface AttendanceMember {
  id: string;
  name: string;
  attendanceStatus: string;
  assignedOutletName?: string;
  checkIn: { timestamp: string; photo: string } | null;
  checkOut: { timestamp: string; photo: string } | null;
  breaks: BreakRecord[];
}

interface StatCard {
  label: string;
  value: number;
  Icon: LucideIcon;
  color: string;
  iconBg: string;
}

export default function AttendancePage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const toast = useToastStore();
  const [date, setDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"check-in" | "check-out" | "break-in" | "break-out">("check-in");
  const [selectedStaff, setSelectedStaff] = useState<AttendanceMember | null>(null);
  const [isToday, setIsToday] = useState(true);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const formatDateLabel = (d: Date) => {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  };

  const formatDateKey = (d: Date) => {
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
        outletId: (user?.role === "admin" || user?.role === "super_admin") ? undefined : user?.outlet_id,
      });
      setAttendance(data);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setIsToday(formatDateKey(date) === formatDateKey(today));
    } catch (error) {
      console.error("Failed to load attendance", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [date, user]);

  const handleMark = async (staffId: string, status: string) => {
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

  const openCheckInModal = (member: AttendanceMember) => {
    setSelectedStaff(member);
    setModalAction("check-in");
    setModalOpen(true);
  };

  const openCheckOutModal = (member: AttendanceMember) => {
    setSelectedStaff(member);
    setModalAction("check-out");
    setModalOpen(true);
  };

  const openBreakInModal = (member: AttendanceMember) => {
    setSelectedStaff(member);
    setModalAction("break-in");
    setModalOpen(true);
  };

  const openBreakOutModal = (member: AttendanceMember) => {
    setSelectedStaff(member);
    setModalAction("break-out");
    setModalOpen(true);
  };

  const handleCheckInSubmit = async (photoData: string) => {
    if (!selectedStaff) return;
    try {
      await checkInStaff({
        staffId: selectedStaff.id,
        date: formatDateKey(date),
        photoData,
      });
      toast.success(`${selectedStaff.name} checked in successfully`);
      setModalOpen(false);
      await loadAttendance();
    } catch (error) {
      toast.error("Failed to check in");
      console.error("Failed to check in", error);
    }
  };

  const handleCheckOutSubmit = async (photoData: string) => {
    if (!selectedStaff) return;
    try {
      await checkOutStaff({
        staffId: selectedStaff.id,
        date: formatDateKey(date),
        photoData,
      });
      toast.success(`${selectedStaff.name} checked out successfully`);
      setModalOpen(false);
      await loadAttendance();
    } catch (error) {
      toast.error("Failed to check out");
      console.error("Failed to check out", error);
    }
  };

  const handleBreakInSubmit = async (photoData: string) => {
    if (!selectedStaff) return;
    try {
      await breakInStaff({
        staffId: selectedStaff.id,
        date: formatDateKey(date),
        photoData,
      });
      toast.success(`${selectedStaff.name} break started`);
      setModalOpen(false);
      await loadAttendance();
    } catch (error) {
      toast.error("Failed to start break");
      console.error("Failed to break in", error);
    }
  };

  const handleBreakOutSubmit = async (photoData: string) => {
    if (!selectedStaff) return;
    try {
      await breakOutStaff({
        staffId: selectedStaff.id,
        date: formatDateKey(date),
        photoData,
      });
      toast.success(`${selectedStaff.name} break ended`);
      setModalOpen(false);
      await loadAttendance();
    } catch (error) {
      toast.error("Failed to end break");
      console.error("Failed to break out", error);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const isOnBreak = (member: AttendanceMember) => {
    const lastBreak = member.breaks[member.breaks.length - 1];
    return lastBreak && !lastBreak.out;
  };

  const stats = attendance.reduce((acc, member) => {
    if (member.attendanceStatus === 'present') acc.present++;
    else if (member.attendanceStatus === 'absent') acc.absent++;
    else if (member.attendanceStatus === 'half_day') acc.halfDay++;
    else if (member.attendanceStatus === 'paid_leave') acc.paidLeave++;
    return acc;
  }, { present: 0, absent: 0, halfDay: 0, paidLeave: 0 });

  return (
    <div>
      <PageHeader
        eyebrow="Employees"
        title="Attendance Tracking"
        description="Mark and monitor daily attendance for all staff members."
        action={
          <div className="flex items-center gap-3">
            {/* Date picker with prev/next navigation */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(date);
                  prev.setDate(prev.getDate() - 1);
                  setDate(prev);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-navy-900 transition-colors"
                title="Previous day"
              >
                ‹
              </button>
              <label className="relative cursor-pointer">
                <input
                  type="date"
                  value={formatDateKey(date)}
                  max={formatDateKey(new Date())}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split("-").map(Number);
                      setDate(new Date(y, m - 1, d));
                    }
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <span className="btn-premium-outline flex items-center gap-2 whitespace-nowrap">
                  <Calendar className="h-4 w-4" />
                  {formatDateLabel(date)}
                </span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = new Date(date);
                  next.setDate(next.getDate() + 1);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (next <= today) setDate(next);
                }}
                disabled={formatDateKey(date) === formatDateKey(new Date())}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-navy-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next day"
              >
                ›
              </button>
            </div>
            <button
              onClick={() => navigate("/staff/add")}
              className="btn-premium-primary flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Staff
            </button>
          </div>
        }
      />

      {/* Compact stat row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          { label: "Present", value: stats.present, Icon: UserCheck, color: "text-emerald-600", iconBg: "bg-emerald-50 text-emerald-600" },
          { label: "Absent", value: stats.absent, Icon: UserX, color: "text-rose-600", iconBg: "bg-rose-50 text-rose-600" },
          { label: "Half Day", value: stats.halfDay, Icon: Clock, color: "text-amber-600", iconBg: "bg-amber-50 text-amber-600" },
          { label: "Paid Leave", value: stats.paidLeave, Icon: Users, color: "text-indigo-600", iconBg: "bg-indigo-50 text-indigo-600" },
        ] as StatCard[]).map(({ label, value, Icon, color, iconBg }) => (
          <div key={label} className="glass-card !p-4 flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
              <p className={`text-lg font-black leading-tight ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Staff list */}
      <div className="mt-6 glass-card !p-0 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-navy-50/50 bg-navy-900/[0.03]">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-400">Staff Name</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-400">Actions</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-navy-400">Loading attendance data...</div>
        ) : attendance.length === 0 ? (
          <div className="py-12 text-center text-sm text-navy-400">No staff found for this date.</div>
        ) : (
          <div className="divide-y divide-navy-50/50">
            {attendance.map((member) => (
              <div
                key={member.id}
                style={{ zIndex: openMenuId === member.id ? 50 : 1 }}
                className="relative flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-white/50"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-navy-900">{member.name}</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wide ${
                        member.attendanceStatus === "not_marked"
                          ? "text-slate-400"
                          : member.attendanceStatus === "present"
                          ? "text-emerald-600"
                          : member.attendanceStatus === "absent"
                          ? "text-rose-500"
                          : member.attendanceStatus === "half_day"
                          ? "text-amber-600"
                          : "text-indigo-600"
                      }`}
                    >
                      {member.attendanceStatus === "not_marked"
                        ? "Not Marked"
                        : member.attendanceStatus.replace("_", " ")}
                    </span>
                    {member.assignedOutletName && (
                      <span className="text-[10px] text-slate-400">· {member.assignedOutletName}</span>
                    )}
                    {/* Check-in/Check-out times */}
                    {member.checkIn && (
                      <span className="text-[10px] text-emerald-600 font-medium">
                        In: {formatTime(member.checkIn.timestamp)}
                      </span>
                    )}
                    {member.checkOut && (
                      <span className="text-[10px] text-orange-600 font-medium">
                        Out: {formatTime(member.checkOut.timestamp)}
                      </span>
                    )}
                    {/* Break records */}
                    {member.breaks.map((breakRecord, index) => (
                      <span key={index} className="text-[10px] text-amber-600 font-medium">
                        Break {index + 1}: {formatTime(breakRecord.in)} - {breakRecord.out ? formatTime(breakRecord.out) : "ongoing"}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Check In Button */}
                  {isToday && !member.checkIn && (
                    <button
                      onClick={() => openCheckInModal(member)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-600/20"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Check In
                    </button>
                  )}

                  {/* Check Out Button */}
                  {isToday && member.checkIn && !member.checkOut && (
                    <button
                      onClick={() => openCheckOutModal(member)}
                      className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-orange-700 active:scale-95 shadow-md shadow-orange-600/20"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Check Out
                    </button>
                  )}

                  {/* Break In/Out Buttons */}
                  {isToday && member.checkIn && !member.checkOut && (
                    isOnBreak(member) ? (
                      <button
                        onClick={() => openBreakOutModal(member)}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700 transition-all hover:bg-amber-200 active:scale-95"
                      >
                        <Coffee className="h-3.5 w-3.5" />
                        End Break
                      </button>
                    ) : (
                      <button
                        onClick={() => openBreakInModal(member)}
                        className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-700 transition-all hover:bg-amber-50 active:scale-95"
                      >
                        <Coffee className="h-3.5 w-3.5" />
                        Break
                      </button>
                    )
                  )}

                  {/* Half Day / Paid Leave - only for past dates without check-in */}
                  {!isToday && !member.checkIn && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === member.id ? null : member.id);
                        }}
                        className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all active:scale-95 ${
                          openMenuId === member.id
                            ? "bg-navy-900 text-white border-navy-900"
                            : "border-navy-100 bg-white/60 text-navy-400 hover:bg-navy-50 hover:border-navy-200"
                        }`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openMenuId === member.id && (
                        <div className="absolute right-0 top-full z-[100] mt-1.5 w-44 overflow-hidden rounded-2xl border border-white/50 bg-white/90 p-1.5 shadow-2xl backdrop-blur-xl">
                          <button
                            onClick={() => handleMark(member.id, "half_day")}
                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-navy-700 hover:bg-amber-50 hover:text-amber-700"
                          >
                            Half Day (HD)
                          </button>
                          <button
                            onClick={() => handleMark(member.id, "paid_leave")}
                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-navy-700 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            Paid Leave (PL)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Check In/Out/Break Modal */}
      <CheckInOutModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={
          modalAction === "check-in"
            ? handleCheckInSubmit
            : modalAction === "check-out"
            ? handleCheckOutSubmit
            : modalAction === "break-in"
            ? handleBreakInSubmit
            : handleBreakOutSubmit
        }
        staffName={selectedStaff?.name || ""}
        action={modalAction}
      />
    </div>
  );
}
