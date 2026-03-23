# 🎯 HR ERP & PAYROLL SYSTEM - COMPLETE PROJECT OVERVIEW

## Executive Summary

This document describes a **complete enterprise HR ERP system** designed for multi-branch international nursery operations. The system will be **90-95% auto-generated** across 11 development phases, delivering ~61,500 lines of production-ready code.

---

## 📊 System Scope

### Core Capabilities (11 Modules)
- ✅ **Dashboard** - Admin overview, analytics, KPIs
- ✅ **Employees** - Employee profiles, documents, management
- ✅ **Attendance** - Daily tracking with late deductions and Saturday bonuses
- ✅ **Leaves** - Multiple leave types with balance tracking
- ✅ **Payroll** - Complex salary calculations with deductions
- ✅ **Bonuses** - Bonus entry and management (Saturday, Training, Extra)
- ✅ **Social Insurance** - Social insurance enrollment and tracking
- ✅ **Medical Insurance** - Medical plans and family coverage
- ✅ **Organization** - Branches, departments, job titles, categories
- ✅ **Website CMS** - Landing page and content management
- ✅ **Settings** - Configuration, branding, email templates, permissions

### User Roles
- **Admin** - Full system access, configuration
- **HR Manager** - HR operations, leave approvals
- **Finance** - Payroll, insurance, benefits
- **Supervisor** - Department management, attendance
- **Employee** - Self-service portal
- **Viewer** - Read-only access

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────┐
│   Frontend (Next.js 14 + React 18)      │
│   - Landing page                        │
│   - Admin dashboard                     │
│   - Employee portal                     │
│   - Responsive design                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Authentication (Firebase Auth + JWT)    │
│   - Email/password login                │
│   - Google OAuth                        │
│   - Session management                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Backend API (NestJS)                  │
│   - 8 main modules                      │
│   - REST API (50+ endpoints)            │
│   - Business logic services             │
│   - Data validation                     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Database (Firebase Firestore)         │
│   - 22 collections                      │
│   - Real-time sync                      │
│   - Automatic backups                   │
│   - Security rules                      │
└─────────────────────────────────────────┘
```

---

## 📈 Scale & Performance

| Metric | Capacity | Notes |
|--------|----------|-------|
| Concurrent Users | 500+ | Per deployment |
| Total Employees | 10,000+ | Across all branches |
| Branches | 50+ | Multi-location support |
| API Requests/Sec | 1,000+ | Auto-scaling |
| Database Size | 100GB+ | With backups |
| Page Load Time | <1s | Global CDN |
| Uptime Target | 99.9% | 43 min/month downtime |
| Data Backup | Every 6 hours | Automatic |

---

## 🔒 Security Features

### 7-Layer Security Architecture
1. **Authentication** - Firebase + JWT + 2FA ready
2. **Authorization** - RBAC with granular permissions
3. **Data Security** - AES-256 encryption for sensitive fields
4. **Input Validation** - Zod + class-validator
5. **Audit Logging** - All actions tracked (90-day retention)
6. **Network Security** - HTTPS, CORS, Rate limiting (100 req/min)
7. **Database Security** - Firestore rules, row-level access control

### Security Implementations
- ✅ Password hashing (bcrypt, cost 10)
- ✅ JWT token expiration (1 hour access, 7 day refresh)
- ✅ CSRF protection
- ✅ XSS prevention
- ✅ SQL injection prevention (Firestore native)
- ✅ Encrypted sensitive fields (National IDs, medical info)
- ✅ Audit trail for compliance

---

## 💾 Data Persistence

### Firestore Collections (22 Total)
```
Core:
  - users (Authentication & profiles)
  - roles (Permission definitions)
  - permissions (Access control)
  - audit_logs (Action tracking)

HR:
  - branches (Multiple locations)
  - departments (Department management)
  - job_titles (Position definitions)
  - categories (Work hour types)
  - employees (Employee records)
  - employee_documents (File attachments)

Attendance:
  - daily_attendance (Clock in/out)
  - late_rules (Category-based rules)

Leave:
  - leave_types (Annual, emergency, sick)
  - leave_requests (Employee requests)
  - leave_balance (Remaining balance)

