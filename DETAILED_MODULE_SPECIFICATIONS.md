# 📋 DETAILED MODULE SPECIFICATIONS - 11 MODULES

**Generated:** March 22, 2026  
**Version:** 1.0  
**Status:** Ready for Development Phases  

---

## MODULE 1: DASHBOARD

### Purpose
Admin overview with key metrics, pending actions, and system health monitoring.

### Dashboard Widgets (Configurable)

#### Widget 1: **Payroll Estimate**
- Shows estimated payroll amount for current month
- Updates in real-time as attendance and bonuses change
- Displays total estimated salary for all active employees
- Color coding: On track (green), At risk (yellow), Critical (red)

**Data:**
- Total employees (active)
- Estimated base payout
- Estimated bonuses
- Estimated deductions
- Total estimated net salary
- Comparison to previous month

#### Widget 2: **Pending Leaves**
- Count of leave requests awaiting approval
- Quick links to pending requests
- Filters: Pending, Approved, Rejected

**Data:**
- Number of pending requests
- Employee names
- Leave type
- Requested dates
- Status

#### Widget 3: **On Leave This Month**
- List of employees currently on leave
- Their leave type and remaining balance
- Expected return date

**Data:**
- Employee name
- Leave type
- Start date / End date
- Remaining balance (of that type)
- Status

#### Widget 4: **Late Incidents This Month**
- Count of late arrivals
- Trend chart (daily, weekly)
- Most common time range of late arrivals

**Data:**
- Total late incidents
- Late minutes total
- Number of employees with late
- Average late time
- Trend graph

#### Widget 5: **Top Late Employees This Month**
- List of employees with most late incidents
- Number of incidents
- Total late minutes
- Potential deduction amount

**Data:**
- Rank (1-10)
- Employee name
- Branch
- Category
- Number of late incidents
- Total late minutes
- Deduction amount

#### Widget 6: **Net Salary Per Branch**
- Bar chart showing average net salary per branch
- Comparison indicators
- Sort by branch

**Data:**
- Branch name
- Number of employees
- Average net salary
- Total salary paid
- Salary vs budget

#### Widget 7: **Bonus Payout Per Branch**
- Breakdown of bonuses by branch
- Breakdown by bonus type
- Total bonus amount per branch

**Data:**
- Branch name
- Saturday bonus total
- Duty bonus total
- Potty training bonus total
- After school bonus total
- Extra bonus total
- Grand total
- % of total payroll

### Dashboard Access
- **Admin:** Full dashboard + all widgets
- **HR Manager:** Dashboard + leave/attendance widgets
- **Finance:** Dashboard + payroll/bonus widgets
- **Supervisor:** Limited to their branch + team data
- **Employee:** Personal dashboard only (portal)

---

## MODULE 2: EMPLOYEES

### Purpose
Complete employee master data management with profiles, documents, and status tracking.

### Employee Profile
```
Personal Information:
├── Employee ID (Auto-generated, unique)
├── Full Name (First, Last)
├── Email (Personal + Work)
├── Phone (Mobile + Landline)
├── National ID / Passport
├── Date of Birth
├── Gender (M/F)
├── Nationality
└── Marital Status

Address Information:
├── Current Address (Street, City, State, ZIP)
├── Permanent Address (if different)
└── Emergency Contact (Name, Phone, Relation)

Department & Classification:
├── Branch (Dropdown - linked to Organization)
├── Department (Dropdown - linked to Organization)
├── Job Title (Dropdown - linked to Organization)
├── Category (Dropdown - WhiteCollar/BlueCollar/Management/PartTime)
└── Position Type (Full-time / Part-time / Contract)

Employment Info:
├── Start Date
├── Employment Status (Active / Inactive / Resigned / On Leave / Retired)
├── Resignation Date (if applicable)
├── Reporting Manager (Dropdown - Employee lookup)
└── Employment Type (Permanent / Temporary / Consultant)

Salary Information:
├── Current Salary (Monthly)
├── Previous Salary (tracking)
├── Salary Increase Date (last increase)
├── Salary Increase Amount
├── Currency
└── Payment Method (Bank Transfer / Cash / Check)

Banking Information:
├── Bank Name
├── Account Holder Name
├── Account Number
├── IBAN / Swift Code
└── Branch Code

Documents:
├── Document Type (Birth Certificate, Contract, ID, Passport, Insurance Card, etc)
├── Document File (upload)
├── Document Expiry Date
├── Received Date
├── Notes
└── Status (Current / Expired / Renewal Pending)

Profile Picture:
├── Image Upload
├── Avatar/Thumbnail
└── Last Updated
```

### Employee List View

**Columns:**
| ID | Name | Email | Branch | Department | Job Title | Category | Status | Contact | Actions |
|----|------|-------|--------|------------|-----------|----------|--------|---------|---------|

**Filters Available:**
- Branch
- Department
- Job Title
- Category
- Status (Active/Inactive/Resigned)
- Date range (Start date, Resignation date)
- Search (Name, Email, ID)

**Actions Per Employee:**
- Edit Profile
- View Full Details
- Edit Salary
- Upload Documents
- View Documents
- Delete / Archive
- Change Status
- Send Email
- Print Profile

### Employee Details View

**Tabs:**
1. **Personal Info** - All personal data
2. **Employment** - Job details, salary, team
3. **Documents** - Uploaded documents with expiry tracking
4. **Attendance** - Link to attendance records
5. **Salary** - Salary history and structure
6. **Leaves** - Leave balance and history
7. **Insurance** - Insurance enrollment status
8. **Activity** - Change log and audit trail

---

## MODULE 3: ATTENDANCE

### Purpose
Track daily employee attendance with late tracking, absence management, and Saturday bonuses.

### Daily Attendance Record

**Columns in List/Table View:**

| Date | Employee | Branch | Category | Check-in Time | Check-out Time | Late/On-Time | Absent Type | Saturday Bonus | Actions |
|------|----------|--------|----------|----------------|----------------|--------------|-------------|----------------|---------|

### Attendance Data Fields

