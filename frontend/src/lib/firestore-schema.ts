// Firestore collections reference
export const COLLECTIONS = {
  EMPLOYEES: 'employees',
  ATTENDANCE: 'attendance',
  LEAVES: 'leaves',
  PAYROLL: 'payroll',
  BONUSES: 'bonuses',
  SOCIAL_INSURANCE: 'social_insurance',
  MEDICAL_INSURANCE: 'medical_insurance',
  ORGANIZATION: 'organization',
  CMS: 'cms_content',
  SETTINGS: 'settings',
  USERS: 'users',
  AUDIT_LOGS: 'audit_logs',
};

export const FIRESTORE_SCHEMA = {
  [COLLECTIONS.EMPLOYEES]: {
    indexes: ['branch', 'department', 'employmentStatus', 'category', 'createdAt'],
    ttl: null, // No TTL for employees
  },
  [COLLECTIONS.ATTENDANCE]: {
    indexes: ['employeeId', 'date', 'status', 'branch'],
    ttl: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years in milliseconds
  },
  [COLLECTIONS.LEAVES]: {
    indexes: ['employeeId', 'status', 'startDate', 'endDate'],
    ttl: 3 * 365 * 24 * 60 * 60 * 1000, // 3 years
  },
  [COLLECTIONS.PAYROLL]: {
    indexes: ['employeeId', 'period', 'status'],
    ttl: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
  },
  [COLLECTIONS.BONUSES]: {
    indexes: ['employeeId', 'date', 'type'],
    ttl: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
  },
  [COLLECTIONS.AUDIT_LOGS]: {
    indexes: ['userId', 'timestamp', 'action', 'entity'],
    ttl: 90 * 24 * 60 * 60 * 1000, // 90 days
  },
};