Payroll:
  - payroll_months (Monthly ranges)
  - salary_structure (Per-employee config)
  - bonuses (Bonus entries)
  - cash_advance (Advance tracking)
  - payroll_summary (Monthly summary)

Insurance:
  - social_insurance (11.25% employee, 19% employer)
  - medical_insurance (Monthly plans)
  - medical_family_members (Family coverage)

System:
  - backups (Backup metadata)
```

---

## 🚀 Deployment Strategy

### Frontend
- **Platform:** Vercel
- **Deployment:** Automatic on main branch push
- **CDN:** Global edge network
- **SSL:** Automatic HTTPS
- **Environment:** Production, Staging, Development

### Backend
- **Platform:** Railway or Render
- **Container:** Docker (Node.js 20)
- **Scaling:** Automatic (0-5 instances)
- **Monitoring:** Health checks every 30s
- **Rollback:** Automatic on failed health check

### Database
- **Platform:** Firebase
- **Type:** Firestore (NoSQL)
- **Replication:** 3 regions
- **Backup:** Automatic daily
- **Security:** Firestore security rules

### CI/CD
- **Version Control:** GitHub
- **CI Pipeline:** GitHub Actions
- **Testing:** Automated test suite
- **Deployment:** Automatic on merge to main
- **Monitoring:** Sentry error tracking

---

## 📦 Module Breakdown

### 1. **Dashboard Module**
**Purpose:** Admin overview and system monitoring

**Features:**
- System KPIs and metrics (Attendance, Payroll, Leaves)
- Analytics charts with real-time updates
- Quick access actions
- System health monitoring
- Role-specific dashboards
- Department/branch performance views

---

### 2. **Employees Module**
**Manages:** Employee records and document management

**Features:**
- Employee personal information
- Contact and professional details
- Document management with expiry tracking
- Employment history
- Profile pictures and avatars
- Bulk import/export
- Employee search and filtering
- Status tracking (Active, Inactive, Resigned)

**Data Model:**
- Employees table (20+ fields)
- Employee Documents table (8 fields)
- Employment History table

---

### 2. Attendance Module
**Manages:** Daily attendance, late tracking, bonuses

**Features:**
- Daily check-in/check-out
- Automatic late minute calculation
- Category-based late rules (WhiteCollar 08:00, BlueCollar 07:30, etc)
- Saturday bonus (Helper 200, Cleaner 100)
- Absence tracking (Leave, Deducted Absence)
- Excuse functionality (no deduction for excuses)
- Multiple view modes (Grid, List)
- Filters (Category, Branch, Employee, Date range)

**Business Rules:**
- First 60 late minutes/month = NO deduction
- Each additional 60 minutes = 1 day deduction
- Saturday bonus added if worked
- Automatic daily wage calculation

---

### 3. Leave Management Module
**Manages:** Leave requests, leave types, balance tracking

**Features:**
- Multiple leave types (Annual 15 days, Emergency 6, Sick 5, Unpaid)
- Leave request workflow (Submit → Approve/Reject)
- Medical report requirement for sick leave
- Balance tracking and reporting
- Leave history

**Business Rules:**
- Eligibility: After 3 months employment
- Annual balance: 15 days after 3 months
- Emergency balance: 6 days
- Sick balance: 5 days
- Unpaid: No limit
- Approved leave deducts from balance

---

### 4. Payroll Module
**Manages:** Monthly salary calculations, bonuses, deductions

**Features:**
- Monthly payroll month creation (start date, end date)
- Per-employee salary structure configuration
- Multiple bonus types (Saturday, Potty Training, After School, Extra)
- Multiple deduction types:
  - Late (based on rules)
  - Absence (daily rate × days)
  - Insurance (employee share 11.25%)
  - Medical insurance
  - Cash advance (monthly installment)
- Automatic salary slip generation
- Net salary calculation
- Payroll report generation

**Calculations:**
- Daily Wage = Monthly Salary / 30
- Late Deduction = (LateMinutes / 60) × Daily Wage (after 60 min threshold)
- Absence Deduction = Absent Days × Daily Wage
- Bonus Total = SUM(all bonuses)
- Insurance Deduction = Monthly Salary × 11.25%
- Net Salary = Basic + Variable + Bonuses - All Deductions

---

### 5. Insurance Module
**Manages:** Social insurance and medical insurance

**Social Insurance:**
- Employee Share: 11.25% of insurable wage
- Employer Share: 19%
- Enrollment tracking
- Premium calculations

**Medical Insurance:**
- Monthly plan amount
- Family member coverage
- Individual fees per family member
- Total amount calculation

**Features:**
- Enrollment management
- Coverage tracking
- Deduction automation
- Family member management
- Plan updates

---

### 6. Permissions Module
**Manages:** Role-based access control (RBAC)

**Roles:**
- Admin (Full access)
- HR Manager (HR operations)
- Finance (Payroll)
- Supervisor (Department management)
- Employee (Self-service)
- Viewer (Read-only)

**Permissions:**
- View (Read access)
- Create (Add new records)
- Edit (Modify existing records)
- Delete (Remove records)
- Export (Data export)
- Import (Bulk upload)
- Delete (Archive records)

**Features:**
- Custom role creation
- Permission matrix
- Role assignment to users
- Permission validation on every API call
- Resource-level authorization

---

### 7. Reports & Export Module
**Manages:** Data export and report generation

**Export Formats:**
- Excel (XLSX)
- CSV
- PDF

**Report Types:**
- Attendance reports (by date range, employee, department, branch)
- Payroll reports (salary slip, summary, deductions)
- Leave reports (balance, history, approval status)
- Insurance reports (enrollment, deductions)
- Custom reports builder

**Features:**
- Scheduled report generation
- Email delivery
- Multiple filter options
- Template management
- Historical report access

---

### 8. Backup & Restore Module
**Manages:** Data backup and disaster recovery

**Backup Types:**
- Manual backup (on-demand)
- Scheduled backup (every 6 hours)
- Cloud backup (Firebase)
- Local backup (downloadable)

**Features:**
- Backup versioning
- Point-in-time recovery
- Selective restoration
- Backup compression
- Encrypted storage
- Auto-restore on system startup

---

## 📊 Payroll Calculation Example

```
Employee: Ahmed Ali
Branch: Cairo
Department: Teaching
Category: WhiteCollar (Late after 08:00)
Month: March 2024 (20 working days)