```
Date:
├── Attendance Date
└── Day of Week (calculated)

Employee Info:
├── Employee ID
├── Employee Name
├── Branch
└── Category (WhiteCollar/BlueCollar/Mgmt/PartTime)

Time Logs:
├── Check-in Time (HH:MM)
├── Check-out Time (HH:MM)
├── Total Hours Worked (calculated)
└── Breaks Taken (minutes)

Late Calculation:
├── Expected Arrival Time (based on category)
├── Actual Arrival Time
├── Late Minutes (if any)
├── Late Status (On-Time / Late)
├── Excuse (Yes/No - checkbox)
└── Excuse Notes (if marked)

Absence Tracking:
├── Absent Status (Present / Absent)
├── Absence Type
│   ├── Leave (tied to leave request)
│   ├── Deducted Absence (no leave, no excuse)
│   └── Excuse (late but excused)

Saturday Information:
├── Is Saturday (auto-detected)
├── Worked Status (Yes/No)
├── Saturday Bonus Applicable (calculated)
├── Bonus Amount (based on category: Helper 200, Cleaner 100)
└── Bonus Status (Pending / Applied / Paid)

Status:
├── Record Status (Draft / Confirmed / Locked)
└── Last Modified (timestamp)
```

### Attendance Views

#### Daily View
- Date at top
- All employees for that day
- Grid view with check-in, check-out, status
- Quick corrections button

#### Monthly View
- Calendar grid
- Color-coded days (Green=On-time, Yellow=Late, Red=Absent, Blue=On Leave)
- Employee filter
- Branch filter
- Export to Excel button

#### Analysis View
- Department late analysis
- Branch comparison
- Employee top 10 late list
- Attendance rate % by branch
- Saturday bonus summary

### Attendance Actions

**Per Record:**
- Mark As: Present / Absent / On Leave / Excused
- Edit Time (for corrections)
- Add Note
- Delete
- Lock Record (for month-end)

**Bulk Actions:**
- Mark as Present (selected employees)
- Mark as Absent (selected employees)
- Apply Saturday Bonus (all Saturdays)
- Lock Month (prevent changes)
- Generate Report

### Filters
- By Date (range)
- By Employee
- By Branch
- By Department
- By Category
- Status (Present/Absent/Late/Excused)

---

## MODULE 4: LEAVES

### Purpose
Manage leave requests, approvals, balance tracking, and leave history.

### Leave Request Form

```
Employee Information:
├── Employee Name (auto-populated, read-only)
├── Employee ID (auto-populated, read-only)
├── Branch (read-only)
└── Current Leave Balance (display)

Leave Details:
├── Leave Type (Dropdown)
│   ├── Annual
│   ├── Emergency
│   ├── Sick
│   └── Unpaid
├── Start Date (Date picker)
├── End Date (Date picker)
├── Number of Days (calculated)
├── Reason (Text field)
└── Notes (Optional)

Medical Certificate (if Sick Leave):
├── File Upload
├── Certificate Expiry Date
└── Issuing Doctor/Clinic

Attachments:
├── Additional documents
└── Supporting files
```

### Leave Request Status Workflow

```
Draft → Submitted → Under Review → Approved/Rejected → Completed
```

**Statuses:**
- **Draft:** Employee saving, not yet submitted
- **Submitted:** Sent for approval
- **Under Review:** Manager reviewing
- **Approved:** Manager approved, balance deducted
- **Rejected:** Manager rejected with reason
- **Completed:** Leave ended (past date)
- **Cancelled:** Employee cancelled the request

### Leave Balance Tracking

```
Per Employee, Per Leave Type:
├── Leave Type (Annual/Emergency/Sick/Unpaid)
├── Opening Balance (from last year or initial)
├── Entitled This Year (auto-calculated on anniversary)
├── Used This Year (sum of approved leaves)
├── Pending Approvals (sum of submitted requests)
├── Remaining Balance (Entitled - Used - Pending)
├── Carry Forward (if applicable)
└── Last Updated (date)

Eligibility:
├── Eligibility Date: After 3 months from start date
├── Auto Allocation: On employment anniversary
├── Eligible Balance Snapshot (at time of request)
```

### Leave Approvals

**Manager View:**
- List of pending requests from team
- Employee details
- Leave details
- Recommended decision based on balance
- Approval/Rejection buttons

**Manager Actions:**
- Approve (if balance available)
- Reject (with mandatory reason)
- Request more information
- Adjust dates (if needed)
- Define replacement coverage

### Leave Report

**Report Details:**
```
Period: [Start Date] to [End Date]

By Employee:
├── Employee Name
├── Leave Type: Days Used
├── Total Days Used This Period
├── Remaining Balance
└── Status

By Department:
├── Department Name
├── Employees on Leave (today/this week/this month)
├── Leave Type Breakdown
└── Coverage Status

By Leave Type:
├── Annual: X days used / Y days remaining
├── Emergency: X days used / Y days remaining
├── Sick: X days used / Y days remaining
└── Unpaid: X days used / X allowed

Calendar View:
├── Visual calendar
├── Color-coded leave types
├── Employee filtering
└── Department view
```

---

## MODULE 5: PAYROLL

### Purpose
Monthly salary calculation, configuration, and payroll processing.

### Payroll Summary

**Overview Display:**
```
Payroll Period: [Month] [Year]
Period Dates: [Start Date] to [End Date]
Status: Draft / Pending Review / Finalized

Summary Totals:
├── Total Employees: X
├── Total Base Salary: $XXX,XXX
├── Total Bonuses: $XX,XXX
├── Total Deductions: $XX,XXX
├── Total Net Salary: $XXX,XXX
├── Employer Contribution (Insurance): $XX,XXX
└── Grand Total Payment: $XXX,XXX

Processing:
├── Salaries Calculated: Yes/No
├── Approval Status: Pending/Approved
├── Payment Date: [Date]
└── Bank Transfer Ready: Yes/No
```

### Salary Configuration

