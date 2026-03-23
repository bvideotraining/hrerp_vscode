// Employee Types and Interfaces

export type EmployeeCategory = 'WhiteCollar' | 'BlueCollar' | 'Management' | 'PartTime';
export type EmployeeStatus = 'Active' | 'Inactive' | 'Resigned' | 'On Leave' | 'Retired';
export type EmploymentType = 'Permanent' | 'Temporary' | 'Consultant';

export interface Employee {
  id: string;
  // Personal Information
  fullName: string;
  employeeCode: string;
  email: string;
  phone: string;
  nationalId: string;
  dateOfBirth: string;
  gender: 'M' | 'F';
  nationality: string;
  maritalStatus: string;

  // Address
  currentAddress: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Employment Details
  branch: string;
  department: string;
  jobTitle: string;
  category: EmployeeCategory;
  positionType: 'Full-time' | 'Part-time' | 'Contract';

  // Employment Info
  startDate: string;
  employmentStatus: EmployeeStatus;
  resignationDate?: string;
  reportingManager?: string;
  employmentType: EmploymentType;

  // Salary Information
  currentSalary: number;
  previousSalary?: number;
  salaryIncreaseDate?: string;
  currency: string;
  paymentMethod: string;

  // Banking Information
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;

  // Documents
  documents: EmployeeDocument[];
  profilePicture?: string;

  // Additional
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface EmployeeDocument {
  id: string;
  type: string;
  file: string;
  expiryDate?: string;
  receivedDate: string;
  notes?: string;
  status: 'Current' | 'Expired' | 'Renewal Pending';
}

export interface CreateEmployeeInput {
  fullName: string;
  employeeCode: string;
  email: string;
  phone: string;
  nationalId: string;
  dateOfBirth: string;
  gender: string;
  branch: string;
  department: string;
  jobTitle: string;
  category: EmployeeCategory;
  currentSalary: number;
  startDate: string;
  resignationDate?: string;
  currency: string;
  paymentMethod: string;
}

export interface EmployeeListFilters {
  searchTerm?: string;
  branch?: string;
  department?: string;
  category?: EmployeeCategory;
  status?: EmployeeStatus;
  dateRange?: {
    from: string;
    to: string;
  };
}

// Type aliases for backwards compatibility
export type EmployeeData = Employee;
export type EmployeeFormData = CreateEmployeeInput;