INPUT DATA:
  Basic Salary: 5,000 EGP
  Variable Salary: 500 EGP
  Total Salary: 5,500 EGP
  
  Attendance:
    - Work days: 18
    - Late days: 2 (120 minutes = 2 days late)
    - Absent days: 1
    - Saturday worked: 2 times

CALCULATIONS:
  Daily Wage = 5,500 / 30 = 183.33 EGP
  
  Late Deduction:
    First 60 min = FREE
    Remaining 60 min = 1 day × 183.33 = 183.33 EGP
  
  Absence Deduction:
    1 day × 183.33 = 183.33 EGP
  
  Insurance Deduction:
    5,500 × 11.25% = 618.75 EGP
  
  Medical Deduction:
    500 EGP
  
  Saturday Bonus:
    2 days × 100 (cleaner) = 200 EGP
  
  Bonuses:
    Extra Bonus: 300 EGP

FINAL CALCULATION:
  Base Salary: 5,500 EGP
  + Saturday Bonus: 200 EGP
  + Extra Bonus: 300 EGP
  - Late Deduction: -183.33 EGP
  - Absence Deduction: -183.33 EGP
  - Insurance (11.25%): -618.75 EGP
  - Medical: -500 EGP
  ━━━━━━━━━━━━━━━━━━━━━━━━
  NET SALARY: 4,014.59 EGP