**Per Employee Settings:**
```
Employee: [Name]

Base Information:
├── Employee ID
├── Job Title
├── Department
├── Branch
└── Category

Salary Structure:
├── Basic Salary (fixed monthly amount)
├── Variable Salary (commission, allowance, etc)
├── Total Salary (Basic + Variable)
├── Daily Rate (calculated: Total Salary / 30)
└── Hourly Rate (calculated)

Deductions Setup:
├── Income Tax % (if applicable)
├── Professional Tax (if applicable)
├── Union Dues (if applicable)
├── Other Fixed Deductions
└── Total Fixed Deductions

Leave Carry Forward:
├── Annual Leave Carried (days)
└── Payment if Not Taken (Yes/No)

Effective Date:
├── From Date
└── To Date (if change pending)
```

### Payroll Details

**Employee Salary Slip:**
```
Company Header
Period: [Month] [Year]
Employee: [Name]
Employee ID: [ID]
Department: [Dept]
Bank: [Bank Name]
Account: [Last 4 digits]

Earnings:
├── Basic Salary:             $XXXX.XX
├── Variable Salary:          $XXXX.XX
├── Bonuses (from Bonuses):   $XXXX.XX
│   ├── Saturday Bonus:       $XX.XX
│   ├── Training Bonus:       $XX.XX
│   ├── After School Bonus:   $XX.XX
│   └── Extra Bonus:          $XX.XX
├── Other Allowances:         $XXXX.XX
└── TOTAL EARNINGS:           $XXXX.XX

Deductions:
├── Late Minutes Deduction:   $XXXX.XX
│   (Based on: X late mins / Daily rate)
├── Absence Deduction:        $XXXX.XX
│   (Based on: X absent days × Daily rate)
├── Social Insurance (11.25%): $XXXX.XX
├── Medical Insurance:        $XXXX.XX
├── Cash Advance (installment): $XXXX.XX
├── Other Deductions:         $XXXX.XX
└── TOTAL DEDUCTIONS:         $XXXX.XX

Summary:
├── Earnings:                 $XXXX.XX
├── Deductions:              -$XXXX.XX
└── NET SALARY:              $XXXX.XX

Payment:
├── Payment Method: Bank Transfer / Cash
├── Account: [Bank details]
├── Paid On: [Date]
└── Receipt No: [Number]

Sign/Approval: _________________
```

### Payroll Report

**Report Shows:**
```
Payroll Summary Report
Month: [Month] [Year]
Generated: [Date]

Summary Table:
| Employee | Basic | Variable | Bonuses | Late Ded | Absence Ded | Insurance | Medical | Advance | Net Salary |
|----------|-------|----------|---------|----------|------------|-----------|---------|---------|-----------|

Subtotals by Category:
├── WhiteCollar: Total, Count, Average
├── BlueCollar:  Total, Count, Average
├── Management:  Total, Count, Average
└── PartTime:    Total, Count, Average

Subtotals by Branch:
├── Branch 1: Total, Count, Average
├── Branch 2: Total, Count, Average
└── [All branches]

Deductions Analysis:
├── Late Deductions: Total, Affected Employees
├── Absence Deductions: Total, Affected Employees
├── Insurance Deductions: Total
├── Medical Deductions: Total
└── Advance Deductions: Total

Payment Summary:
├── Total to Pay: $XXX,XXX
├── Payment Method: Bank/Cash breakdown
├── Check Count: X
└── Remaining: X
```

### Salary Increase Management

**Track Salary Changes:**
```
Employee: [Name]

Current Salary:
├── Amount: $XXXX
├── Effective From: [Date]
└── Reason: [Promotion/Raise/etc]

Salary History:
├── Date | Amount | Reason
├── 01-Jan-2026 | $XXXX | Initial
├── 15-Mar-2026 | $XXXX (increase) | Promotion
└── [History timeline]

Pending Change:
├── New Amount: $XXXX
├── Effective From: [Date]
├── Reason: [Text]
└── Status: Approved/Pending/Rejected
```

### Cash in Advance

**Advance Request:**
```
Employee: [Name]

Request Details:
├── Amount Requested: $XXXX
├── Purpose: [Text]
├── Required By: [Date]
└── Reason: [Text]

If Approved:
├── Amount Approved: $XXXX
├── Issued Date: [Date]
├── Installments: X months
├── Monthly Deduction: $X
└── Status: Active/Completed/Overdue

Tracking:
├── Total Advanced: $XXXX
├── Total Recovered: $XXXX
├── Remaining: $XXXX
├── Last Deduction: [Date]
└── Next Due: [Date]
```

---

## MODULE 6: BONUSES

### Purpose
Track and manage all employee bonuses including Saturday, training, and extra bonuses.

### Bonus Entry Form

```
Period: [Month] [Year]
Employee: [Name] - [ID]

Saturday Bonus:
├── Number of Saturdays Worked: X
├── Days Type: [Radio] Helper / Cleaner / Other
├── Rate per Saturday: $200 (Helper) or $100 (Cleaner)
├── Total: $X (calculated)
└── Notes: [Text]

Duty Bonus (Shifts/Extra Duty):
├── Number of Duties: X
├── Amount per Duty: $XX
├── Total Duty Bonus: $X (calculated)
└── Notes: [Text]

Potty Training Bonus:
├── Applicable: Yes / No [Checkbox]
├── Children Trained: X
├── Amount per Child: $XX
├── Total Potty Bonus: $X (calculated)
└── Notes: [Text]

After School (Program Bonus):
├── Programs Conducted: X
├── Days/Classes: X
├── Amount: $X per session
├── Total After School: $X (calculated)
└── Notes: [Text]

Extra Bonus:
├── Amount: $X (manual entry)
├── Reason: [Text dropdown/input]
│   ├── Performance
│   ├── Attendance
│   ├── Special Achievement
│   ├── Other
├── Approved By: [Dropdown - Manager name]
└── Approval Status: Pending/Approved/Rejected

Month End Summary:
├── Saturday Bonus:      $X
├── Duty Bonus:          $X
├── Potty Bonus:         $X
├── After School Bonus:  $X
├── Extra Bonus:         $X
├── TOTAL BONUS:         $X (calculated)

Submission:
├── Status: Draft / Submitted / Approved
├── Submitted By: [User name, date]
├── Approved By: [Manager, date]
└── Notes: [Text]
```

### Bonus List View

