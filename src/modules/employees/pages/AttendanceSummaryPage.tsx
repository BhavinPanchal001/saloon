import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PageHeader } from "../../../components/ui/PageHeader";
import { LoadingState } from "../../../components/ui/LoadingState";
import { useToastStore } from "../../../stores/toastStore";
import { fetchAttendanceData } from "../../../services/mockApi";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Sun,
  Download,
  TrendingUp,
  BarChart3,
  X,
} from "lucide-react";

// Mock employee pool for demo purposes
const MOCK_EMPLOYEES = [
  { id: "1", name: "Naina Shah", role: "Senior Stylist" },
  { id: "2", name: "Rohan Iyer", role: "Color Specialist" },
  { id: "3", name: "Priya Nair", role: "Nail Artist" },
  { id: "4", name: "Aarav Singh", role: "Hair Stylist" },
  { id: "5", name: "Deepa Menon", role: "Makeup Artist" },
  { id: "6", name: "Kiran Patel", role: "Hair Stylist" },
  { id: "7", name: "Sunita Rao", role: "Spa Therapist" },
  { id: "8", name: "Amit Sharma", role: "Barber" },
  { id: "9", name: "Lakshmi Devi", role: "Esthetician" },
  { id: "10", name: "Rahul Verma", role: "Hair Stylist" },
  { id: "11", name: "Meera Joshi", role: "Color Specialist" },
  { id: "12", name: "Vikas Gupta", role: "Senior Stylist" },
];

// Seeded shuffle so employees stay consistent per date
const seededShuffle = <T,>(arr: T[], seed: number): T[] => {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Generate mock monthly data
const generateMonthlyData = (year: number, month: number) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data: Record<string, any> = {};
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isWeekend = [0, 6].includes(new Date(year, month, day).getDay());
    const seed = year * 10000 + (month + 1) * 100 + day;
    const shuffled = seededShuffle(MOCK_EMPLOYEES, seed);

    const presentCount = Math.floor(Math.abs(Math.sin(seed) * 1000) % 5) + 8; // 8-12
    const remainingAfterPresent = shuffled.slice(presentCount);
    const absentCount = Math.floor(Math.abs(Math.cos(seed) * 100) % 2);
    const halfDayCount = Math.floor(Math.abs(Math.sin(seed + 1) * 100) % 2);
    const paidLeaveCount = Math.floor(Math.abs(Math.cos(seed + 1) * 100) % 2);

    const presentEmployees = shuffled.slice(0, presentCount);
    const absentEmployees = remainingAfterPresent.slice(0, absentCount);
    const halfDayEmployees = remainingAfterPresent.slice(absentCount, absentCount + halfDayCount);
    const paidLeaveEmployees = remainingAfterPresent.slice(absentCount + halfDayCount, absentCount + halfDayCount + paidLeaveCount);

    data[dateStr] = {
      present: presentCount,
      absent: absentCount,
      halfDay: halfDayCount,
      paidLeave: paidLeaveCount,
      presentEmployees,
      absentEmployees,
      halfDayEmployees,
      paidLeaveEmployees,
      isWeekend,
      isHoliday: false,
    };
  }
  
  return data;
};

