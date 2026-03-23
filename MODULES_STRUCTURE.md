# 📋 UPDATED CORE MODULES STRUCTURE (11 MODULES)

## Architecture Update Summary

**Previous Structure:** 8 Modules
**New Structure:** 11 Modules
**Status:** ✅ UPDATED - All Phase 1 documentation refreshed

---

## Complete 11-Module Breakdown

### Module 1: **Dashboard**
**Purpose:** Admin overview and system monitoring
**Role Access:** Admin, HR Manager, Finance, Supervisor

**Key Features:**
- System KPIs and metrics
- Real-time analytics charts
- Attendance overview (Daily, Monthly)
- Payroll status (Pending, Processed)
- Leave approvals pending
- System health monitoring
- Quick action buttons
- Role-specific dashboards

**API Endpoints (4):**
- `GET /dashboard/overview` - KPIs and metrics
- `GET /dashboard/analytics` - Charts data
- `GET /dashboard/quick-actions` - Quick access
- `GET /dashboard/health` - System status

**Database Collections:**
- Uses read-only views of: employees, attendance, payroll, leaves

---

### Module 2: **Employees**
**Purpose:** Employee master data and document management
**Role Access:** Admin, HR Manager, Supervisor, Employee (self), Viewer

**Key Features:**
- Employee personal information
- Contact and professional details
- Document management (birth certificates, contracts, etc)
- Document expiry tracking
- Employment history
- Profile pictures
- Employee status (Active, Inactive, Resigned)
- Bulk import/export
- Advanced search and filtering
- Department and branch associations

**API Endpoints (9):**
- `POST /employees` - Create employee
- `GET /employees` - List with filters/pagination
- `GET /employees/:id` - View profile
- `PUT /employees/:id` - Update profile
- `DELETE /employees/:id` - Archive employee
- `POST /employees/:id/documents` - Upload document
- `GET /employees/:id/documents` - View documents
- `POST /employees/import` - Bulk import
- `POST /employees/export` - Bulk export

**Database Collections:**
- employees (20+ fields)
- employee_documents (8 fields)
- employment_history (tracking employee changes)

---

### Module 3: **Attendance**
**Purpose:** Daily attendance tracking and late deduction
**Role Access:** Admin, HR Manager, Supervisor, Employee, Viewer

**Key Features:**
- Daily check-in/check-out
- Automatic late minute calculation
- Category-based late rules
  - WhiteCollar: Late after 08:00
  - BlueCollar: Late after 07:30
  - Management: Late after 09:00
  - PartTime: Manual entry
- Saturday bonus tracking (Helper 200, Cleaner 100)
- Absence management (Leave, Deducted)
- Excuse functionality
- Multiple views (Grid, List, Calendar)
- Department and branch filtering
- Monthly and daily reports

**Business Rules:**
- First 60 late minutes/month = FREE (no deduction)
- Each additional 60 minutes = 1 day deduction
- Saturday bonus if worked
- Automatic daily wage calculation

**API Endpoints (7):**
- `POST /attendance/checkin` - Check-in
- `POST /attendance/checkout` - Check-out
- `GET /attendance` - View records
- `GET /attendance/report` - Department report
- `PUT /attendance/:id` - Correct record
- `GET /attendance/monthly` - Monthly report
- `POST /attendance/import` - Bulk import

**Database Collections:**
- daily_attendance
- late_rules
- attendance_reports (cached)

---

### Module 4: **Leaves**
**Purpose:** Leave request management and balance tracking
**Role Access:** Admin, HR Manager, Employee, Viewer

**Key Features:**
- Multiple leave types:
  - Annual: 15 days (after 3 months employment)
  - Emergency: 6 days
  - Sick: 5 days (medical report required)
  - Unpaid: Unlimited
- Leave request workflow (Draft → Submitted → Approved/Rejected)
- Medical report attachment for sick leave
- Leave balance tracking and deduction
- Leave history with dates and status
- Leave calendar view
- Department-wide leave reports
- Remaining balance display

**Business Rules:**
- Eligibility: After 3 months employment
- Balances updated on employment anniversary
- Approved leave automatically deducts from balance
- Sick leave requires medical report
- Can view team's leave calendar

**API Endpoints (8):**
- `POST /leaves/requests` - Apply for leave
- `GET /leaves/requests` - View requests
- `PUT /leaves/requests/:id/approve` - Approve
- `PUT /leaves/requests/:id/reject` - Reject
- `GET /leaves/balance/:empId` - Check balance
- `GET /leaves/history` - View history
- `GET /leaves/types` - Leave types
- `GET /leaves/report` - Leave report