**Table Columns:**
| Month | Employee | Branch | Dept | Saturday | Duty | Potty | A/School | Extra | Total | Status |
|-------|----------|--------|------|----------|------|-------|----------|-------|-------|--------|

**Filters:**
- By Month (with Period selector)
- By Employee
- By Branch
- By Department
- Status (Pending/Approved/Paid)

**Actions:**
- Edit Bonus Entry
- View Details
- Approve Bonus
- Delete Bonus Entry
- Generate Export

### Bonus Report

```
Bonus Summary Report
Month: [Month] [Year]

Total Bonuses by Type:
├── Saturday Bonus Total:         $X
├── Duty Bonus Total:             $X
├── Potty Training Total:         $X
├── After School Program Total:   $X
├── Extra Bonus Total:            $X
└── GRAND TOTAL:                  $X

Top Bonus Earners (Month):
| Rank | Employee | Branch | Total Bonus | Breakdown |
|------|----------|--------|------------|-----------|

Bonus Breakdown by Branch:
| Branch | Sat Bonus | Duty | Potty | A/School | Extra | Total |
|--------|-----------|------|-------|----------|-------|-------|

Bonus Breakdown by Category:
| Category | Count | Total Bonus | Avg Bonus |
|----------|-------|-------------|-----------|

Employee Bonus History:
|- Employee Name | Month | Total | Trend |
```

---

## MODULE 7: SOCIAL INSURANCE

### Purpose
Manage social insurance enrollment and employee contributions (11.25%).

### Social Insurance Enrollment

**Enrollment Form:**
```
Employee Information:
├── Employee ID (auto)
├── Employee Name
├── Department
├── Branch
├── Job Title
└── Employment Start Date

Insurance Details:
├── Insured/Insurance Number (unique ID from provider)
├── Insurable Wage (basis for calculating contribution)
├── Enrollment Date (date insurance started)
├── Status: Active / Inactive / Suspended / Completed
└── Effective From Date

Calculation (Auto-calculated):
├── Monthly Insurable Wage: $XXXX
├── Employee Contribution (11.25%): $XXXX.XX
├── Employer Contribution (19%): $XXXX.XX
├── Total Monthly: $XXXX.XX
└── Annual Total: $XXXX.XX

Coverage:
├── Coverage Start Date: [Date]
├── Coverage End Date: [Date] (if applicable)
├── Type: Compulsory / Optional
└── Status: Active / Pending / Expired
```

### Social Insurance List View

**Table Columns:**
| Employee | Reg No | Ins Number | Insurable Wage | E-Share (11.25%) | R-Share (19%) | Total Monthly | Status | Enrolled Date |
|----------|--------|-----------|----------------|-----------------|---------------|---------------|--------|---------------|

**Filters:**
- By Employee
- By Branch
- Status (Active/Inactive/Pending)
- Date Range

### Social Insurance Calculation

**Auto-Deduction in Payroll:**
```
Based on:
├── Monthly Salary (from Salary Structure)
├── Calculation Rate: 11.25% (employee share)
├── Applied to: Gross Salary
└── Timing: Monthly payroll processing

Verification:
├── Employee Contribution = Gross Salary × 11.25%
├── Employer Contribution = Gross Salary × 19%
├── Verification Match (Yes/No)
└── Status: Applied / Pending / Error
```

### Social Insurance Report

```
Social Insurance Summary Report
Period: [Date Range]

Enrollment Summary:
├── Total Active Enrollments: X
├── New Enrollments (Period): X
├── Terminated Enrollments: X
├── Inactive/Suspended: X

Financial Summary:
├── Total Employee Contributions (11.25%): $XXX,XXX
├── Total Employer Contributions (19%): $XXX,XXX
├── Total Premium: $XXX,XXX
├── Paid Status: Paid / Pending / Overdue

By Branch:
| Branch | Active Count | E-Contribution | R-Contribution | Total |

By Department:
| Department | Active Count | E-Contribution | R-Contribution |

Delinquent Accounts:
├── Overdue: X accounts
├── Amount Overdue: $XXXX
└── Last Payment Date: [Date]

Compliance:
├── Coverage Rate: X%
├── Non-Compliant Employees: X
└── Action Items: [List]
```

---

## MODULE 8: MEDICAL INSURANCE

### Purpose
Manage medical insurance plans and family member coverage.

### Medical Insurance Setup

**Insurance Plan Details:**
```
Plan Information:
├── Plan Code (unique)
├── Plan Name
├── Provider Name
├── Provider Contact
├── Premium Type: Individual / Family / Custom
└── Status: Active / Inactive / Discontinued

Coverage Details:
├── Coverage Type: Employee Only / Employee + Spouse / Employee + Children / Full Family
├── Monthly Premium: $XXXX
├── Annual Premium: $XXXX.XX
├── Deductible: $XXXX (if applicable)
├── Max Coverage: $XXXX (if applicable)
└── Coverage Start Date: [Date]

Features:
├── In-Network Hospitals: [Link to list]
├── Out-Patient Coverage: Yes/No
├── In-Patient Coverage: Yes/No
├── Maternity Coverage: Yes/No
├── Dental Coverage: Yes/No
├── Vision Coverage: Yes/No
└── Medicine Coverage: Yes/No
```

### Medical Insurance Enrollment

**Employee Enrollment:**
```
Employee: [Name] - [ID]
Plan Selected: [Plan Name]
Enrollment Date: [Date]

Coverage Type:
├── Employee Only
├── Employee + Spouse
├── Employee + Children (how many)
└── Full Family

Premium Details:
├── Base Premium (Employee): $XXXX
├── Spouse Premium (if applicable): $XXXX
├── Children Premium (per child): $XX
│   └── Number of Children: X
├── Total Premium: $XXXX
└── Monthly Payroll Deduction: $XXXX

Family Members (if coverage includes):
```

**Family Member Details:**
```
Family Member Table:

| # | Name | Relationship | National ID | DOB | Gender | Since | Amount |
|---|------|--------------|-------------|-----|--------|-------|--------|
| 1 | Spouse Name | Spouse | ID123 | DOB | M/F | Date | $XXX |
| 2 | Child Name | Child | ID456 | DOB | M/F | Date | $XXX |
| 3 | Child Name | Child | ID789 | DOB | M/F | Date | $XXX |

Total Amount: $XXXX (calculated)
```

