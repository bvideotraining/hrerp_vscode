// Mock employee data for development

import { Employee } from '@/types/employee';

export const mockEmployees: Employee[] = [
  {
    id: '1',
    fullName: 'Ahmed Hassan',
    employeeCode: 'EMP001',
    email: 'ahmed.hassan@hrerp.com',
    phone: '+971501234567',
    nationalId: '123456789012345',
    dateOfBirth: '1990-05-15',
    gender: 'M',
    nationality: 'Egyptian',
    maritalStatus: 'Married',
    currentAddress: 'Dubai, UAE',
    permanentAddress: 'Cairo, Egypt',
    branch: 'Dubai Main',
    department: 'HR',
    jobTitle: 'HR Manager',
    category: 'WhiteCollar',
    positionType: 'Full-time',
    startDate: '2020-01-15',
    employmentStatus: 'Active',
    reportingManager: 'Manager Name',
    employmentType: 'Permanent',
    currentSalary: 8000,
    previousSalary: 7500,
    salaryIncreaseDate: '2023-01-01',
    currency: 'AED',
    paymentMethod: 'Bank Transfer',
    bankName: 'Emirates NBD',
    accountHolderName: 'Ahmed Hassan',
    accountNumber: '1234567890',
    iban: 'AE070331234567890123456',
    documents: [
      {
        id: 'doc1',
        type: 'Employment Contract',
        file: 'contract.pdf',
        expiryDate: '2025-01-15',
        receivedDate: '2020-01-15',
        status: 'Current'
      }
    ],
    createdAt: '2020-01-15',
    updatedAt: '2024-03-22',
    createdBy: 'admin'
  },
  {
    id: '2',
    fullName: 'Fatima Al-Marzouqi',
    employeeCode: 'EMP002',
    email: 'fatima.marzouqi@hrerp.com',
    phone: '+971509876543',
    nationalId: '987654321098765',
    dateOfBirth: '1992-03-20',
    gender: 'F',
    nationality: 'Emirati',
    maritalStatus: 'Single',
    currentAddress: 'Abu Dhabi, UAE',
    branch: 'Abu Dhabi',
    department: 'Operations',
    jobTitle: 'Operations Manager',
    category: 'WhiteCollar',
    positionType: 'Full-time',
    startDate: '2019-06-01',
    employmentStatus: 'Active',
    reportingManager: 'Manager Name',
    employmentType: 'Permanent',
    currentSalary: 7500,
    currency: 'AED',
    paymentMethod: 'Bank Transfer',
    bankName: 'FAB',
    accountHolderName: 'Fatima Al-Marzouqi',
    accountNumber: '0987654321',
    documents: [],
    createdAt: '2019-06-01',
    updatedAt: '2024-03-22',
    createdBy: 'admin'
  },
  {
    id: '3',
    fullName: 'Mohammed Ali',
    employeeCode: 'EMP003',
    email: 'mohammed.ali@hrerp.com',
    phone: '+971505551111',
    nationalId: '555666777888999',
    dateOfBirth: '1988-07-10',
    gender: 'M',
    nationality: 'Saudi',
    maritalStatus: 'Married',
    currentAddress: 'Sharjah, UAE',
    branch: 'Sharjah',
    department: 'Finance',
    jobTitle: 'Finance Manager',
    category: 'Management',
    positionType: 'Full-time',
    startDate: '2018-03-15',
    employmentStatus: 'Active',
    reportingManager: 'Manager Name',
    employmentType: 'Permanent',
    currentSalary: 9500,
    currency: 'AED',
    paymentMethod: 'Bank Transfer',
    bankName: 'ADIB',
    accountHolderName: 'Mohammed Ali',
    documents: [],
    createdAt: '2018-03-15',
    updatedAt: '2024-03-22',
    createdBy: 'admin'
  }
];

export const branches = ['Dubai Main', 'Abu Dhabi', 'Sharjah', 'Ajman'];
export const departments = ['HR', 'Finance', 'Operations', 'IT', 'Marketing', 'Sales'];
export const jobTitles = ['HR Manager', 'Finance Manager', 'Operations Manager', 'Developer', 'Designer', 'Manager'];
export const categories = ['WhiteCollar', 'BlueCollar', 'Management', 'PartTime'];
export const currencies = ['AED', 'USD', 'EUR', 'EGP', 'SAR'];
export const paymentMethods = ['Bank Transfer', 'Cash', 'Check'];