**Database Collections:**
- leave_types
- leave_requests
- leave_balance (per employee, per type)

---

### Module 5: **Payroll**
**Purpose:** Monthly salary calculations and processing
**Role Access:** Admin, Finance, Viewer

**Key Features:**
- Payroll month management (Start date, End date)
- Per-employee salary structure configuration
- Complex salary calculation engine including:
  - Base salary + Variable salary
  - Bonuses aggregation
  - Multiple deductions
- Deduction types:
  - Late deductions (from attendance)
  - Absence deductions (from leave)
  - Insurance (11.25% of salary)
  - Medical insurance (fixed amount)
  - Cash advance installments
- Automatic salary slip generation
- Net salary calculation and validation
- Payroll report generation
- Excel export for bank transfers

**Calculation Formula:**
```
Net Salary = Basic + Variable + Bonuses
           - Late Deduction
           - Absence Deduction
           - Insurance (11.25%)
           - Medical
           - Cash Advance Installment
```

**API Endpoints (8):**
- `POST /payroll/months` - Create month
- `GET /payroll/months` - List months
- `PUT /payroll/months/:id` - Update month
- `GET /payroll/summary` - Payroll summary
- `GET /payroll/slips/:empId` - View salary slip
- `POST /payroll/calculate` - Calculate payroll
- `POST /payroll/finalize` - Finalize month
- `POST /payroll/export` - Export for bank

**Database Collections:**
- payroll_months
- salary_structure (per employee)
- payroll_summary (final calculations)

---

### Module 6: **Bonuses**
**Purpose:** Bonus management and calculation
**Role Access:** Admin, Finance, HR Manager

**Key Features:**
- Multiple bonus types:
  - Saturday Bonus (Helper 200, Cleaner 100)
  - Potty Training Bonus
  - After School Program Bonus
  - Extra Bonuses (manual entry)
- Bonus entry and tracking per month
- Automatic calculation and aggregation
- Bonus reports per month and employee
- Employee bonus history
- Bulk import for monthly bonus entry
- Bonus export to payroll module

**Data Model:**
- Employee
- PayrollMonth
- BonusType
- Amount

**API Endpoints (7):**
- `POST /bonuses` - Add bonus entry
- `GET /bonuses` - View bonuses
- `GET /bonuses/:month` - Monthly bonuses
- `PUT /bonuses/:id` - Update bonus
- `DELETE /bonuses/:id` - Delete bonus
- `GET /bonuses/history/:empId` - Employee history
- `GET /bonuses/report` - Bonus report

**Database Collections:**
- bonuses
- bonus_types

---

### Module 7: **Social Insurance**
**Purpose:** Social insurance program management
**Role Access:** Admin, Finance, HR Manager, Viewer

**Key Features:**
- Employee enrollment and onboarding
- Insurance number tracking
- Insurable wage configuration
- Employee contribution: 11.25% (automatic)
- Employer contribution: 19% (calculated)
- Enrollment date and status tracking
- Premium payment calculation
- Deduction automation in payroll
- Compliance reports
- Coverage verification
- Annual enrollment review

**Calculations:**
- Employee Share = Insurable Wage × 11.25%
- Employer Share = Insurable Wage × 19%

**API Endpoints (5):**
- `POST /insurance/social` - Enroll employee
- `GET /insurance/social` - View enrollments
- `PUT /insurance/social/:empId` - Update enrollment
- `GET /insurance/social/:empId` - Personal coverage
- `POST /insurance/social/premiums` - Calculate premiums
- `GET /insurance/social/report` - Report

**Database Collections:**
- social_insurance
- social_insurance_history

---

### Module 8: **Medical Insurance**
**Purpose:** Medical insurance and family coverage
**Role Access:** Admin, Finance, Employee, Viewer

**Key Features:**
- Medical plan creation and management
- Employee enrollment
- Family member coverage (Spouse, Children)
- Individual family member fees
- Monthly premium calculation
- Total premium aggregation
- Coverage verification
- Update plan elections
- Employee self-service enrollment
- Coverage reports
- Claims processing readiness (future)

**Coverage Types:**
- Employee only
- Employee + Spouse
- Employee + Children
- Full family coverage
- Custom coverage