### Medical Insurance List View

**Table Columns:**
| Plan Code | Employee | Plan Name | Type | Coverage | Monthly Premium | Family Members | Status | Start Date |
|-----------|----------|-----------|------|----------|-----------------|-----------------|--------|-----------|

**Filters:**
- By Plan
- By Employee
- By Coverage Type
- Status (Active/Inactive/Cancelled)
- Date Range

### Medical Insurance Report

```
Medical Insurance Report
Period: [Month/Year]

Plan Summary:
├── Total Plans Offered: X
├── Active Enrollments: X
├── Total Covered Lives: X (employees + family)

Coverage Breakdown:
├── Employee Only: X
├── Employee + Spouse: X
├── Employee + Children: X (total children: XX)
├── Full Family: X

Premium Summary:
├── Total Monthly Premium: $XXX,XXX
├── Total Annual Premium: $X,XXX,XXX
├── Employee Paid (payroll deduction): $XXX,XXX
├── Company Paid: $XXX,XXX
└── Balance/Arrears: $XXXX

By Plan:
| Plan | Enrollment | Emp Premium | Family Premium | Total |

Claims (if integrated):
├── Claims Filed: X
├── Claims Approved: X
├── Amount Paid: $XXXX
└── Pending: X
```

---

## MODULE 9: ORGANIZATION

### Purpose
Configure organization structure, settings, and operational parameters.

### 9.1 Branding

**Company Branding Settings:**
```
Company Information:
├── Company Name (full legal name)
├── Company Legal Name (if different)
├── Logo Upload
├── Favicon Upload
├── Company Website URL
├── Company Email
└── Year Founded

Color Scheme:
├── Primary Color (hex code)
├── Secondary Color (hex code)
├── Accent Color (hex code)
├── Text Color (hex code)
└── Preview (auto-updated)

Email Templates:
├── Email Header (with logo)
├── Footer (with links, contact)
├── Color Scheme (matches branding)
├── Unsubscribe Link
└── Preview

System Branding:
├── Application Title (display name)
├── Logo on Login Page
├── Logo on Dashboard
├── Theme: Light / Dark / Auto
└── Custom CSS (optional)

Contact & Address:
├── Address: [Full Address]
├── Phone: [Multiple phone numbers]
├── Email: [Multiple emails]
├── Website: [URL]
└── Social Media: [Links]
```

### 9.2 Branches

**Branch Management:**
```
Branch Information:
├── Branch Code (unique, e.g., DXB-01, CAI-02)
├── Branch Name (e.g., Dubai Main Office)
├── Status: Active / Inactive / Closed
└── Date Opened: [Date]

Location Details:
├── Country
├── City
├── Postal Code
├── Full Address
└── Google Maps Coordinates (optional)

Contact Information:
├── Branch Manager (Employee dropdown)
├── Phone Number(s)
├── Email Address(es)
├── Fax (if applicable)
└── Contact Person

Operational Details:
├── Time Zone
├── Working Days (M-F, includes Saturday?)
├── Working Hours: [From Time] - [To Time]
├── Attendance Location: [GPS coordinates for check-in]
└── Currency: [Currency code]

Department Count: X
Employee Count: X
```

**Branch List View:**
| Code | Name | City | Manager | Status | Employees | Depts | Actions |
|------|------|------|---------|--------|-----------|-------|---------|

### 9.3 Departments

**Department Setup:**
```
Department Information:
├── Department Code (unique, e.g., HR-001, IT-001)
├── Department Name (e.g., Human Resources)
├── Description (purpose and responsibilities)
├── Type: Operational / Non-Operational
├── Status: Active / Inactive / On Hold
└── Department Head (Employee dropdown - Manager)

Organizational Hierarchy:
├── Parent Department (if any)
├── Sub-Departments (list)
└── Branch (Dropdown - which branch this dept belongs to)

Policies:
├── Cost Center (for accounting)
├── Budget (if applicable)
├── Leave Approver (role/person)
└── Overtime Approver (role/person)

Reporting Structure:
├── Head of Department
├── Deputy Head
├── Team Members Count: X
└── Reporting Lines Map
```

**Department List View:**
| Code | Name | Type | Branch | Head | Status | Employees | Sub-Depts |
|------|------|------|--------|------|--------|-----------|-----------|

### 9.4 Job Titles

**Job Title Configuration:**
```
Job Title Information:
├── Job Code (unique, e.g., JT-001)
├── Job Title Name (e.g., Senior Teacher)
├── Description (key responsibilities)
├── Job Category: Teaching / Administrative / Support / Management / Other
├── Status: Active / Inactive / Deprecated
└── Applicable Department(s) (multi-select)

Position Type:
├── Full-Time
├── Part-Time
├── Seasonal
├── Contract
└── Intern

Work Schedule Based on Category:
├── WhiteCollar → 08:00 to 17:00
├── BlueCollar → 07:30 to 16:30
├── Management → 09:00 to 18:00
└── PartTime → Flexible

Salary Band:
├── Minimum Salary: $XXXX
├── Maximum Salary: $XXXX
├── Standard Salary: $XXXX
└── Currency

Required Qualifications:
├── Education Level (Dropdown)
├── Specific Certifications
├── Experience (years)
└── Languages Required

Reporting To:
├── Direct Manager Job Title (Dropdown)
├── Approval Authority (for leaves, etc)
└── Alternative Approver

Employees in This Role: X
```

**Job Title List View:**
| Code | Title | Type | Category | Dept | Min/Max Salary | Positions Filled | Status |
|------|-------|------|----------|------|----------------|------------------|--------|

### 9.5 Month Ranges (Payroll Periods)

