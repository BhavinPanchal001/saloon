export enum ContractStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  DRAFT = 'draft',
  PENDING_REVISION = 'pending_revision',
  TERMINATED = 'terminated'
}

export enum CalculationType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
  VARIABLE = 'variable'
}

export enum ComponentType {
  EARNING = 'earning',
  DEDUCTION = 'deduction'
}

export interface SalaryComponent {
  id: string;
  name: string;
  type: ComponentType;
  calculationType: CalculationType;
  amount: number;
  effectiveDate?: string;
  isCustom?: boolean; // If overridden at contract level
}

export interface LeaveAllocation {
  leaveTypeId: string;
  leaveTypeName: string;
  count: number;
  isPaid: boolean;
  carryForward: boolean;
  allocationType: 'annual' | 'monthly';
}

export interface ContractRevision {
  id: string;
  version: number;
  effectiveDate: string;
  status: ContractStatus;
  changesSummary: string;
  dataSnapshot: string; // JSON snapshot of the contract at this version
  createdAt: string;
  createdBy: string;
}

export interface Contract {
  id: string;
  code: string;
  title: string;
  employeeId: string;
  employeeName?: string;
  groupId: string;
  groupName?: string;
  typeId: string;
  typeName?: string;
  templateId: string;
  templateName?: string;
  startDate: string;
  endDate?: string;
  durationMonths?: number;
  status: ContractStatus;
  notes?: string;
  
  // Salary Configuration
  salaryComponents: SalaryComponent[];
  
  // Overtime Configuration
  overtime: {
    enabled: boolean;
    type: string;
    rateCalculation: 'fixed_hourly' | 'formula';
    rateValue: number;
    maxHoursPerMonth?: number;
  };

  // Pay Rate Multipliers
  holidayRate: '1x' | '1.5x' | '2x';
  weekendRate: '1x' | '1.5x' | '2x';
  overtimeRate: '1x' | '1.5x' | '2x';

  // Policy Linking
  holidayGroupIds: string[];
  leaveAllocations: LeaveAllocation[];
  
  // Shift Information
  shiftId: string;
  shiftEffectiveDate: string;
  weeklyOffPattern: string[];

  // Revisions
  revisions: ContractRevision[];
  currentVersion: number;
}

export interface ContractGroup {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
}

// Master Data Types
export interface MasterItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ContractType = MasterItem;
export type ContractTemplate = MasterItem & { previewUrl?: string };
export type SalaryMaster = MasterItem & { type: ComponentType; calculationType: CalculationType; defaultAmount?: number };
export type HolidayMaster = MasterItem & { date: string; isRecurring: boolean };
export type LeaveMaster = MasterItem & { defaultCount: number; isPaid: boolean };
export type ShiftMaster = MasterItem & { startTime: string; endTime: string; workingHours: number };