**API Endpoints (7):**
- `POST /insurance/medical` - Create plan
- `GET /insurance/medical` - View plans
- `PUT /insurance/medical/:id` - Update plan
- `POST /insurance/medical/enroll` - Enroll employee
- `POST /insurance/medical/family` - Add family member
- `GET /insurance/medical/:empId` - View coverage
- `GET /insurance/medical/report` - Report

**Database Collections:**
- medical_insurance (plans)
- medical_enrollment (employee enrollment)
- medical_family_members (coverage)

---

### Module 9: **Organization**
**Purpose:** Organization structure and hierarchy management
**Role Access:** Admin, Viewer

**Components:**

#### 9.1 Branches
- Location/office management
- Multi-location support
- Branch details (name, code, address)
- Branch-specific configurations
- Employee count per branch

#### 9.2 Departments
- Organization structure
- Operational vs Non-operational classification
- Department hierarchy
- Manager assignment
- Department-specific policies

#### 9.3 Job Titles
- Position definitions
- Position types:
  - Full-time
  - Part-time
  - WhiteCollar (08:00 start)
  - BlueCollar (07:30 start)
  - Management (09:00 start)
- Salary band definition
- Department assignment

#### 9.4 Categories
- Work hour classifications
- Start time definitions
- Late rules per category
- Bonus calculations per category
- Category examples:
  - WhiteCollar → 08:00
  - BlueCollar → 07:30
  - Management → 09:00
  - PartTime → Flexible

**API Endpoints (16):**
- Branches: GET, POST, PUT, DELETE, Export (5)
- Departments: GET, POST, PUT, DELETE, Import (5)
- Job Titles: GET, POST, PUT, DELETE (4)
- Categories: GET, POST, PUT, DELETE (4)

**Database Collections:**
- branches
- departments
- job_titles
- categories

---

### Module 10: **Website CMS**
**Purpose:** Landing page and website content management
**Role Access:** Admin

**Key Features:**
- Landing page builder (no-code)
- Drag-drop content sections
- Pre-built components:
  - Hero section
  - Feature cards
  - Testimonials
  - FAQs
  - Call-to-action
  - Footer
- Image management and uploads
- Content versioning
- Live preview
- SEO optimization
- Page publishing/unpublishing
- Theme customization
- Email template management
- Multi-page support

**API Endpoints (8):**
- `GET /cms/pages` - List published pages
- `GET /cms/pages/:slug` - Get page content
- `POST /cms/pages` - Create page
- `PUT /cms/pages/:id` - Update page
- `DELETE /cms/pages/:id` - Delete page
- `POST /cms/pages/:id/publish` - Publish
- `POST /cms/images/upload` - Upload image
- `GET /cms/images` - List images

**Database Collections:**
- cms_pages
- cms_content_sections
- cms_images

---

### Module 11: **Settings**
**Purpose:** System configuration and administration
**Role Access:** Admin Only

**Key Features:**

#### 11.1 User Management
- Create/manage system users
- Role assignment
- Activate/deactivate users
- Password reset
- User activity logs

#### 11.2 Permissions & RBAC
- Define roles (Admin, HR Manager, Finance, etc)
- Assign permissions per role
- Module access control
- Feature-level permissions
- Custom role creation

#### 11.3 Branding
- Company logo upload
- Color scheme configuration
- Theme customization
- Brand guidelines
- Email templates for system communications

#### 11.4 System Settings
- Application name and tagline
- Time zone and locale
- Date formats
- Currency settings
- Fiscal year configuration

#### 11.5 Backup & Restore
- Manual backup triggers
- Automated backup scheduling
- Backup frequency configuration
- Point-in-time recovery
- Backup download/restore

#### 11.6 Email Configuration
- Email provider setup
- SMTP settings
- Email templates customization
- Notification preferences

#### 11.7 Audit Logs
- View all system modifications
- User action tracking
- Data change history
- Failed login attempts
- Activity reports
- Compliance audit trails

**API Endpoints (12):**
- `GET /settings` - Get all settings
- `PUT /settings` - Update settings
- `POST /settings/branding` - Update branding
- `GET /settings/branding` - Get branding
- `POST /settings/backup` - Manual backup
- `GET /settings/backup/list` - List backups
- `POST /settings/backup/restore` - Restore
- `GET /settings/audit-logs` - View logs
- `POST /users` - Create user
- `GET /users` - List users
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Deactivate user