**Payroll Month Configuration:**
```
Payroll Period Setup:

Period: [Month] [Year]
├── Start Date: [Date]
├── End Date: [Date]
├── Attendance Cutoff Date: [Date]
├── Final Approval Deadline: [Date]
├── Payment Date: [Date]
└── Status: Open / Locked / Paid / Archived

Configuration:
├── Period Name: [e.g., "January 2026"]
├── Fiscal Month: [1-12]
├── Fiscal Year: [2026]
├── Is Payroll Month: Yes / No
└── Is Leave Month: Yes / No (for leave anniversary)

Attendance Rules for Period:
├── Holiday Dates: [List dates to exclude]
├── Special Working Days: [Dates that count as working]
├── Late Deduction Applies: Yes/No
├── Absence Deduction Applies: Yes/No
└── Saturday Bonus Applies: Yes/No

Processing:
├── Attendance Confirmed: Yes/No
├── Bonuses Entered: Yes/No
├── Insurance Deductions Applied: Yes/No
├── Payroll Calculated: Yes/No
├── Approved By: [Manager name, date]
└── Payment Status: Pending / Processed / Paid / Archived
```

**Payroll Period Calendar:**
| Jan 2026 | Feb 2026 | Mar 2026 | Apr 2026 | May 2026 |
|----------|----------|----------|----------|----------|
| 1-31 | 1-28 | 1-31 | 1-30 | 1-31 |
| Status: Open | Locked | Paid | Archived | Open |

### 9.6 Attendance Rules

**Category-Based Rules:**
```
Rule Set Per Category:

WhiteCollar:
├── Expected Start Time: 08:00
├── Late After: 08:00 (any minute after is late)
├── Working Hours: 09:00 (9 hours per day)
├── Overtime Applicable: Yes/No
├── Break Time: 01:00 (1 hour)
└── Late Deduction: 1st 60 mins free, then 1 day per 60 mins

BlueCollar:
├── Expected Start Time: 07:30
├── Late After: 07:30
├── Working Hours: 09:00 (9 hours)
├── Overtime Applicable: Yes/No
├── Break Time: 00:30 (30 mins)
└── Late Deduction: 1st 60 mins free, then 1 day per 60 mins

Management:
├── Expected Start Time: 09:00
├── Late After: 09:00
├── Working Hours: 08:00 (flexible)
├── Overtime Applicable: No
├── Break Time: 01:00
└── Late Deduction: Flexible (manager approval)

PartTime:
├── Expected Start Time: Varies (per schedule)
├── Late After: [Configurable]
├── Working Hours: [Variable]
├── Overtime Applicable: Yes/No
├── Break Time: [Configurable]
└── Late Deduction: Manual entry

Saturday Rules:
├── Saturday is Working Day: Yes / No
├── Saturday Bonus Applicable: Yes / No
├── Bonus Amount (Helper): $200
├── Bonus Amount (Cleaner): $100
├── Mandatory Attendance: Yes / No
└── Voluntary Participation: Yes / No
```

---

## MODULE 10: WEBSITE CMS

### Purpose
Manage landing page and custom website pages without coding.

### Website CMS Home Page

**Page Builder Interface:**
```
Home Page Editor:
├── Page Settings
│   ├── Page Title
│   ├── Page Description (META)
│   ├── Page Slug (URL)
│   ├── SEO Keywords
│   ├── Featured Image
│   └── Status: Draft / Published

Page Sections (Drag & Drop):
├── Hero Section
│   ├── Title
│   ├── Subtitle
│   ├── Background Image
│   ├── CTA Button (text & link)
│   └── Overlay (transparency)
│
├── Features Section
│   ├── Section Title
│   ├── Description
│   ├── Feature Cards (up to 6)
│   │   ├── Icon (from icon library)
│   │   ├── Title
│   │   ├── Description
│   │   └── Link/CTA (optional)
│   └── Background Color/Image
│
├── About Section
│   ├── Title
│   ├── Description (rich text editor)
│   ├── Image (left/right layout)
│   ├── Button (CTA)
│   └── Background
│
├── Testimonials Section
│   ├── Section Title
│   ├── Testimonial Cards (carousel)
│   │   ├── Quote Text
│   │   ├── Author Name
│   │   ├── Author Title
│   │   ├── Author Photo
│   │   └── Rating (stars)
│   └── Navigation (auto/manual)
│
├── Team Section
│   ├── Section Title
│   ├── Team Members (grid)
│   │   ├── Photo
│   │   ├── Name
│   │   ├── Position
│   │   ├── Bio
│   │   └── Social Links
│   └── Layout (2/3/4 columns)
│
├── FAQ Section
│   ├── Section Title
│   ├── FAQ Items (accordion)
│   │   ├── Question
│   │   ├── Answer (rich text)
│   │   └── Category
│   └── Search Functionality (Yes/No)
│
├── Footer
│   ├── Company Info
│   ├── Quick Links
│   ├── Contact Info
│   ├── Social Links
│   ├── Newsletter Signup
│   └── Copyright Text
```

### Custom Pages

**Create Custom Page:**
```
Page Details:
├── Page Title
├── Page Slug (URL)
├── Meta Description
├── Keywords
├── Status: Draft / Published
├── Visibility: Public / Private / Restricted Roles
└── Parent Page (if nested)

Page Content:
├── Rich Text Editor
├── Image Gallery
├── Video Embed
├── Form Embed
├── Custom Blocks
└── Section Layout (1/2/3 column)

Publishing:
├── Schedule Publish Date: [Date]
├── Auto-Update: Yes/No
└── Revision History (versioning)
```

### Website CMS Features

**Page Management:**
- Drag-drop builder interface
- Pre-built templates
- Live preview
- Mobile responsive preview
- Version history & rollback
- Page publishing workflow
- Scheduled publishing
- Multi-language support (future)

**Content Management:**
- Media library (images, videos)
- File manager
- SEO optimization tools
- Link checker
- Analytics integration
- Admin roles for page management

---

## MODULE 11: SETTINGS

### Purpose
System administration, configuration, and overall settings management.

### 11.1 System Users