```

---

## 📋 Complete Feature List

### HR Features (8 modules)
- ✅ Branch management
- ✅ Department management
- ✅ Job title configuration
- ✅ Employee profiles
- ✅ Employee documents
- ✅ Category management
- ✅ Staff hierarchy

### Attendance Features
- ✅ Check-in/check-out
- ✅ Late tracking
- ✅ Absence management
- ✅ Saturday tracking
- ✅ Excuse processing
- ✅ Bulk import

### Leave Features
- ✅ Leave requests
- ✅ Approval workflow
- ✅ Balance tracking
- ✅ Medical forms
- ✅ Leave history
- ✅ Policy management

### Payroll Features
- ✅ Salary structure
- ✅ Monthly processing
- ✅ Bonus entry
- ✅ Deduction calculation
- ✅ Salary slip generation
- ✅ Net salary calculation
- ✅ Payroll reports

### Insurance Features
- ✅ Social insurance
- ✅ Medical insurance
- ✅ Family coverage
- ✅ Enrollment tracking
- ✅ Deduction automation
- ✅ Coverage reports

### Admin Features
- ✅ User management
- ✅ Role management
- ✅ Permission control
- ✅ Branding configuration
- ✅ Email templates
- ✅ System settings

### Reporting Features
- ✅ Attendance reports
- ✅ Payroll reports
- ✅ Leave reports
- ✅ Insurance reports
- ✅ Custom reports
- ✅ PDF export
- ✅ Excel export

### Employee Portal Features
- ✅ Profile view
- ✅ Leave request
- ✅ Attendance history
- ✅ Salary slip download
- ✅ Document upload
- ✅ Leave balance check

---

## 🛠️ Technology Specifications

### Frontend Stack
```json
{
  "framework": "Next.js 14",
  "library": "React 18",
  "language": "TypeScript 5.3",
  "styling": "Tailwind CSS 3.4",
  "components": "ShadCN UI",
  "forms": "React Hook Form",
  "validation": "Zod",
  "state": "Zustand",
  "queries": "React Query",
  "http": "Axios",
  "icons": "React Icons",
  "charts": "Recharts",
  "pdf": "React PDF",
  "excel": "SheetJS"
}
```

### Backend Stack
```json
{
  "runtime": "Node.js 20 LTS",
  "framework": "NestJS 10",
  "language": "TypeScript 5.3",
  "database": "Firebase Firestore",
  "storage": "Firebase Storage",
  "auth": "Firebase Auth Admin SDK",
  "validation": "class-validator",
  "orm": "Firebase ODM",
  "password": "bcrypt 5.1",
  "jwt": "jsonwebtoken",
  "excel": "ExcelJS",
  "pdf": "PDFKit",
  "email": "Nodemailer"
}
```

### Deployment Stack
```json
{
  "frontend": "Vercel",
  "backend": "Railway or Render",
  "database": "Firebase Firestore",
  "storage": "Firebase Storage",
  "ci_cd": "GitHub Actions",
  "monitoring": "Sentry",
  "analytics": "Firebase Analytics",
  "container": "Docker"
}
```

---

## 📅 Implementation Timeline

| Phase | Component | Duration | Status |
|-------|-----------|----------|--------|
| 1 | Architecture | ✅ Done | COMPLETE |
| 2 | Landing Page | 4 hours | NEXT |
| 3 | Setup | 2 hours | PENDING |
| 4 | Auth | 6 hours | PENDING |
| 5 | Database | 4 hours | PENDING |
| 6 | Backend | 16 hours | PENDING |
| 7 | Frontend | 20 hours | PENDING |
| 8 | Logic | 12 hours | PENDING |
| 9 | Excel | 8 hours | PENDING |
| 10 | Backup | 4 hours | PENDING |
| 11 | Deploy | 4 hours | PENDING |
| **TOTAL** | **Full System** | **~80 hours** | **IN PROGRESS** |

---

## ✅ Next Steps

1. **Review Architecture** - You now have complete architectural documentation
2. **Proceed to Phase 2** - I'll generate the landing page with branding
3. **Phase 3 Onward** - Each phase builds on the previous one
4. **Final Testing** - Complete system testing before deployment
5. **Go Live** - Deploy to production with monitoring

---

## 📞 Support & Questions

For questions about:
- **Architecture:** See PHASE_1_ARCHITECTURE.md
- **Roadmap:** See PROJECT_ROADMAP.md
- **Database:** See database schema section
- **API:** See API endpoints section
- **Security:** See security section

---

**Status:** ✅ Phase 1 Complete - Ready for Phase 2

**Proceed when ready! Just confirm to start Phase 2 (Landing Page & Branding System)**
