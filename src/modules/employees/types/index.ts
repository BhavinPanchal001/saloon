export type Gender = 'Male' | 'Female' | 'Other';
export type EmploymentStatus = 'Active' | 'Inactive' | 'On Leave' | 'Resigned' | 'Terminated';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
export type DocumentStatus = 'Pending' | 'Verified' | 'Rejected';
export type AccountType = 'Savings' | 'Current';

export interface Employee {
  id: string;
  // Profile Info
  profileImage?: string;
  firstName: string;
  lastName: string;
  email: string; // Personal email
  phone: string;
  dob: string;
  gender: Gender;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };

  // System Auth
  auth: {
    username: string;
    loginEnabled: boolean;
    role: string;
    status: 'Active' | 'Inactive';
  };

  // Employment Details
  employment: {
    employeeCode: string;
    biometricCode?: string;
    companyEmail: string;
    hireDate: string;
    joiningDate: string;
    type: EmploymentType;
    status: EmploymentStatus;
    location: string;
    reportingManagerId?: string;
    reportingManagerName?: string;
    department: string;
    designation: string;
    probationEnd?: string;
  };

  // Bank Details
  bank: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    branchName: string;
    accountType: AccountType;
  };

  // Documents
  documents: EmployeeDocument[];

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDocument {
  id: string;
  type: string;
  documentNumber: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl: string;
  status: DocumentStatus;
  remarks?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface Designation {
  id: string;
  name: string;
  departmentId: string;
}