**User Management:**
```
User Profile:
├── User ID (auto-generated)
├── Username (unique)
├── Full Name
├── Email Address (for notifications)
├── Phone Number
├── Profile Picture

User Assignment:
├── Employee Link (linked to employee record)
├── Role (Dropdown - admin, HR Manager, etc)
├── Department (optional)
├── Branch (if branch-specific)
└── Status: Active / Inactive / Suspended

Login Information:
├── Last Login: [Date/Time]
├── Login Attempts (failed): X
├── Account Status: Enabled / Disabled / Locked
├── Password Last Changed: [Date]
├── Force Password Change Next Login: Yes/No
└── 2FA Enabled: Yes/No (future)

Permissions (auto-assigned by Role):
├── Modules Access (checked list)
├── Feature Access (checked list)
├── Data Access Level (Full / Branch / Department / Own Only)
└── Special Permissions (custom)

Activity:
├── Created On: [Date/Time]
├── Created By: [User]
├── Last Modified: [Date/Time]
├── Last Modified By: [User]
```

**User List View:**
| ID | Name | Email | Role | Branch | Last Login | Status | Actions |
|----|------|-------|------|--------|-----------|--------|---------|

### 11.2 Roles & Permissions

**Roles Definition:**
```
Predefined Roles:

1. System Admin
   ├── Access: All modules, all features
   ├── Data: All data across all branches
   ├── Users: Create/Edit/Delete users
   ├── Settings: Full access to all system settings
   └── Permissions: All granted

2. HR Manager
   ├── Access: Employees, Attendance, Leaves, Payroll, Benefits
   ├── Data: All branches (or assigned branch)
   ├── Users: Cannot manage users
   ├── Settings: Limited settings
   └── Permissions: View/Create/Edit/Approve (except delete)

3. Finance Manager
   ├── Access: Payroll, Bonuses, Insurance, Reports
   ├── Data: All branches
   ├── Users: Cannot manage users
   ├── Settings: Limited settings (payroll config only)
   └── Permissions: View/Edit (payroll only)

4. Supervisor/Manager
   ├── Access: Attendance, Leaves (team only), Reports
   ├── Data: Own branch / department only
   ├── Users: Cannot manage users
   ├── Settings: None
   └── Permissions: View/Approve (team data)

5. Employee (Self-Service)
   ├── Access: Profile, Leave Request, Payroll Slip, Attendance
   ├── Data: Own data only
   ├── Users: Cannot manage
   ├── Settings: None
   └── Permissions: View/Update (own data)

6. Viewer (Audit/Consulta)
   ├── Access: All modules (read-only)
   ├── Data: All data
   ├── Users: Cannot manage
   ├── Settings: None
   └── Permissions: View Only

Custom Roles:
├── Create New Role
├── Select Permissions Per Module
├── Assign to Users
└── Clone from Existing Role
```

**Permission Matrix:**
```
Modules:   Dashboard | Employees | Attendance | Leaves | Payroll | ... 
Role/Perm:
  View        ✓  ✓  ✓  ✓  ✓
  Create      ✓  ✓     ✓  ✓
  Edit        ✓  ✓  ✓  ✓  ✓
  Delete      ✓           ✓
  Approve     ✓        ✓  ✓
  Export      ✓  ✓  ✓  ✓  ✓
  Import         ✓  ✓     ✓
```

### 11.3 System Configuration

**System-Wide Settings:**
```
General Settings:
├── Application Name
├── Application Description
├── Timezone (Default timezone for all users)
├── Date Format (DD/MM/YYYY or MM/DD/YYYY)
├── Time Format (12-hour or 24-hour)
├── Currency (Default currency): [Code]
├── Language: [English, Arabic, etc]
├── Fiscal Year Start Date: [Date]
└── Fiscal Year End Date: [Date]

Working Days Setup:
├── Working Days (M-F, include Saturday?)
├── Weekend Days (S-S or S only)
├── Public Holidays (list with dates)
├── Company Holidays (list with dates)
└── Special Rules (if any)

Financial Year / Payroll Year:
├── Financial Year Start: [Date]
├── Financial Year End: [Date]
├── Payroll Frequency: Monthly / Bi-weekly / Weekly
├── Payroll Date (of month): [Day]
├── Payment Method: Bank Transfer / Cash / Both
└── Currency Rounding: 2 decimals

Leave Settings:
├── Leave Eligibility After: 3 months (fixed)
├── Annual Leave: 15 days (fixed)
├── Emergency Leave: 6 days (fixed)
├── Sick Leave: 5 days (fixed)
├── Carry Forward: X days allowed
└── Unpaid Leave: Allowed (Yes/No)

Overtime Settings:
├── Overtime Rate: X% of daily rate
├── Minimum Overtime: 1 hour
├── Overtime Applicable Roles: [Checkboxes]
└── Overtime Approval Required: Yes/No

Late & Absence:
├── First X Minutes No Deduction: 60 minutes (fixed)
├── Then Deduction: 1 day per 60 minutes (fixed)
├── Absence Deduction: At daily rate
└── Excuse Deduction: None (fixed)

Saturday Rules:
├── Saturday is Working Day: Yes/No
├── Saturday Bonus for Helpers: $200 (configurable)
├── Saturday Bonus for Cleaners: $100 (configurable)
└── Overtime on Saturday: [Settings]

Insurance Auto-Setup:
├── Social Insurance %: 11.25% (employee) / 19% (employer)
├── Medical Insurance - Enable: Yes/No
├── Mandatory Insurance: Yes/No
└── Insurance Opt-Out Allowed: Yes/No

Notification Settings:
├── Email Notifications: Enabled/Disabled
├── SMS Notifications: Enabled/Disabled
├── In-App Notifications: Enabled/Disabled
├── Leave Approval Notifications: To [Roles]
├── Payroll Ready Notifications: To [Roles]
└── Late Incident Notifications: To [Roles]
```

### 11.4 OAuth Settings

**Social Login Configuration:**
```
Google OAuth:
├── Enable Google Login: Yes / No
├── Google Client ID: [Paste ID]
├── Google Client Secret: [Paste Secret]
├── Redirect URL: [Auto-generated]
└── Test Connection: [Button]

Facebook OAuth (Optional):
├── Enable Facebook Login: Yes / No
├── App ID: [Paste]
├── App Secret: [Paste]
├── Redirect URL: [Auto-generated]
└── Test Connection: [Button]

Microsoft/Office365 (Optional):
├── Enable Microsoft Login: Yes / No
├── Client ID: [Paste]
├── Client Secret: [Paste]
├── Redirect URL: [Auto-generated]
└── Test Connection: [Button]

Email Verification:
├── Require Email Verification: Yes / No
├── Auto-create User on Social Login: Yes / No
├── Link Social to Existing User: Yes / No
└── Default Role for New Users: [Dropdown]
```

