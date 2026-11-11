import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PageHeader } from "../../../components/ui/PageHeader";
import { LoadingState } from "../../../components/ui/LoadingState";
import { useToastStore } from "../../../stores/toastStore";
import { useAuthStore } from "../../../stores/authStore";
import {
  fetchStaff,
  fetchContracts,
  fetchAttendanceSummary,
  fetchAttendanceData,
  markAttendance,
} from "../../../services/api";
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
  Plus,
  ShieldCheck,
  FileText,
  AlertCircle,
  Info,
  CalendarRange,
  Check,
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
const generateMonthlyData = (year: number, month: number, activeStaff: any[] = MOCK_EMPLOYEES) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data: Record<string, any> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isWeekend = [0, 6].includes(new Date(year, month, day).getDay());

    if (!activeStaff || activeStaff.length === 0) {
      data[dateStr] = {
        present: 0,
        absent: 0,
        halfDay: 0,
        paidLeave: 0,
        presentEmployees: [],
        absentEmployees: [],
        halfDayEmployees: [],
        paidLeaveEmployees: [],
        isWeekend,
        isHoliday: false,
      };
      continue;
    }

    const seed = year * 10000 + (month + 1) * 100 + day;
    const shuffled = seededShuffle(activeStaff, seed);

    const presentCount = Math.min(activeStaff.length, Math.floor(Math.abs(Math.sin(seed) * 1000) % 5) + 8);
    const remainingAfterPresent = shuffled.slice(presentCount);
    const absentCount = Math.min(remainingAfterPresent.length, Math.floor(Math.abs(Math.cos(seed) * 100) % 2));
    const remainingAfterAbsent = remainingAfterPresent.slice(absentCount);
    const halfDayCount = Math.min(remainingAfterAbsent.length, Math.floor(Math.abs(Math.sin(seed + 1) * 100) % 2));
    const remainingAfterHalf = remainingAfterAbsent.slice(halfDayCount);
    const paidLeaveCount = Math.min(remainingAfterHalf.length, Math.floor(Math.abs(Math.cos(seed + 1) * 100) % 2));

    const presentEmployees = shuffled.slice(0, presentCount);
    const absentEmployees = remainingAfterPresent.slice(0, absentCount);
    const halfDayEmployees = remainingAfterAbsent.slice(0, halfDayCount);
    const paidLeaveEmployees = remainingAfterHalf.slice(0, paidLeaveCount);

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

const formatTimeStr = (isoString: string | null | undefined) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const getDurationStr = (start: string | null | undefined, end: string | null | undefined) => {
  if (!start) return '0m';
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : new Date().getTime();
  const diffMs = endTime - startTime;
  if (diffMs <= 0) return '0m';

  const diffMin = Math.round(diffMs / 60000);
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
};

const getDurationMin = (start: string | null | undefined, end: string | null | undefined) => {
  if (!start) return 0;
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : new Date().getTime();
  const diffMs = endTime - startTime;
  return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
};

const getRealPunchDetails = (status: 'present' | 'halfDay' | 'absent' | 'paidLeave', record: any) => {
  if (status === 'absent' || !record) {
    return {
      status,
      bars: [],
      punches: 0,
      breaks: "00:00",
      breaksCount: 0,
      worked: "00:00"
    };
  }

  if (status === 'paidLeave') {
    return {
      status,
      bars: [
        { label: "Paid Leave - APPROVED", type: "leave", color: "bg-blue-600 text-white font-semibold text-center" }
      ],
      punches: 0,
      breaks: "00:00",
      breaksCount: 0,
      worked: "00:00"
    };
  }

  const bars: any[] = [];
  let punchCount = 0;

  if (record.checkIn) {
    punchCount++;
  }
  if (record.checkOut) {
    punchCount++;
  }

  const breaksList = record.breaks || [];
  breaksList.forEach((b: any) => {
    punchCount += (b.in ? 1 : 0) + (b.out ? 1 : 0);
  });

  if (record.checkIn) {
    // Sort breaks sequentially
    const sortedBreaks = [...breaksList].sort((a, b) => {
      return new Date(a.in).getTime() - new Date(b.in).getTime();
    });

    let currentStart = record.checkIn.timestamp;

    sortedBreaks.forEach((b: any) => {
      if (b.in) {
        const startMs = new Date(currentStart).getTime();
        const breakInMs = new Date(b.in).getTime();

        if (breakInMs > startMs) {
          // Work period prior to break
          const duration = getDurationStr(currentStart, b.in);
          const tIn = formatTimeStr(currentStart);
          const tOut = formatTimeStr(b.in);
          bars.push({
            label: `${tIn} - ${tOut} (${duration})`,
            type: "work",
            color: "bg-[#2563eb] text-white text-center font-medium rounded-md px-1 py-0.5"
          });
        }

        // Break period
        const duration = getDurationStr(b.in, b.out);
        const tIn = formatTimeStr(b.in);
        const tOut = b.out ? formatTimeStr(b.out) : 'Active';
        bars.push({
          label: `${tIn} - ${tOut} (${duration})`,
          type: "break",
          color: "bg-[#ef4444] text-white text-center font-medium rounded-md px-1 py-0.5"
        });

        currentStart = b.out;
      }
    });

    if (currentStart) {
      const startMs = new Date(currentStart).getTime();
      const endMs = record.checkOut ? new Date(record.checkOut.timestamp).getTime() : null;

      if (!endMs || endMs > startMs) {
        // Final work period
        const duration = getDurationStr(currentStart, record.checkOut?.timestamp);
        const tIn = formatTimeStr(currentStart);
        const tOut = record.checkOut ? formatTimeStr(record.checkOut.timestamp) : 'Active';
        bars.push({
          label: `${tIn} - ${tOut} (${duration})`,
          type: "work",
          color: "bg-[#2563eb] text-white text-center font-medium rounded-md px-1 py-0.5"
        });
      }
    }
  }

  let totalBreakMin = 0;
  breaksList.forEach((b: any) => {
    totalBreakMin += getDurationMin(b.in, b.out);
  });

  const totalMin = getDurationMin(record.checkIn?.timestamp, record.checkOut?.timestamp);
  const netWorkedMin = Math.max(0, totalMin - totalBreakMin);

  const wHrs = Math.floor(netWorkedMin / 60);
  const wMins = netWorkedMin % 60;

  const bHrs = Math.floor(totalBreakMin / 60);
  const bMins = totalBreakMin % 60;

  return {
    status,
    bars,
    punches: punchCount,
    breaks: `${String(bHrs).padStart(2, '0')}:${String(bMins).padStart(2, '0')}`,
    breaksCount: breaksList.length,
    worked: `${String(wHrs).padStart(2, '0')}:${String(wMins).padStart(2, '0')}`
  };
};