const AttendanceSummaryPage = () => {
  const navigate = useNavigate();
  const toast = useToastStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<Record<string, any>>({});
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [employeeDialog, setEmployeeDialog] = useState<{
    date: string;
    type: 'present' | 'absent' | 'halfDay' | 'paidLeave';
    employees: { id: string; name: string; role: string }[];
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    loadData();
  }, [year, month]);

  const loadData = async () => {
    setLoading(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    setMonthlyData(generateMonthlyData(year, month));
    setLoading(false);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleExport = () => {
    toast.success(`Attendance report for ${monthName} exported`);
  };

  // Calculate summary stats
  const stats = Object.values(monthlyData).reduce(
    (acc, day) => ({
      totalDays: acc.totalDays + 1,
      workingDays: acc.workingDays + (day.isWeekend || day.isHoliday ? 0 : 1),
      totalPresent: acc.totalPresent + day.present,
      totalAbsent: acc.totalAbsent + day.absent,
      totalHalfDay: acc.totalHalfDay + day.halfDay,
      totalPaidLeave: acc.totalPaidLeave + day.paidLeave,
    }),
    { totalDays: 0, workingDays: 0, totalPresent: 0, totalAbsent: 0, totalHalfDay: 0, totalPaidLeave: 0 }
  );

  const attendanceRate = stats.workingDays > 0 
    ? Math.round((stats.totalPresent / (stats.workingDays * 12)) * 100) 
    : 0;

  // Generate calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  
  // Add empty cells for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getStatusColor = (dayData: any) => {
    if (!dayData) return 'bg-slate-100';
    if (dayData.isWeekend) return 'bg-slate-50';
    const presentRate = dayData.present / 12;
    if (presentRate >= 0.9) return 'bg-emerald-50';
    if (presentRate >= 0.75) return 'bg-amber-50';
    return 'bg-rose-50';
  };

  const openEmployeeDialog = (
    dateStr: string,
    type: 'present' | 'absent' | 'halfDay' | 'paidLeave',
    data: any
  ) => {
    const keyMap = {
      present: 'presentEmployees',
      absent: 'absentEmployees',
      halfDay: 'halfDayEmployees',
      paidLeave: 'paidLeaveEmployees',
    };
    const employees = data[keyMap[type]] || [];
    if (employees.length === 0) return;
    setEmployeeDialog({ date: dateStr, type, employees });
  };

  const dialogLabels = {
    present: { label: 'Present', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    absent: { label: 'Absent', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500' },
    halfDay: { label: 'Half Day', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
    paidLeave: { label: 'Paid Leave', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Attendance Summary" />
        <LoadingState message="Loading monthly data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/attendance"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-navy-900">Monthly Summary</h1>
            <p className="text-sm text-slate-500">Attendance overview and calendar view</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="btn-premium-outline flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="glass-card flex items-center justify-between px-6 py-4">
        <button
          onClick={goToPreviousMonth}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-navy-900">{monthName}</h2>
          <p className="text-sm text-slate-500">Monthly Attendance Overview</p>
        </div>
        <button
          onClick={goToNextMonth}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-3.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Working Days</p>
              <p className="mt-1.5 text-2xl font-black text-navy-900">{stats.workingDays}</p>
              <p className="text-xs text-slate-500">of {stats.totalDays} days</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-3.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Avg Attendance</p>
              <p className="mt-1.5 text-2xl font-black text-emerald-600">{attendanceRate}%</p>
              <p className="text-xs text-slate-500">Present rate</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-3.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Present</p>
              <p className="mt-1.5 text-2xl font-black text-navy-900">{stats.totalPresent}</p>
              <p className="text-xs text-slate-500">Check-ins</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-3.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Absences</p>
              <p className="mt-1.5 text-2xl font-black text-rose-600">{stats.totalAbsent + stats.totalHalfDay}</p>
              <p className="text-xs text-slate-500">Absent + Half-day</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-4">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              viewMode === 'calendar'
                ? 'bg-navy-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-navy-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Stats
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="glass-card p-6">
          <div className="mb-4 grid grid-cols-7 gap-2 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-xs font-semibold text-slate-500">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="h-24" />;
              
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayData = monthlyData[dateStr];
              const isWeekend = dayData?.isWeekend;
              
              return (
                <div
                  key={day}
                  className={`h-24 rounded-xl border p-2 transition-all ${
                    isWeekend 
                      ? 'border-slate-100 bg-slate-50/50' 
                      : `border-navy-50 ${getStatusColor(dayData)} hover:shadow-md`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${isWeekend ? 'text-slate-400' : 'text-navy-900'}`}>
                      {day}
                    </span>
                    {isWeekend && <Sun className="h-3 w-3 text-slate-400" />}
                  </div>
                  {!isWeekend && dayData && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1 text-xs">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        <span className="text-navy-700">{dayData.present}</span>
                      </div>
                      {dayData.absent > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <XCircle className="h-3 w-3 text-rose-500" />
                          <span className="text-navy-700">{dayData.absent}</span>
                        </div>
                      )}
                      {(dayData.halfDay > 0 || dayData.paidLeave > 0) && (
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3 text-amber-500" />
                          <span className="text-navy-700">{dayData.halfDay + dayData.paidLeave}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-slate-600">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-emerald-50 border border-emerald-200"></div>
              <span className="text-xs text-slate-600">High (&gt;90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-amber-50 border border-amber-200"></div>
              <span className="text-xs text-slate-600">Medium (75-90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-rose-50 border border-rose-200"></div>
              <span className="text-xs text-slate-600">Low (&lt;75%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-slate-50 border border-slate-200"></div>
              <span className="text-xs text-slate-600">Weekend/Holiday</span>
            </div>
          </div>
        </div>
      )}

      {/* List/Stats View */}
      {viewMode === 'list' && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-navy-900 mb-4">Daily Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Day</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Present</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Absent</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Half Day</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Paid Leave</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(monthlyData)
                  .filter(([_, data]) => !data.isWeekend)
                  .map(([dateStr, data]) => {
                    const date = new Date(dateStr);
                    const rate = Math.round((data.present / 12) * 100);
                    return (
                      <tr key={dateStr} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm font-medium text-navy-900">
                          {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">
                          {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openEmployeeDialog(dateStr, 'present', data)}
                            className="text-sm font-medium text-emerald-600 hover:underline cursor-pointer"
                          >
                            {data.present}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openEmployeeDialog(dateStr, 'absent', data)}
                            disabled={data.absent === 0}
                            className={`text-sm text-rose-600 ${data.absent > 0 ? 'hover:underline cursor-pointer' : 'cursor-default opacity-60'}`}
                          >
                            {data.absent}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openEmployeeDialog(dateStr, 'halfDay', data)}
                            disabled={data.halfDay === 0}
                            className={`text-sm text-amber-600 ${data.halfDay > 0 ? 'hover:underline cursor-pointer' : 'cursor-default opacity-60'}`}
                          >
                            {data.halfDay}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openEmployeeDialog(dateStr, 'paidLeave', data)}
                            disabled={data.paidLeave === 0}
                            className={`text-sm text-blue-600 ${data.paidLeave > 0 ? 'hover:underline cursor-pointer' : 'cursor-default opacity-60'}`}
                          >
                            {data.paidLeave}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            rate >= 90 ? 'bg-emerald-100 text-emerald-700' :
                            rate >= 75 ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Detail Dialog */}
      {employeeDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setEmployeeDialog(null)}
        >
          <div
            className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className={`px-6 py-4 ${dialogLabels[employeeDialog.type].bg} border-b ${dialogLabels[employeeDialog.type].border}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
                    {new Date(employeeDialog.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <h3 className={`text-lg font-bold ${dialogLabels[employeeDialog.type].color}`}>
                    {dialogLabels[employeeDialog.type].label} Employees
                  </h3>
                </div>
                <button
                  onClick={() => setEmployeeDialog(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-slate-500 hover:bg-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-white/70 ${dialogLabels[employeeDialog.type].color}`}>
                <span className={`h-2 w-2 rounded-full ${dialogLabels[employeeDialog.type].dot}`} />
                {employeeDialog.employees.length} employee{employeeDialog.employees.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Employee List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {employeeDialog.employees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${dialogLabels[employeeDialog.type].dot}`}>
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{emp.name}</p>
                    <p className="text-xs text-slate-500">{emp.role}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Dialog Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setEmployeeDialog(null)}
                className="btn-premium-outline text-sm px-4 py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceSummaryPage;