### 11.5 Backup & Restore

**Backup Management:**
```
Automatic Backups:
├── Enable Auto-Backup: Yes / No
├── Backup Frequency: Daily / Weekly / Monthly
├── Backup Time: [HH:MM]
├── Retention Days: X days (keep last X backups)
├── Backup Location: Cloud / Local / Both
├── Encryption: Yes / No
└── Last Backup: [Date/Time]

Manual Backup:
├── [Button: "Create Backup Now"]
├── Backup Name: [Required field]
├── Description: [Optional]
├── Include Options:
│   ├── Database (Yes/No)
│   ├── Uploaded Files (Yes/No)
│   ├── Configuration (Yes/No)
│   └── User Data (Yes/No)
└── Status: [In Progress / Complete / Failed]

Backup List:
```
| Date | Size | Type | Status | Actions |
|------|------|------|--------|---------|

**Restore:**
```
Restore Backup:
├── Select Backup: [Dropdown - list of backups]
├── Backup Details: [Display info]
├── Restore Options:
│   ├── Restore Full Database: Yes/No
│   ├── Restore Files: Yes/No
│   ├── Overwrite Existing Data: Yes/No
│   └── Keep Current Users: Yes/No
├── Confirmation: [Warning message]
├── [Button: "Start Restore"]
└── Progress: [Progress bar]

Restore History:
| Date | Backup | Status | Restored By | Duration |
```

### 11.6 Notification Settings

**Email & System Notifications:**
```
Notification Types to Configure:

Leave Notifications:
├── New Leave Request: [To: HR Manager, Finance Manager]
├── Leave Approved: [To: Employee]
├── Leave Rejected: [To: Employee]
├── Leave About to End: [To: Employee]
└── Enable Email: Yes/No

Attendance Notifications:
├── On Absent: [To: Manager, HR]
├── On Late: [To: Employee, Manager]
├── Late Incident Summary: [To: HR Manager]
└── Enable Email: Yes/No

Payroll Notifications:
├── Payroll Ready: [To: Finance, HR Manager]
├── Salary Slip Generated: [To: Employee]
├── Bonus Added: [To: Employee]
└── Enable Email: Yes/No

Insurance Notifications:
├── Enrollment Confirmed: [To: Employee]
├── Premium Due: [To: Finance Manager]
└── Renewal Reminder: [To: HR Manager]

System Notifications:
├── Backup Complete: [To: Admin]
├── Backup Failed: [To: Admin] [Also: SMS]
├── User Login: [To: Admin] [Log only]
└── Failed Login Attempts: [To: Admin]

Email Settings:
├── Sender Email: [configured email]
├── Sender Name: [Company name]
├── SMTP Server: [smtp.provider.com]
├── SMTP Port: [587 or 465]
├── SMTP Username: [Email]
├── SMTP Password: [Password]
├── Encryption: TLS / SSL / None
└── Test Email: [Button to test]

SMS Settings (if available):
├── SMS Provider: [Twilio / AWS SNS / etc]
├── API Key: [Paste]
├── Sender ID: [Company name or number]
└── Test SMS: [Button to test]
```

### 11.7 System Reset / Data Management

**Data Management Options:**
```
CAUTION - Dangerous Operations:

Reset System:
├── Clear All Data: [Checkbox - requires confirmation]
├── Reset to Default Settings: [Checkbox]
├── Remove All Users (except Admin): [Checkbox]
├── Delete All Employee Records: [Checkbox]
├── Description: [Show what will be deleted]
├── Confirmation: [Type "CONFIRM" to proceed]
└── [Button: "Reset System"]

Archive Old Data:
├── Archive Before Date: [Date picker]
├── Data to Archive:
│   ├── Attendance Records: Yes/No
│   ├── Leave Records: Yes/No
│   ├── Payroll Records: Yes/No
│   ├── Bonus Records: Yes/No
│   └── User Logs: Yes/No
├── Archive Format: PDF / Excel / CSV
└── [Button: "Archive Data"]

Data Export:
├── Export All Data: [Button]
├── Export Format: Excel / CSV / JSON
├── Include:
│   ├── Employee Data: Yes/No
│   ├── Attendance Data: Yes/No
│   ├── Payroll Data: Yes/No
│   ├── Configuration: Yes/No
│   └── User Activity Logs: Yes/No
└── [Button: "Export Now"]

Audit Logs/Activity:
├── View System Logs: [Button]
├── Filter by:
│   ├── Date Range
│   ├── User
│   ├── Action Type (Create/Edit/Delete/View)
│   ├── Module
│   └── Status (Success/Failed)
├── Logs Display:
│   ├── Timestamp
│   ├── User
│   ├── Action
│   ├── Module
│   └── Details
└── Export Logs: [Button to export audit trail]
```

---

## MODULE PERMISSIONS MATRIX

**Quick Reference - Who Can Do What:**

| Action | Admin | HR Mgr | Finance | Supervisor | Employee | Viewer |
|--------|-------|--------|---------|-----------|----------|--------|
| View Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage Employees | ✓ | ✓ | | | | |
| Mark Attendance | ✓ | ✓ | | ✓ | | |
| Approve Leaves | ✓ | ✓ | | ✓ | | |
| Request Leave | ✓ | ✓ | ✓ | ✓ | ✓ | |
| View Payroll | ✓ | ✓ | ✓ | | ✓ (own) | |
| Process Payroll | ✓ | ✓ | ✓ | | | |
| Manage Insurance | ✓ | ✓ | ✓ | | | |
| View Insurance | ✓ | ✓ | ✓ | | ✓ (own) | |
| Organization Setup | ✓ | ✓ | | | | |
| Website CMS | ✓ | | | | | |
| System Settings | ✓ | | | | | |
| Backup/Restore | ✓ | | | | | |
| Manage Users | ✓ | | | | | |

---

**Version:** 1.0  
**Status:** Ready for Development  
**Next Phase:** Phase 2 - Landing Page Implementation  