**Database Collections:**
- users
- roles
- permissions
- role_permissions
- system_settings
- branding_config
- audit_logs
- backups

---

## Updated API Endpoint Summary

| Module | Endpoints | Total |
|--------|-----------|-------|
| Authentication | 6 | 6 |
| Dashboard | 4 | 4 |
| Employees | 9 | 9 |
| Attendance | 7 | 7 |
| Leaves | 8 | 8 |
| Payroll | 8 | 8 |
| Bonuses | 7 | 7 |
| Social Insurance | 6 | 6 |
| Medical Insurance | 7 | 7 |
| Organization | 16 | 16 |
| Website CMS | 8 | 8 |
| Settings | 12 | 12 |
| **TOTAL** | | **103** |

---

## Updated Database Collections (24 Total)

### Core Collections (Core System)
1. users
2. roles
3. permissions
4. role_permissions
5. system_settings
6. branding_config

### HR Collections (Module 9: Organization)
7. branches
8. departments
9. job_titles
10. categories

### Employee Collections (Module 2: Employees)
11. employees
12. employee_documents
13. employment_history

### Attendance Collections (Module 3: Attendance)
14. daily_attendance
15. late_rules
16. attendance_reports

### Leave Collections (Module 4: Leaves)
17. leave_types
18. leave_requests
19. leave_balance

### Payroll Collections (Modules 5 & 6: Payroll & Bonuses)
20. payroll_months
21. salary_structure
22. payroll_summary
23. bonuses
24. bonus_types

### Insurance Collections (Modules 7 & 8)
25. social_insurance
26. medical_insurance
27. medical_family_members

### CMS Collections (Module 10: Website CMS)
28. cms_pages
29. cms_content_sections
30. cms_images

### Audit Collections
31. audit_logs
32. backups

**Total: 32 Collections** (expanded from original 22)

---

## Module Dependencies Map (Updated)

```
┌─── Authentication ──┐
│                     ↓
│             Authorization (RBAC)
│                     ↓
│        ┌────────────────────────────────────────────────┐
│        ↓        ↓        ↓        ↓        ↓        ↓   ├─→ Others
│    Dashboard  Employees Attendance Leaves Payroll Bonuses Insurance Settings CMS Organization
│        │           │        │        │       │      │        │
│        └───────────┴────────┴────────┴───────┴──────┴────────┴──────┴────────┘
│                                     │
│                                     ↓
│                        Business Logic Layer
│                    (Calculations, Validations)
│                                     │
│                                     ↓
│                        Database Layer (Firestore)
```

---

## Phase 1 Update Checklist

✅ 8 modules expanded to 11 modules
✅ Module breakdown documented
✅ API endpoints updated (60+ endpoints)
✅ Database collections expanded (32 total)
✅ Module dependencies visualized
✅ All documentation files updated
✅ Architecture diagrams refreshed
✅ API specifications current

---

## Files Updated

1. ✅ README.md - Module capabilities and features
2. ✅ PHASE_1_ARCHITECTURE.md - API endpoints and dependencies
3. ✅ PHASE_1_SUMMARY.md - System scale metrics
4. ✅ PROJECT_ROADMAP.md - Metrics and endpoints
5. ✅ DOCUMENTATION_INDEX.md - Status dashboard
6. ✅ COMPLETION_SUMMARY.md - Architecture and design
7. ✅ QUICK_START_GUIDE.md - Core modules breakdown
8. ✅ MODULES_STRUCTURE.md - This file (comprehensive reference)

---

## Next Phase Integration

When Phase 2 begins (Landing Page & Branding), all 11 modules will be reflected in:
- Dashboard layouts
- Navigation menus
- Module selector
- Permission dropdowns
- Role assignment interface
- CMS module integration

---

## Key Improvements in New Structure

1. **Better Separation:** Dashboard separated from HR management
2. **Clearer Organization:** Organization module consolidates structural data
3. **CMS Integration:** Website content management as dedicated module
4. **Enhanced Settings:** Comprehensive settings and administration module
5. **Module Independence:** Each module has clear, focused responsibilities
6. **Scalability:** Easier to extend with new modules in future

---

**Status:** ✅ Phase 1 Architecture Updated
**Total Modules:** 11
**API Endpoints:** 103 (60+ main, rest for system functions)
**Database Collections:** 32
**Ready for Phase 2:** YES

---

**Document Generated:** March 22, 2026
**Last Updated:** Module structure restructure to 11 modules
**Version:** 2.0