const AttendanceSummaryPage = () => {
  const navigate = useNavigate();
  const toast = useToastStore();
  const user = useAuthStore((state) => state.user);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'employee' | 'leaves'>('calendar');
  const [contractsList, setContractsList] = useState<any[]>([]);

  // Apply Leave Modal State
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [applyLeaveStaffId, setApplyLeaveStaffId] = useState<string>('');
  const [applyLeaveTypeId, setApplyLeaveTypeId] = useState<string>('');
  const [applyLeaveMode, setApplyLeaveMode] = useState<'single' | 'range'>('single');
  const [applyLeaveStartDate, setApplyLeaveStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [applyLeaveEndDate, setApplyLeaveEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [applyLeaveDuration, setApplyLeaveDuration] = useState<'full' | 'half'>('full');
  const [applyLeaveReason, setApplyLeaveReason] = useState<string>('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveValidationError, setLeaveValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawMonthlyData, setMonthlyData] = useState<Record<string, any>>({});
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [staffCount, setStaffCount] = useState(12);
  const [activeStaffList, setActiveStaffList] = useState<any[]>([]);
  const [employeeDialog, setEmployeeDialog] = useState<{
    date: string;
    type: 'present' | 'absent' | 'halfDay' | 'paidLeave';
    employees: { id: string; name: string; role: string }[];
  } | null>(null);

  // States for punches details modal with photos
  const [selectedPunchDetail, setSelectedPunchDetail] = useState<{ date: string; staffId: string; staffName: string; } | null>(null);
  const [punchRecord, setPunchRecord] = useState<any>(null);
  const [loadingPunch, setLoadingPunch] = useState(false);

  const handlePunchCellClick = async (dateStr: string) => {
    if (!selectedStaff) return;
    const selectedStaffObj = activeStaffList.find(s => s.id.toString() === selectedStaff);
    const staffName = selectedStaffObj ? (selectedStaffObj.name || `${selectedStaffObj.firstName} ${selectedStaffObj.lastName}`) : 'Staff';

    setSelectedPunchDetail({
      date: dateStr,
      staffId: selectedStaff,
      staffName
    });
    setLoadingPunch(true);
    setPunchRecord(null);

    try {
      const response = await fetchAttendanceData({ date: dateStr });
      const rec = response.find((r: any) => r.id === selectedStaff.toString());
      setPunchRecord(rec || null);
    } catch (err) {
      console.error("Failed to load punch details:", err);
      toast.error("Failed to load punch details");
    } finally {
      setLoadingPunch(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    loadData();
  }, [year, month]);

  const loadData = async () => {
    setLoading(true);
    try {
      let fetchedStaff: any[] = [];
      let fetchedContracts: any[] = [];
      try {
        const [staffRes, contractsRes] = await Promise.all([
          fetchStaff(),
          fetchContracts().catch(() => [])
        ]);
        fetchedStaff = staffRes || [];
        fetchedContracts = contractsRes || [];
      } catch (err) {
        console.error("Failed to fetch staff list:", err);
      }

      // Filter active employees: Only employees with an active contract
      const activeStaff = fetchedStaff.filter((staff: any) => {
        if (typeof staff.hasActiveContract === 'boolean') {
          return staff.hasActiveContract;
        }
        return fetchedContracts.some(
          (c: any) => String(c.employeeId) === String(staff.id) && String(c.status).toLowerCase() === 'active'
        );
      });

      setStaffCount(activeStaff.length);
      setActiveStaffList(activeStaff);
      setContractsList(fetchedContracts);

      const summaryData = await fetchAttendanceSummary({
        year,
        month: month + 1,
        outletId: (user?.role === "admin" || user?.role === "super_admin") ? undefined : user?.outlet_id,
      });
      setMonthlyData(summaryData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const monthlyData = useMemo(() => Object.fromEntries(
    Object.entries(rawMonthlyData).map(([date, data]) => {
      const holidayEmployees: any[] = [];
      const weeklyOffEmployees: any[] = [...(data.weeklyOffEmployees || [])];
      activeStaffList.forEach(staff => {
        const contract = contractsList
          .filter(c => String(c.employeeId) === String(staff.id) &&
            ['active', 'expired', 'completed'].includes(String(c.status).toLowerCase()) &&
            c.startDate <= date && (!c.endDate || c.endDate >= date))
          .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
        if (!contract) return;
        const holidays = (contract.holidays || []).filter((holiday: any) =>
          holiday.startDate && holiday.startDate <= date && (holiday.endDate || holiday.startDate) >= date);
        if (holidays.length) {
          holidayEmployees.push({
            id: String(staff.id),
            name: staff.name || `${staff.firstName} ${staff.lastName}`,
            holidayNames: holidays.map((holiday: any) => holiday.name || holiday.occasionName).join(', '),
          });
        }
        const weekday = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
        if (contract.weeklyOffPattern?.includes(weekday) &&
          !weeklyOffEmployees.some((employee: any) => String(employee.id) === String(staff.id))) {
          weeklyOffEmployees.push({ id: String(staff.id) });
        }
      });
      const absentEmployees = (data.absentEmployees || []).filter((employee: any) =>
        !holidayEmployees.some(holiday => holiday.id === String(employee.id)));
      return [date, { ...data, absentEmployees, absent: absentEmployees.length,
        holidayEmployees, holiday: holidayEmployees.length, weeklyOffEmployees }];
    })
  ), [rawMonthlyData, activeStaffList, contractsList]);

  const employeeSummary = useMemo(() => {
    if (!activeStaffList || activeStaffList.length === 0) return [];

    const summaryMap = new Map<string, {
      id: string;
      name: string;
      role: string;
      present: number;
      absent: number;
      halfDay: number;
      paidLeave: number;
    }>();

    activeStaffList.forEach(staff => {
      summaryMap.set(staff.id, {
        id: staff.id,
        name: staff.name || `${staff.firstName} ${staff.lastName}`,
        role: staff.role?.name || staff.role || "Staff",
        present: 0,
        absent: 0,
        halfDay: 0,
        paidLeave: 0
      });
    });

    Object.entries(monthlyData).forEach(([dateStr, dayData]) => {

      dayData.presentEmployees?.forEach((emp: any) => {
        const stats = summaryMap.get(emp.id);
        if (stats) stats.present++;
      });

      dayData.absentEmployees?.forEach((emp: any) => {
        const stats = summaryMap.get(emp.id);
        if (stats) stats.absent++;
      });

      dayData.halfDayEmployees?.forEach((emp: any) => {
        const stats = summaryMap.get(emp.id);
        if (stats) stats.halfDay++;
      });

      dayData.paidLeaveEmployees?.forEach((emp: any) => {
        const stats = summaryMap.get(emp.id);
        if (stats) stats.paidLeave++;
      });
    });

    return Array.from(summaryMap.values()).map(stats => {
      const presentWeight = stats.present + (stats.halfDay * 0.5);
      const employeeWorkingDays = Object.values(monthlyData).filter(day =>
        !day.holidayEmployees?.some((employee: any) => String(employee.id) === String(stats.id)) &&
        !day.weeklyOffEmployees?.some((employee: any) => String(employee.id) === String(stats.id))
      ).length;
      const rate = employeeWorkingDays > 0 ? Math.min(100, Math.round((presentWeight / employeeWorkingDays) * 100)) : 0;

      return {
        ...stats,
        rate
      };
    });
  }, [activeStaffList, monthlyData]);

  // Calculate each employee's contract leave entitlements and usage
  const employeeContractLeaveStats = useMemo(() => {
    return activeStaffList.map((staff) => {
      const contract = contractsList.find(
        (c: any) => String(c.employeeId) === String(staff.id) && String(c.status).toLowerCase() === 'active'
      );

      const rawAllocations: any[] = contract?.leaveAllocations || [];
      const allocations = rawAllocations.map((alloc) => ({
        id: alloc.id || alloc.leaveTypeId,
        name: alloc.name || alloc.leaveTypeName || 'Paid Leave',
        count: Number(alloc.count) || 0,
        isPaid: alloc.isPaid !== false,
      }));

      // Count leaves taken in this month for this staff
      let leavesTakenThisMonth = 0;
      Object.values(monthlyData).forEach((day: any) => {
        const isLeave = day.paidLeaveEmployees?.some(
          (e: any) => String(e.id) === String(staff.id)
        );
        if (isLeave) leavesTakenThisMonth++;
      });

      const totalAllocated = allocations.reduce((sum, a) => sum + a.count, 0);
      const totalRemaining = Math.max(0, totalAllocated - leavesTakenThisMonth);

      return {
        staffId: staff.id,
        staffName: staff.name || `${staff.firstName} ${staff.lastName}`,
        role: staff.role?.name || staff.role || 'Staff',
        contractCode: contract?.code || 'N/A',
        contractTitle: contract?.title || 'Active Contract',
        startDate: contract?.startDate || '',
        endDate: contract?.endDate || 'Ongoing',
        weeklyOffs: contract?.weeklyOffPattern || ['Sunday'],
        allocations,
        totalAllocated,
        leavesTakenThisMonth,
        totalRemaining,
        hasContract: Boolean(contract),
      };
    });
  }, [activeStaffList, contractsList, monthlyData]);

  const selectedStaffContract = useMemo(() => {
    if (!applyLeaveStaffId) return null;
    return contractsList.find(
      (c: any) => String(c.employeeId) === String(applyLeaveStaffId) && String(c.status).toLowerCase() === 'active'
    );
  }, [applyLeaveStaffId, contractsList]);

  const openApplyLeaveModal = (staffId?: string) => {
    const initialStaffId = staffId || (activeStaffList.length > 0 ? String(activeStaffList[0].id) : '');
    setApplyLeaveStaffId(initialStaffId);

    const contract = contractsList.find(
      (c: any) => String(c.employeeId) === String(initialStaffId) && String(c.status).toLowerCase() === 'active'
    );
    const firstAlloc = contract?.leaveAllocations?.[0];
    const initialTypeId = firstAlloc ? String(firstAlloc.id || firstAlloc.leaveTypeId) : '';
    setApplyLeaveTypeId(initialTypeId);

    const todayStr = new Date().toISOString().split('T')[0];
    setApplyLeaveStartDate(todayStr);
    setApplyLeaveEndDate(todayStr);
    setApplyLeaveMode('single');
    setApplyLeaveDuration('full');
    setApplyLeaveReason('');
    setLeaveValidationError(null);
    setShowApplyLeaveModal(true);
  };

  const handleStaffSelectChange = (newStaffId: string) => {
    setApplyLeaveStaffId(newStaffId);
    const contract = contractsList.find(
      (c: any) => String(c.employeeId) === String(newStaffId) && String(c.status).toLowerCase() === 'active'
    );
    const firstAlloc = contract?.leaveAllocations?.[0];
    const initialTypeId = firstAlloc ? String(firstAlloc.id || firstAlloc.leaveTypeId) : '';
    setApplyLeaveTypeId(initialTypeId);
    setLeaveValidationError(null);
  };

  const leaveCalculation = useMemo(() => {
    if (!applyLeaveStaffId) {
      return {
        isValid: false,
        workingDates: [],
        skippedWeeklyOffs: [],
        error: 'Please select an employee.',
        netDays: 0,
      };
    }

    if (!selectedStaffContract) {
      return {
        isValid: false,
        workingDates: [],
        skippedWeeklyOffs: [],
        error: 'This employee does not have an active contract. Leaves can only be recorded for staff with active contracts.',
        netDays: 0,
      };
    }

    const effectiveEndDate = applyLeaveMode === 'single' ? applyLeaveStartDate : applyLeaveEndDate;

    if (!applyLeaveStartDate || !effectiveEndDate) {
      return {
        isValid: false,
        workingDates: [],
        skippedWeeklyOffs: [],
        error: 'Please select valid leave date(s).',
        netDays: 0,
      };
    }

    if (applyLeaveMode === 'range' && applyLeaveStartDate > effectiveEndDate) {
      return {
        isValid: false,
        workingDates: [],
        skippedWeeklyOffs: [],
        error: 'End date cannot be earlier than start date.',
        netDays: 0,
      };
    }

    // Contract validity boundaries
    if (selectedStaffContract.startDate && applyLeaveStartDate < selectedStaffContract.startDate) {
      return {
        isValid: false,
        workingDates: [],
        skippedWeeklyOffs: [],
        error: `Leave date cannot precede employee contract start date (${selectedStaffContract.startDate}).`,
        netDays: 0,
      };
    }
    if (selectedStaffContract.endDate && effectiveEndDate > selectedStaffContract.endDate) {
      return {
        isValid: false,
        workingDates: [],
        skippedWeeklyOffs: [],
        error: `Leave date exceeds employee contract expiry date (${selectedStaffContract.endDate}).`,
        netDays: 0,
      };
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklyOffs = selectedStaffContract.weeklyOffPattern || ['Sunday'];

    const start = new Date(applyLeaveStartDate);
    const end = new Date(effectiveEndDate);
    const workingDates: string[] = [];
    const skippedWeeklyOffs: string[] = [];

    const curr = new Date(start);
    while (curr <= end) {
      const dayName = dayNames[curr.getDay()];
      const dateStr = curr.toISOString().split('T')[0];

      if (weeklyOffs.includes(dayName)) {
        skippedWeeklyOffs.push(dateStr);
      } else {
        workingDates.push(dateStr);
      }
      curr.setDate(curr.getDate() + 1);
    }

    if (workingDates.length === 0) {
      return {
        isValid: false,
        workingDates: [],
        skippedWeeklyOffs,
        error: `All selected dates (${skippedWeeklyOffs.join(', ')}) fall on employee contract weekly off (${weeklyOffs.join(', ')}). No working days deducted.`,
        netDays: 0,
      };
    }

    // Duplicate check
    const conflictingDates: string[] = [];
    workingDates.forEach((dateStr) => {
      const dayData = monthlyData[dateStr];
      if (dayData) {
        const isAlreadyOnLeave = dayData.paidLeaveEmployees?.some(
          (e: any) => String(e.id) === String(applyLeaveStaffId)
        );
        const isPresent = dayData.presentEmployees?.some(
          (e: any) => String(e.id) === String(applyLeaveStaffId)
        );
        if (isAlreadyOnLeave || isPresent) {
          conflictingDates.push(dateStr);
        }
      }
    });

    if (conflictingDates.length > 0) {
      return {
        isValid: false,
        workingDates,
        skippedWeeklyOffs,
        error: `Attendance or leave is already recorded on: ${conflictingDates.join(', ')}.`,
        netDays: 0,
      };
    }

    // Quota validation
    const allocations = selectedStaffContract.leaveAllocations || [];
    if (allocations.length === 0) {
      return {
        isValid: false,
        workingDates,
        skippedWeeklyOffs,
        error: 'Employee contract has no leave allocations configured.',
        netDays: 0,
      };
    }

    const selectedAllocation = allocations.find(
      (a: any) => String(a.id || a.leaveTypeId) === String(applyLeaveTypeId)
    );

    const netDays = workingDates.length * (applyLeaveDuration === 'half' ? 0.5 : 1);

    if (selectedAllocation) {
      const allocated = Number(selectedAllocation.count) || 0;
      const staffTakenThisMonth = Object.values(monthlyData).reduce((count, day: any) => {
        const isLeave = day.paidLeaveEmployees?.some(
          (e: any) => String(e.id) === String(applyLeaveStaffId)
        );
        return count + (isLeave ? 1 : 0);
      }, 0);

      const remaining = Math.max(0, allocated - staffTakenThisMonth);

      if (netDays > remaining) {
        return {
          isValid: false,
          workingDates,
          skippedWeeklyOffs,
          error: `Quota exceeded: ${selectedAllocation.name || 'Leave'} has ${remaining} day(s) remaining, but ${netDays} day(s) requested.`,
          netDays,
          selectedAllocation,
          remaining,
        };
      }

      return {
        isValid: true,
        workingDates,
        skippedWeeklyOffs,
        error: null,
        netDays,
        selectedAllocation,
        remaining,
      };
    }

    return {
      isValid: true,
      workingDates,
      skippedWeeklyOffs,
      error: null,
      netDays,
    };
  }, [
    selectedStaffContract,
    applyLeaveStaffId,
    applyLeaveStartDate,
    applyLeaveEndDate,
    applyLeaveMode,
    applyLeaveDuration,
    applyLeaveTypeId,
    monthlyData,
  ]);

  const handleApplyLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveCalculation.isValid) {
      setLeaveValidationError(leaveCalculation.error || 'Please resolve the validation errors before submitting.');
      return;
    }

    setSubmittingLeave(true);
    setLeaveValidationError(null);

    try {
      for (const dateStr of leaveCalculation.workingDates) {
        await markAttendance({
          staffId: applyLeaveStaffId,
          date: dateStr,
          status: 'paid_leave',
        });
      }

      const staffObj = activeStaffList.find((s) => String(s.id) === String(applyLeaveStaffId));
      const staffName = staffObj ? (staffObj.name || `${staffObj.firstName} ${staffObj.lastName}`) : 'Employee';

      toast.success(
        `Leave applied successfully for ${staffName} (${leaveCalculation.netDays} day${leaveCalculation.netDays !== 1 ? 's' : ''
        })`
      );
      setShowApplyLeaveModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Failed to submit leave:', err);
      setLeaveValidationError(err?.message || 'Failed to submit leave. Please verify contract status.');
    } finally {
      setSubmittingLeave(false);
    }
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
      workingDays: acc.workingDays + (activeStaffList.some(staff =>
        !day.holidayEmployees.some((employee: any) => String(employee.id) === String(staff.id)) &&
        !day.weeklyOffEmployees.some((employee: any) => String(employee.id) === String(staff.id))
      ) ? 1 : 0),
      totalPresent: acc.totalPresent + day.present,
      totalAbsent: acc.totalAbsent + day.absent,
      totalHalfDay: acc.totalHalfDay + day.halfDay,
      totalPaidLeave: acc.totalPaidLeave + day.paidLeave,
    }),
    { totalDays: 0, workingDays: 0, totalPresent: 0, totalAbsent: 0, totalHalfDay: 0, totalPaidLeave: 0 }
  );

  const attendanceRate = stats.workingDays > 0 && staffCount > 0
    ? Math.round((stats.totalPresent / (stats.workingDays * staffCount)) * 100)
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
            onClick={() => openApplyLeaveModal()}
            className="btn-premium flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Apply Leave
          </button>
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

      {/* View Mode Toggle & Employee Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white/50 border border-white/60 p-2 rounded-2xl">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${viewMode === 'calendar'
                ? 'bg-navy-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${viewMode === 'list'
                ? 'bg-navy-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <BarChart3 className="h-4 w-4" />
            Daily Breakdown
          </button>
          <button
            onClick={() => setViewMode('employee')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${viewMode === 'employee'
                ? 'bg-navy-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Users className="h-4 w-4" />
            Employee Summary
          </button>
          <button
            onClick={() => setViewMode('leaves')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${viewMode === 'leaves'
                ? 'bg-navy-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Contract Leaves
          </button>
        </div>

        {/* Employee Dropdown Filter */}
        {viewMode === 'calendar' && (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Filter Employee:</span>
            <select
              value={selectedStaff || ""}
              onChange={(e) => setSelectedStaff(e.target.value || null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 shadow-sm transition-all focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900 min-w-[200px]"
            >
              <option value="">All Employees (Daily Counts)</option>
              {activeStaffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name || `${staff.firstName} ${staff.lastName}`}
                </option>
              ))}
            </select>
          </div>
        )}
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
              if (!day) return <div key={`empty-${index}`} className={selectedStaff ? 'min-h-[145px]' : 'h-24'} />;

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayData = monthlyData[dateStr];
              const staffHoliday = dayData?.holidayEmployees?.find((employee: any) => String(employee.id) === selectedStaff);
              const isWeekend = selectedStaff
                ? dayData?.weeklyOffEmployees?.some((employee: any) => String(employee.id) === selectedStaff)
                : false;

              let staffStatus: 'present' | 'halfDay' | 'absent' | 'paidLeave' = 'absent';
              let selectedEmployeeRecord: any = null;
              if (selectedStaff && dayData) {
                const presentRec = dayData.presentEmployees?.find((e: any) => e.id === selectedStaff);
                const halfDayRec = dayData.halfDayEmployees?.find((e: any) => e.id === selectedStaff);
                const paidLeaveRec = dayData.paidLeaveEmployees?.find((e: any) => e.id === selectedStaff);
                const absentRec = dayData.absentEmployees?.find((e: any) => e.id === selectedStaff);

                if (presentRec) {
                  staffStatus = 'present';
                  selectedEmployeeRecord = presentRec;
                } else if (halfDayRec) {
                  staffStatus = 'halfDay';
                  selectedEmployeeRecord = halfDayRec;
                } else if (paidLeaveRec) {
                  staffStatus = 'paidLeave';
                  selectedEmployeeRecord = paidLeaveRec;
                } else if (absentRec) {
                  staffStatus = 'absent';
                  selectedEmployeeRecord = absentRec;
                }
              }

              const staffPunches = selectedStaff && dayData ? getRealPunchDetails(staffStatus, selectedEmployeeRecord) : null;

              const getCellBgColor = () => {
                if (staffHoliday) return 'border-violet-200 bg-violet-50/50';
                if (isWeekend) {
                  if (selectedStaff && selectedEmployeeRecord) {
                    if (staffStatus === 'present') return 'border-emerald-200 bg-emerald-50/20 hover:shadow-md';
                    if (staffStatus === 'halfDay') return 'border-amber-200 bg-amber-50/20 hover:shadow-md';
                    if (staffStatus === 'paidLeave') return 'border-blue-200 bg-blue-50/20 hover:shadow-md';
                  }
                  return 'border-slate-100 bg-slate-50/50';
                }
                if (!selectedStaff) {
                  return `border-navy-50 ${getStatusColor(dayData)} hover:shadow-md`;
                }
                if (staffStatus === 'present') return 'border-emerald-200 bg-emerald-50/20 hover:shadow-md';
                if (staffStatus === 'halfDay') return 'border-amber-200 bg-amber-50/20 hover:shadow-md';
                if (staffStatus === 'paidLeave') return 'border-blue-200 bg-blue-50/20 hover:shadow-md';
                return 'border-slate-100 bg-slate-50/30 hover:border-slate-200';
              };

              const isClickable = selectedStaff && selectedEmployeeRecord && (staffStatus === 'present' || staffStatus === 'halfDay');

              return (
                <div
                  key={day}
                  onClick={() => {
                    if (isClickable) {
                      handlePunchCellClick(dateStr);
                    }
                  }}
                  className={`rounded-xl border p-2 transition-all flex flex-col justify-between ${selectedStaff ? 'min-h-[145px]' : 'min-h-[120px]'
                    } ${isClickable ? 'cursor-pointer hover:border-emerald-400 hover:shadow-md' : ''} ${getCellBgColor()}`}
                >
                  <div className="flex items-center justify-between flex-shrink-0">
                    <span className={`text-sm font-semibold ${isWeekend ? 'text-slate-400' : 'text-navy-900'}`}>
                      {day}
                    </span>
                    {isWeekend && <Sun className="h-3 w-3 text-slate-400" />}
                  </div>

                  {dayData && (
                    <>
                      {selectedStaff && (staffHoliday || isWeekend) && (
                        <div className="mt-1 text-[10px] font-semibold text-violet-700">
                          <Sun className="inline h-3 w-3 mr-1" />
                          {staffHoliday ? `Holiday: ${staffHoliday.holidayNames}` : 'Weekly Off'}
                        </div>
                      )}
                      {!selectedStaff && dayData.holiday > 0 && (
                        <div className="mt-1 text-[10px] text-violet-700" title={dayData.holidayEmployees.map((employee: any) => `${employee.name}: ${employee.holidayNames}`).join('\n')}>
                          <Sun className="inline h-3 w-3 mr-1" />
                          Holiday: {dayData.holiday} staff
                          <div>{Array.from(new Set(dayData.holidayEmployees.map((employee: any) => employee.holidayNames))).join(', ')}</div>
                        </div>
                      )}
                      {!selectedStaff && (!isWeekend || dayData.present > 0 || dayData.absent > 0 || dayData.halfDay > 0 || dayData.paidLeave > 0) && (
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

                      {selectedStaff && selectedEmployeeRecord && staffPunches && (
                        <div className="mt-1.5 flex flex-col flex-1 justify-between min-h-0">
                          {/* Status badge */}
                          <div className="mb-1">
                            {staffStatus === 'present' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                                <CheckCircle className="h-2.5 w-2.5" /> Present
                              </span>
                            )}
                            {staffStatus === 'halfDay' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                                <Clock className="h-2.5 w-2.5" /> Half Day
                              </span>
                            )}
                            {staffStatus === 'absent' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700">
                                <XCircle className="h-2.5 w-2.5" /> Absent
                              </span>
                            )}
                            {staffStatus === 'paidLeave' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">
                                <Calendar className="h-2.5 w-2.5" /> Paid Leave
                              </span>
                            )}
                          </div>

                          {/* Punch details — only for present / halfDay */}
                          {(staffStatus === 'present' || staffStatus === 'halfDay') && (
                            <div className="space-y-1 overflow-hidden">
                              {staffPunches.bars.length === 0 ? (
                                <div className="text-[10px] text-slate-400 py-0.5 italic text-center">
                                  No punches yet
                                </div>
                              ) : (
                                staffPunches.bars.map((bar: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className={`rounded px-1.5 py-0.5 text-[9px] truncate border ${bar.color}`}
                                  >
                                    {bar.label}
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {/* Paid Leave label */}
                          {staffStatus === 'paidLeave' && (
                            <div className="rounded px-1.5 py-0.5 text-[9px] truncate border bg-blue-50 border-blue-200 text-blue-700 font-medium">
                              Paid Leave — APPROVED
                            </div>
                          )}

                          {(staffStatus === 'present' || staffStatus === 'halfDay') && (
                            <div className="mt-2 pt-1 border-t border-slate-100/80 flex items-center justify-between text-[8px] text-slate-500 font-medium">
                              <div>
                                <span className="text-slate-400">Punches</span>
                                <div className="font-bold text-navy-900">{staffPunches.punches}</div>
                              </div>
                              <div className="text-center">
                                <span className="text-slate-400">Breaks</span>
                                <div className="font-bold text-navy-900">
                                  {staffPunches.breaks}
                                  {staffPunches.breaksCount > 0 ? ` (${staffPunches.breaksCount})` : ''}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400">Worked</span>
                                <div className="font-bold text-navy-900">{staffPunches.worked}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Contract Holidays</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Present</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Absent</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Half Day</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Paid Leave</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(monthlyData)
                  .map(([dateStr, data]) => {
                    const date = new Date(dateStr);
                    const rate = staffCount > 0 ? Math.round((data.present / staffCount) * 100) : 0;
                    return (
                      <tr key={dateStr} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm font-medium text-navy-900">
                          {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">
                          {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-xs text-violet-700">
                          {data.holidayEmployees.length ? data.holidayEmployees.map((employee: any) => (
                            <div key={employee.id}>{employee.name}: {employee.holidayNames}</div>
                          )) : '—'}
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
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${rate >= 90 ? 'bg-emerald-100 text-emerald-700' :
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

      {/* Employee-wise Summary View */}
      {viewMode === 'employee' && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-navy-900 mb-4">Employee Summary</h3>
          {employeeSummary.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No employee attendance data available for this month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Role</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Present</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Absent</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Half Day</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Paid Leave</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Contract Leaves</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Attendance Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeSummary.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-sm font-semibold text-navy-900">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {row.role}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-emerald-600 font-semibold">
                        {row.present} days
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-rose-600">
                        {row.absent} days
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-amber-600">
                        {row.halfDay} days
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-blue-600">
                        {row.paidLeave} days
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(() => {
                          const stat = employeeContractLeaveStats.find((s) => String(s.staffId) === String(row.id));
                          if (!stat || !stat.hasContract) {
                            return <span className="text-xs text-slate-400 italic">No Active Contract</span>;
                          }
                          return (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className={`font-bold ${stat.totalRemaining > 3 ? 'text-emerald-600' :
                                    stat.totalRemaining > 0 ? 'text-amber-600' : 'text-rose-600'
                                  }`}>
                                  {stat.totalRemaining}
                                </span>
                                <span className="text-slate-400">/ {stat.totalAllocated} days remaining</span>
                              </div>
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {stat.allocations.slice(0, 2).map((alloc: any, i: number) => (
                                  <span key={i} className="inline-flex rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                    {alloc.name}: {alloc.count}d
                                  </span>
                                ))}
                                {stat.allocations.length > 2 && (
                                  <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                    +{stat.allocations.length - 2} more
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${row.rate >= 90 ? 'bg-emerald-100 text-emerald-700' :
                            row.rate >= 75 ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                          }`}>
                          {row.rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <button
                          onClick={() => openApplyLeaveModal(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-navy-900 shadow-sm hover:border-navy-900 hover:bg-slate-50 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Apply Leave
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Contract Leaves View */}
      {viewMode === 'leaves' && (
        <div className="space-y-6">
          {/* Summary Metric Ribbon */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="glass-card p-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Staff With Active Contract
              </span>
              <p className="mt-1 text-2xl font-black text-navy-900">
                {employeeContractLeaveStats.filter((s) => s.hasContract).length} / {activeStaffList.length}
              </p>
              <p className="text-xs text-slate-500">Contract-eligible for leaves</p>
            </div>

            <div className="glass-card p-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Total Allocated Entitlement
              </span>
              <p className="mt-1 text-2xl font-black text-blue-600">
                {employeeContractLeaveStats.reduce((sum, s) => sum + s.totalAllocated, 0)} days
              </p>
              <p className="text-xs text-slate-500">Across all active contracts</p>
            </div>

            <div className="glass-card p-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Leaves Taken This Month
              </span>
              <p className="mt-1 text-2xl font-black text-amber-600">
                {employeeContractLeaveStats.reduce((sum, s) => sum + s.leavesTakenThisMonth, 0)} days
              </p>
              <p className="text-xs text-slate-500">Recorded in {monthName}</p>
            </div>

            <div className="glass-card p-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Total Remaining Balance
              </span>
              <p className="mt-1 text-2xl font-black text-emerald-600">
                {employeeContractLeaveStats.reduce((sum, s) => sum + s.totalRemaining, 0)} days
              </p>
              <p className="text-xs text-slate-500">Available leave quota</p>
            </div>
          </div>

          {/* Detailed Contract Leaves Table */}
          <div className="glass-card p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-navy-900">Contract Leave Entitlements & Balances</h3>
                <p className="text-sm text-slate-500">
                  Each employee's specific leave quota, paid/unpaid allocation, and live balance according to their active contract
                </p>
              </div>
              <button
                onClick={() => openApplyLeaveModal()}
                className="btn-premium flex items-center gap-2 text-sm shadow-sm self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                Apply Leave
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Contract & Validity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Allocated Leave Types</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">This Month</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Remaining Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeContractLeaveStats.map((staff) => (
                    <tr key={staff.staffId} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4 text-sm">
                        <div className="font-bold text-navy-900">{staff.staffName}</div>
                        <div className="text-xs text-slate-500">{staff.role}</div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {staff.hasContract ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-navy-900 text-xs">{staff.contractCode}</span>
                              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                Active
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {staff.startDate} → {staff.endDate}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Off: {staff.weeklyOffs.join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                            No Active Contract
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {staff.allocations.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {staff.allocations.map((alloc: any, idx: number) => (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-xs"
                              >
                                <span className="font-semibold text-navy-900">{alloc.name}</span>
                                <span className="rounded bg-blue-100 px-1 py-0.5 text-[10px] font-bold text-blue-800">
                                  {alloc.count}d
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {alloc.isPaid ? 'Paid' : 'Unpaid'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            {staff.hasContract ? 'Zero leave types configured' : 'Assign contract first'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-blue-600">
                        {staff.leavesTakenThisMonth} day{staff.leavesTakenThisMonth !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-4 text-center text-sm">
                        {staff.hasContract ? (
                          <div className="inline-flex flex-col items-center">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${staff.totalRemaining > 3
                                ? 'bg-emerald-100 text-emerald-800'
                                : staff.totalRemaining > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                              {staff.totalRemaining} / {staff.totalAllocated} days
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {staff.totalRemaining === 0 ? 'Exhausted' : 'Available'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-sm">
                        <button
                          onClick={() => openApplyLeaveModal(staff.staffId)}
                          disabled={!staff.hasContract}
                          className={`btn-premium inline-flex items-center gap-1 px-3 py-1.5 text-xs ${!staff.hasContract ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Apply Leave
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {/* Punches Detail Dialog with Images */}
      {selectedPunchDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedPunchDetail(null)}
        >
          <div
            className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
                  {new Date(selectedPunchDetail.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <h3 className="text-lg font-black text-navy-900">
                  Punch Logs: {selectedPunchDetail.staffName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPunchDetail(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {loadingPunch && (
                <div className="py-12">
                  <LoadingState message="Loading punch photos and logs..." />
                </div>
              )}

              {!loadingPunch && !punchRecord && (
                <div className="text-center py-12 text-slate-500">
                  No detailed punch records found for this date.
                </div>
              )}

              {!loadingPunch && punchRecord && (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Punches</span>
                      <p className="text-lg font-black text-navy-900 mt-0.5">
                        {punchRecord.breaks ? 2 + punchRecord.breaks.length * 2 : 2}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Breaks</span>
                      <p className="text-lg font-black text-rose-600 mt-0.5">
                        {punchRecord.breaks ? `${punchRecord.breaks.length}` : '0'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                      <span className="inline-flex mt-1 items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        {punchRecord.attendanceStatus || 'Present'}
                      </span>
                    </div>
                  </div>

                  {/* Punch Timeline with Photos */}
                  <div className="space-y-6 relative before:absolute before:inset-0 before:left-4 before:border-l-2 before:border-slate-100">
                    {(() => {
                      const timelineEvents = [];
                      if (punchRecord.checkIn) {
                        timelineEvents.push({
                          type: 'checkIn',
                          title: 'Clock-In (Check-In)',
                          time: formatTimeStr(punchRecord.checkIn.timestamp),
                          photo: punchRecord.checkIn.photo,
                          dotColor: 'bg-emerald-500 ring-emerald-100',
                        });
                      }

                      const sortedBreaks = [...(punchRecord.breaks || [])].sort((a, b) => {
                        return new Date(a.in).getTime() - new Date(b.in).getTime();
                      });

                      sortedBreaks.forEach((b: any, idx: number) => {
                        if (b.in) {
                          timelineEvents.push({
                            type: 'breakIn',
                            title: `Break ${idx + 1} - Start`,
                            time: formatTimeStr(b.in),
                            photo: b.photo,
                            dotColor: 'bg-rose-500 ring-rose-100',
                          });
                        }
                        if (b.out) {
                          timelineEvents.push({
                            type: 'breakOut',
                            title: `Break ${idx + 1} - End`,
                            time: formatTimeStr(b.out),
                            photo: b.outPhoto,
                            dotColor: 'bg-amber-500 ring-amber-100',
                          });
                        }
                      });

                      if (punchRecord.checkOut) {
                        timelineEvents.push({
                          type: 'checkOut',
                          title: 'Clock-Out (Check-Out)',
                          time: formatTimeStr(punchRecord.checkOut.timestamp),
                          photo: punchRecord.checkOut.photo,
                          dotColor: 'bg-blue-600 ring-blue-100',
                        });
                      }

                      return timelineEvents.map((evt, idx) => (
                        <div key={idx} className="relative flex items-start gap-6 pl-9">
                          {/* Timeline dot */}
                          <div className={`absolute left-2.5 top-1.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full ring-4 ${evt.dotColor}`} />

                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-navy-900">{evt.title}</h4>
                              <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-1.5 py-0.5">
                                {evt.time}
                              </span>
                            </div>

                            {/* Camera photo */}
                            {evt.photo ? (
                              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-slate-50 max-w-sm">
                                <img
                                  src={evt.photo}
                                  className="w-full max-h-48 object-cover hover:scale-105 transition-transform duration-300"
                                  alt={`${evt.title} verification`}
                                  onError={(e) => {
                                    // Fallback if image fails to render
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3 max-w-sm flex items-center justify-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                Verification photo not captured
                              </div>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedPunchDetail(null)}
                className="btn-premium px-5 py-2 text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Apply Leave Dialog with Comprehensive Contract Validation */}
      {showApplyLeaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setShowApplyLeaveModal(false)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-navy-900 to-navy-800 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-gold-400">
                  <CalendarRange className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Apply Employee Leave</h3>
                  <p className="text-xs text-slate-300">
                    Validated against active employment contract & leave quotas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowApplyLeaveModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleApplyLeaveSubmit} className="p-6 space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={applyLeaveStaffId}
                  onChange={(e) => handleStaffSelectChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-900 shadow-sm focus:border-navy-900 focus:outline-none"
                  required
                >
                  <option value="" disabled>Select Employee</option>
                  {activeStaffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name || `${staff.firstName} ${staff.lastName}`} ({staff.role?.name || staff.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Active Contract Info Banner */}
              {selectedStaffContract ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy-900 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      Contract: {selectedStaffContract.code} ({selectedStaffContract.title})
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-bold text-blue-800">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>
                      Validity: {selectedStaffContract.startDate} → {selectedStaffContract.endDate || 'Ongoing'}
                    </span>
                    <span>
                      Weekly Off: {selectedStaffContract.weeklyOffPattern?.join(', ') || 'Sunday'}
                    </span>
                  </div>
                </div>
              ) : applyLeaveStaffId ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>This employee has no active contract on record. Leaves cannot be applied without an active contract.</span>
                </div>
              ) : null}

              {/* Leave Type Selection (from Contract) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Leave Type (Contract Allocation) <span className="text-rose-500">*</span>
                </label>
                {selectedStaffContract && (selectedStaffContract.leaveAllocations?.length ?? 0) > 0 ? (
                  <select
                    value={applyLeaveTypeId}
                    onChange={(e) => setApplyLeaveTypeId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-900 shadow-sm focus:border-navy-900 focus:outline-none"
                    required
                  >
                    {selectedStaffContract.leaveAllocations.map((alloc: any) => {
                      const id = String(alloc.id || alloc.leaveTypeId);
                      const name = alloc.name || alloc.leaveTypeName || 'Leave';
                      const count = Number(alloc.count) || 0;
                      const isPaid = alloc.isPaid !== false;
                      return (
                        <option key={id} value={id}>
                          {name} — {count} days allowed ({isPaid ? 'Paid' : 'Unpaid'})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">
                    {selectedStaffContract
                      ? 'No leave types configured in this contract. Please update contract leave allocations.'
                      : 'Please select an employee first.'}
                  </div>
                )}
              </div>

              {/* Leave Mode: Single Day vs Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Leave Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setApplyLeaveMode('single')}
                      className={`rounded-lg py-1.5 text-xs font-bold transition-all ${applyLeaveMode === 'single'
                          ? 'bg-white text-navy-900 shadow-sm'
                          : 'text-slate-500 hover:text-navy-900'
                        }`}
                    >
                      Single Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setApplyLeaveMode('range')}
                      className={`rounded-lg py-1.5 text-xs font-bold transition-all ${applyLeaveMode === 'range'
                          ? 'bg-white text-navy-900 shadow-sm'
                          : 'text-slate-500 hover:text-navy-900'
                        }`}
                    >
                      Date Range
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Duration
                  </label>
                  <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setApplyLeaveDuration('full')}
                      className={`rounded-lg py-1.5 text-xs font-bold transition-all ${applyLeaveDuration === 'full'
                          ? 'bg-white text-navy-900 shadow-sm'
                          : 'text-slate-500 hover:text-navy-900'
                        }`}
                    >
                      Full Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setApplyLeaveDuration('half')}
                      className={`rounded-lg py-1.5 text-xs font-bold transition-all ${applyLeaveDuration === 'half'
                          ? 'bg-white text-navy-900 shadow-sm'
                          : 'text-slate-500 hover:text-navy-900'
                        }`}
                    >
                      Half Day (0.5)
                    </button>
                  </div>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    {applyLeaveMode === 'single' ? 'Leave Date' : 'Start Date'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={applyLeaveStartDate}
                    onChange={(e) => setApplyLeaveStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-navy-900 shadow-sm focus:border-navy-900 focus:outline-none"
                    required
                  />
                </div>

                {applyLeaveMode === 'range' && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      End Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={applyLeaveEndDate}
                      min={applyLeaveStartDate}
                      onChange={(e) => setApplyLeaveEndDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-navy-900 shadow-sm focus:border-navy-900 focus:outline-none"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Reason / Notes */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Reason / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={applyLeaveReason}
                  onChange={(e) => setApplyLeaveReason(e.target.value)}
                  placeholder="e.g. Medical emergency, Family function, etc."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-navy-900 shadow-sm focus:border-navy-900 focus:outline-none resize-none"
                />
              </div>

              {/* Live Contract Validation Summary */}
              {applyLeaveStaffId && (
                <div className={`rounded-xl p-3 text-xs space-y-1.5 border transition-all ${leaveCalculation.isValid
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                  }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    {leaveCalculation.isValid ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>Contract Validation Passed</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                        <span>Contract Validation Issue</span>
                      </>
                    )}
                  </div>

                  {leaveCalculation.isValid ? (
                    <div className="text-[11px] space-y-0.5 text-emerald-800">
                      <p>
                        ✓ <strong>{leaveCalculation.netDays} working day(s)</strong> will be deducted.
                      </p>
                      {leaveCalculation.skippedWeeklyOffs?.length > 0 && (
                        <p className="text-slate-500">
                          ℹ Excluded weekly off(s): {leaveCalculation.skippedWeeklyOffs.join(', ')}
                        </p>
                      )}
                      {leaveCalculation.selectedAllocation && (
                        <p>
                          Remaining after leave:{' '}
                          <strong>
                            {Math.max(0, (leaveCalculation.remaining || 0) - leaveCalculation.netDays)}
                          </strong>{' '}
                          day(s) (of {leaveCalculation.selectedAllocation.count} allocated)
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] font-semibold text-rose-700">
                      {leaveCalculation.error}
                    </p>
                  )}
                </div>
              )}

              {leaveValidationError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{leaveValidationError}</span>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApplyLeaveModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!leaveCalculation.isValid || submittingLeave}
                  className={`btn-premium flex items-center gap-2 px-5 py-2 text-sm shadow-sm ${!leaveCalculation.isValid || submittingLeave
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                    }`}
                >
                  {submittingLeave ? (
                    'Applying Leave...'
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Confirm & Record Leave
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceSummaryPage;
