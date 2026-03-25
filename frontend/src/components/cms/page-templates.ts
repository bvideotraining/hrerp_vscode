'use client';

import { ContentBlock } from '@/lib/services/cms.service';

// ─── Helper ──────────────────────────────────────────────────────────────────

let _counter = 0;
function bid() {
  _counter++;
  return `tpl_${Date.now()}_${_counter}_${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Shared Footer ──────────────────────────────────────────────────────────

const SHARED_FOOTER: ContentBlock = {
  id: bid(),
  type: 'footer',
  order: 99,
  data: {
    template: 'columns',
    companyName: 'HR ERP System',
    description: 'Enterprise-grade Human Resource Management platform that streamlines your workforce operations.',
    copyright: `© ${new Date().getFullYear()} HR ERP System. All rights reserved.`,
    links: [
      { label: 'Privacy Policy', url: '/pages/privacy' },
      { label: 'Terms of Service', url: '/pages/terms' },
    ],
    columns: [
      {
        title: 'Product',
        links: [
          { label: 'Features', url: '/pages/features' },
          { label: 'Benefits', url: '/pages/benefits' },
          { label: 'Modules', url: '/pages/modules' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'About Us', url: '/pages/home' },
          { label: 'Contact', url: '/pages/contact-us' },
          { label: 'Careers', url: '#' },
        ],
      },
      {
        title: 'Support',
        links: [
          { label: 'Documentation', url: '#' },
          { label: 'Help Center', url: '#' },
          { label: 'Status', url: '#' },
        ],
      },
    ],
    socialLinks: [
      { platform: 'linkedin', url: '#' },
      { platform: 'twitter', url: '#' },
      { platform: 'facebook', url: '#' },
    ],
  },
};

// ─── Template Interface ──────────────────────────────────────────────────────

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string; // emoji as thumbnail
  category: string;
  pageData: {
    title: string;
    slug: string;
    description: string;
    showInMenu: boolean;
    menuOrder: number;
    blocks: ContentBlock[];
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// TEMPLATE 1: HOME PAGE
// ═════════════════════════════════════════════════════════════════════════════

const HOME_PAGE: PageTemplate = {
  id: 'home',
  name: 'Home Page',
  description: 'Full landing page matching the current home page — hero, highlights, features, modules, and footer',
  thumbnail: '🏠',
  category: 'Essential',
  pageData: {
    title: 'Home',
    slug: 'home',
    description: 'Main landing page for the HR ERP system',
    showInMenu: true,
    menuOrder: 1,
    blocks: [
      // ── Hero ───────────────────────────────────────────────────────────
      {
        id: bid(),
        type: 'hero',
        order: 0,
        data: {
          template: 'centered',
          title: 'Complete HR Management System for Modern Organizations',
          subtitle:
            'Manage employees, attendance, payroll, leaves, bonuses, insurance, and organizational setup all in one unified platform. Designed for multi-branch nurseries and international organizations.',
          buttonText: 'Get Started',
          buttonLink: '/login',
          backgroundImage: '',
          overlayColor: '',
        },
      },

      // ── Highlights (4 checkmarks) ──────────────────────────────────────
      {
        id: bid(),
        type: 'richtext',
        order: 1,
        data: {
          html: `<div style="background:#f0fdf4; border-radius:12px; padding:28px 32px; margin:0 auto; max-width:720px;">
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
    <div style="display:flex; align-items:center; gap:10px;"><span style="color:#16a34a; font-size:1.2em; flex-shrink:0;">✓</span><span style="color:#334155; font-size:0.95em;">Multi-branch Employee Management</span></div>
    <div style="display:flex; align-items:center; gap:10px;"><span style="color:#16a34a; font-size:1.2em; flex-shrink:0;">✓</span><span style="color:#334155; font-size:0.95em;">Automated Payroll Processing</span></div>
    <div style="display:flex; align-items:center; gap:10px;"><span style="color:#16a34a; font-size:1.2em; flex-shrink:0;">✓</span><span style="color:#334155; font-size:0.95em;">Real-time Attendance Tracking</span></div>
    <div style="display:flex; align-items:center; gap:10px;"><span style="color:#16a34a; font-size:1.2em; flex-shrink:0;">✓</span><span style="color:#334155; font-size:0.95em;">Leave &amp; Insurance Management</span></div>
  </div>
</div>`,
        },
      },

      // ── Features (8 cards, 2 cols) ─────────────────────────────────────
      {
        id: bid(),
        type: 'cards',
        order: 2,
        data: {
          heading: 'Why Choose HR ERP?',
          columns: 2,
          cards: [
            {
              icon: 'Zap',
              title: 'Automated Payroll',
              text: 'Salary calculations with deductions, bonuses, and insurance integration. One-click payroll processing for every month.',
            },
            {
              icon: 'Lock',
              title: 'Enterprise Security',
              text: '7-layer security framework with role-based access control, encryption, and comprehensive audit logs.',
            },
            {
              icon: 'BarChart3',
              title: 'Real-time Analytics',
              text: 'Dashboard with KPIs, attendance metrics, salary insights, and custom reports for data-driven decisions.',
            },
            {
              icon: 'Globe',
              title: 'Multi-branch Support',
              text: 'Manage multiple branches globally with branch-specific configurations and unified reporting.',
            },
            {
              icon: 'Smartphone',
              title: 'Mobile Ready',
              text: 'Responsive design works perfectly on desktop, tablet, and mobile devices. Access anywhere, anytime.',
            },
            {
              icon: 'Cpu',
              title: 'AI-Powered (Future)',
              text: 'Built with scalability for AI integration to predict attrition, suggest benefits, and optimize scheduling.',
            },
            {
              icon: 'Database',
              title: 'Cloud Based',
              text: 'Hosted on Firebase and Vercel for 99.9% uptime, automatic backups, and zero infrastructure management.',
            },
            {
              icon: 'Users',
              title: 'Team Collaboration',
              text: 'Built-in approval workflows, notifications, and team features for seamless HR operations.',
            },
          ],
        },
      },

      // ── Stats row ─────────────────────────────────────────────────────
      {
        id: bid(),
        type: 'richtext',
        order: 3,
        data: {
          html: `<div style="background:#f8fafc; padding:40px 32px; border-radius:16px; margin:8px 0;">
  <div style="display:flex; justify-content:center; gap:48px; flex-wrap:wrap; text-align:center;">
    <div><div style="font-size:2.5em; font-weight:bold; color:#2563eb;">11</div><div style="color:#64748b; font-size:0.9em; margin-top:4px;">Powerful Modules</div></div>
    <div><div style="font-size:2.5em; font-weight:bold; color:#2563eb;">100+</div><div style="color:#64748b; font-size:0.9em; margin-top:4px;">API Endpoints</div></div>
    <div><div style="font-size:2.5em; font-weight:bold; color:#2563eb;">99.9%</div><div style="color:#64748b; font-size:0.9em; margin-top:4px;">Uptime SLA</div></div>
  </div>
</div>`,
        },
      },

      // ── Modules showcase (11 cards, 3 cols) ───────────────────────────
      {
        id: bid(),
        type: 'cards',
        order: 4,
        data: {
          heading: '11 Powerful Modules',
          columns: 3,
          cards: [
            {
              icon: 'BarChart3',
              title: 'Dashboard',
              text: 'Real-time analytics and KPIs including payroll estimates, pending leaves, attendance metrics, and salary insights.',
            },
            {
              icon: 'Users',
              title: 'Employees',
              text: 'Complete employee master data with profiles, documents, employment history, and status tracking.',
            },
            {
              icon: 'Clock',
              title: 'Attendance',
              text: 'Daily attendance tracking with automated late calculation, absence management, and Saturday bonus tracking.',
            },
            {
              icon: 'Calendar',
              title: 'Leaves',
              text: 'Comprehensive leave management with request workflow, balance tracking, and approval process for multiple leave types.',
            },
            {
              icon: 'Banknote',
              title: 'Payroll',
              text: 'Automated monthly salary calculation with deductions, bonuses, insurance contributions, and salary slips generation.',
            },
            {
              icon: 'Gift',
              title: 'Bonuses',
              text: 'Track and manage all employee bonuses including Saturday, duty, training, and performance bonuses.',
            },
            {
              icon: 'Shield',
              title: 'Social Insurance',
              text: 'Manage social insurance enrollment with automatic 11.25% employee and 19% employer contribution deductions.',
            },
            {
              icon: 'Heart',
              title: 'Medical Insurance',
              text: 'Medical insurance plan management with family member coverage and premium deduction integration.',
            },
            {
              icon: 'Building2',
              title: 'Organization',
              text: 'Organization structure setup including branding, branches, departments, job titles, and attendance rules.',
            },
            {
              icon: 'Globe',
              title: 'Website CMS',
              text: 'Public website management with landing page builder, custom pages, and content management without coding.',
            },
            {
              icon: 'Settings',
              title: 'Settings',
              text: 'System administration with user management, roles/permissions, OAuth setup, backup/restore, and system configuration.',
            },
          ],
        },
      },

      // ── CTA ───────────────────────────────────────────────────────────
      {
        id: bid(),
        type: 'richtext',
        order: 5,
        data: {
          html: `<div style="text-align:center; background:linear-gradient(135deg,#eff6ff,#f0fdf4); border-radius:16px; padding:48px 32px; margin:8px 0;">
  <h2 style="font-size:1.75em; font-weight:bold; color:#1e293b; margin-bottom:12px;">Ready to Transform Your HR Operations?</h2>
  <p style="font-size:1.05em; color:#64748b; margin-bottom:24px;">Get started today. Reach out to our team for a demo.</p>
  <a href="/pages/contact-us" style="display:inline-block; padding:14px 32px; background:#2563eb; color:#ffffff; border-radius:8px; text-decoration:none; font-weight:600; font-size:1em;">Contact Sales Team</a>
</div>`,
        },
      },

      // ── Footer ────────────────────────────────────────────────────────
      { ...SHARED_FOOTER, id: bid(), order: 6 },
    ],
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2: APPLICATION FEATURES
// ═════════════════════════════════════════════════════════════════════════════

const FEATURES_PAGE: PageTemplate = {
  id: 'features',
  name: 'Application Features',
  description: 'Showcase all application features with icons, descriptions, and visual sections',
  thumbnail: '⚡',
  category: 'Product',
  pageData: {
    title: 'Features',
    slug: 'features',
    description: 'Explore all features of the HR ERP system',
    showInMenu: true,
    menuOrder: 2,
    blocks: [
      {
        id: bid(),
        type: 'hero',
        order: 0,
        data: {
          template: 'centered',
          title: 'Powerful Features for Modern HR',
          subtitle: 'Every tool you need to manage your workforce efficiently — from hiring to retirement, all in one integrated platform.',
          buttonText: 'See All Modules',
          buttonLink: '/pages/modules',
          backgroundImage: '',
          overlayColor: '',
        },
      },
      {
        id: bid(),
        type: 'cards',
        order: 1,
        data: {
          heading: 'Core Platform Features',
          columns: 3,
          cards: [
            { icon: 'Users', title: 'Employee Directory', text: 'Centralized employee database with profiles, documents, emergency contacts, and complete employment history at your fingertips.' },
            { icon: 'Fingerprint', title: 'Biometric Integration', text: 'Seamlessly connect with fingerprint scanners, facial recognition, and RFID card systems for automated attendance tracking.' },
            { icon: 'BarChart3', title: 'Advanced Analytics', text: 'Interactive dashboards with real-time KPIs, trend analysis, headcount reports, and customizable chart widgets.' },
            { icon: 'FileText', title: 'Document Management', text: 'Securely store and manage employment contracts, ID copies, certificates, and performance reviews with version control.' },
            { icon: 'Bell', title: 'Smart Notifications', text: 'Automated alerts for contract expirations, probation endings, birthday reminders, and important HR deadlines.' },
            { icon: 'Download', title: 'Export & Reporting', text: 'Generate professional PDF and Excel reports with one click. Export any data set with customizable field selection.' },
          ],
        },
      },
      {
        id: bid(),
        type: 'richtext',
        order: 2,
        data: {
          html: `
            <div style="background: #f8fafc; border-radius: 16px; padding: 40px; margin: 20px 0;">
              <h2 style="font-size: 1.75em; font-weight: bold; color: #1e293b; text-align: center; margin-bottom: 32px;">Workflow Automation</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 800px; margin: 0 auto;">
                <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
                  <h3 style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">🔄 Leave Requests</h3>
                  <p style="color: #64748b; font-size: 0.9em; line-height: 1.6;">Submit, approve, and track leave requests with multi-level approval workflows and automatic balance calculations.</p>
                </div>
                <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
                  <h3 style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">📋 Onboarding Checklists</h3>
                  <p style="color: #64748b; font-size: 0.9em; line-height: 1.6;">Automated task assignment for new hires with progress tracking, document collection, and orientation scheduling.</p>
                </div>
                <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
                  <h3 style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">💰 Payroll Processing</h3>
                  <p style="color: #64748b; font-size: 0.9em; line-height: 1.6;">End-to-end payroll automation with tax calculations, deductions, overtime, and bank transfer file generation.</p>
                </div>
                <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
                  <h3 style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">📊 Performance Reviews</h3>
                  <p style="color: #64748b; font-size: 0.9em; line-height: 1.6;">360-degree reviews, goal setting, competency assessments, and development plans with configurable review cycles.</p>
                </div>
              </div>
            </div>
          `,
        },
      },
      {
        id: bid(),
        type: 'cards',
        order: 3,
        data: {
          heading: 'Security & Compliance',
          columns: 4,
          cards: [
            { icon: 'Lock', title: 'Role-Based Access', text: 'Granular permissions ensure employees only see what they need.' },
            { icon: 'Shield', title: 'Data Encryption', text: 'AES-256 encryption at rest and TLS 1.3 for data in transit.' },
            { icon: 'Eye', title: 'Audit Trail', text: 'Complete log of every change with timestamps and user tracking.' },
            { icon: 'Cloud', title: 'Auto Backups', text: 'Continuous backups with point-in-time recovery and disaster protection.' },
          ],
        },
      },
      { ...SHARED_FOOTER, id: bid(), order: 4 },
    ],
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3: APPLICATION BENEFITS
// ═════════════════════════════════════════════════════════════════════════════

const BENEFITS_PAGE: PageTemplate = {
  id: 'benefits',
  name: 'Application Benefits',
  description: 'Highlight business value, ROI metrics, and advantages over traditional HR methods',
  thumbnail: '🎯',
  category: 'Product',
  pageData: {
    title: 'Benefits',
    slug: 'benefits',
    description: 'Discover the benefits of using our HR platform',
    showInMenu: true,
    menuOrder: 3,
    blocks: [
      {
        id: bid(),
        type: 'hero',
        order: 0,
        data: {
          template: 'gradient',
          title: 'The ROI of Smart HR Management',
          subtitle: 'Reduce operational costs, eliminate manual errors, and free up your HR team to focus on what truly matters — your people.',
          buttonText: 'Calculate Your Savings',
          buttonLink: '/pages/contact-us',
          backgroundImage: '',
          overlayColor: 'rgba(0,0,0,0.1)',
        },
      },
      {
        id: bid(),
        type: 'richtext',
        order: 1,
        data: {
          html: `
            <div style="text-align:center; padding: 40px 0 20px;">
              <h2 style="font-size: 2em; font-weight: bold; color: #1e293b; margin-bottom: 16px;">Measurable Business Impact</h2>
              <p style="color: #64748b; font-size: 1.1em; max-width: 600px; margin: 0 auto 40px;">Our clients see significant improvements across every HR metric within the first 90 days.</p>
              <div style="display: flex; justify-content: center; gap: 40px; flex-wrap: wrap;">
                <div style="background: #eff6ff; border-radius: 16px; padding: 32px; min-width: 200px;">
                  <div style="font-size: 2.5em; font-weight: bold; color: #2563eb;">75%</div>
                  <div style="color: #1e293b; font-weight: 600; margin-top: 4px;">Less Paperwork</div>
                  <div style="color: #64748b; font-size: 0.85em; margin-top: 4px;">Digital-first processes</div>
                </div>
                <div style="background: #f0fdf4; border-radius: 16px; padding: 32px; min-width: 200px;">
                  <div style="font-size: 2.5em; font-weight: bold; color: #16a34a;">60%</div>
                  <div style="color: #1e293b; font-weight: 600; margin-top: 4px;">Faster Payroll</div>
                  <div style="color: #64748b; font-size: 0.85em; margin-top: 4px;">Automated calculations</div>
                </div>
                <div style="background: #fefce8; border-radius: 16px; padding: 32px; min-width: 200px;">
                  <div style="font-size: 2.5em; font-weight: bold; color: #ca8a04;">90%</div>
                  <div style="color: #1e293b; font-weight: 600; margin-top: 4px;">Error Reduction</div>
                  <div style="color: #64748b; font-size: 0.85em; margin-top: 4px;">Validation & automation</div>
                </div>
                <div style="background: #fdf2f8; border-radius: 16px; padding: 32px; min-width: 200px;">
                  <div style="font-size: 2.5em; font-weight: bold; color: #db2777;">3x</div>
                  <div style="color: #1e293b; font-weight: 600; margin-top: 4px;">HR Productivity</div>
                  <div style="color: #64748b; font-size: 0.85em; margin-top: 4px;">Focus on strategy</div>
                </div>
              </div>
            </div>
          `,
        },
      },
      {
        id: bid(),
        type: 'cards',
        order: 2,
        data: {
          heading: 'Key Business Benefits',
          columns: 2,
          cards: [
            { icon: 'DollarSign', title: 'Reduce Operational Costs', text: 'Eliminate paper-based processes, reduce administrative overhead, and automate repetitive tasks. Companies save an average of 40% on HR operational costs in the first year.' },
            { icon: 'Clock', title: 'Save Valuable Time', text: 'Automate attendance tracking, leave approvals, and payroll processing. Your HR team gets back 20+ hours per week to focus on employee engagement and strategic initiatives.' },
            { icon: 'CheckCircle', title: 'Ensure Compliance', text: 'Stay compliant with labor laws, social insurance regulations, and tax requirements. Automatic updates keep you current with changing regulations across all jurisdictions.' },
            { icon: 'Target', title: 'Data-Driven Decisions', text: 'Replace gut feelings with real insights. Workforce analytics help you identify trends, predict turnover, optimize staffing, and measure the impact of HR initiatives.' },
            { icon: 'Heart', title: 'Improve Employee Experience', text: 'Self-service portals let employees view payslips, request leaves, update information, and access documents anytime from any device — boosting satisfaction and retention.' },
            { icon: 'Layers', title: 'Scale with Confidence', text: 'Whether you have 10 or 10,000 employees, the platform grows with you. Add new branches, departments, and modules without migration headaches or downtime.' },
          ],
        },
      },
      {
        id: bid(),
        type: 'richtext',
        order: 3,
        data: {
          html: `
            <div style="background: linear-gradient(135deg, #1e293b, #334155); border-radius: 16px; padding: 48px 40px; margin: 20px 0; color: white;">
              <h2 style="font-size: 1.75em; font-weight: bold; text-align: center; margin-bottom: 32px;">What Our Clients Say</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 800px; margin: 0 auto;">
                <div style="background: rgba(255,255,255,0.1); padding: 24px; border-radius: 12px;">
                  <p style="font-style: italic; color: #e2e8f0; line-height: 1.6; margin-bottom: 12px;">"We reduced our payroll processing time from 3 days to just 2 hours. The ROI was immediate and the support team is exceptional."</p>
                  <p style="color: #94a3b8; font-size: 0.9em;">— HR Director, Manufacturing Company</p>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 24px; border-radius: 12px;">
                  <p style="font-style: italic; color: #e2e8f0; line-height: 1.6; margin-bottom: 12px;">"Managing 5 branches was a nightmare. Now everything is centralized and our managers can focus on their teams instead of paperwork."</p>
                  <p style="color: #94a3b8; font-size: 0.9em;">— COO, Retail Chain</p>
                </div>
              </div>
            </div>
          `,
        },
      },
      { ...SHARED_FOOTER, id: bid(), order: 4 },
    ],
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// TEMPLATE 4: APPLICATION MODULES
// ═════════════════════════════════════════════════════════════════════════════

const MODULES_PAGE: PageTemplate = {
  id: 'modules',
  name: 'Application Modules',
  description: 'Detailed overview of each system module with icons and descriptions',
  thumbnail: '🧩',
  category: 'Product',
  pageData: {
    title: 'Modules',
    slug: 'modules',
    description: 'Explore all modules of the HR ERP system',
    showInMenu: true,
    menuOrder: 4,
    blocks: [
      {
        id: bid(),
        type: 'hero',
        order: 0,
        data: {
          template: 'centered',
          title: 'Complete HR Suite, Modular Design',
          subtitle: 'Pick the modules you need today and add more as you grow. Each module integrates seamlessly with the others for a unified HR experience.',
          buttonText: 'Request a Demo',
          buttonLink: '/pages/contact-us',
          backgroundImage: '',
          overlayColor: '',
        },
      },
      {
        id: bid(),
        type: 'cards',
        order: 1,
        data: {
          heading: 'Core Modules',
          columns: 3,
          cards: [
            { icon: 'Users', title: 'Employee Management', text: 'Complete employee lifecycle from onboarding to offboarding. Profiles, documents, contracts, job history, and organizational charts.' },
            { icon: 'Clock', title: 'Attendance & Time', text: 'Real-time attendance tracking with biometric integration, shift scheduling, overtime management, and automated reports.' },
            { icon: 'Calendar', title: 'Leave Management', text: 'Configure leave types, accrual policies, approval workflows, and holiday calendars. Employees self-serve via the portal.' },
          ],
        },
      },
      {
        id: bid(),
        type: 'cards',
        order: 2,
        data: {
          heading: 'Financial Modules',
          columns: 3,
          cards: [
            { icon: 'Banknote', title: 'Payroll Processing', text: 'Multi-currency payroll with automatic calculations for taxes, social insurance, deductions, overtime, and bonuses. Generate bank files instantly.' },
            { icon: 'Gift', title: 'Bonuses & Incentives', text: 'Configure bonus schemes, commission structures, and incentive programs. Track disbursements and measure impact on performance.' },
            { icon: 'Shield', title: 'Social Insurance', text: 'Automated GOSI/pension calculations, contribution tracking, and regulatory compliance. Generate government-ready reports.' },
          ],
        },
      },
      {
        id: bid(),
        type: 'cards',
        order: 3,
        data: {
          heading: 'Administration Modules',
          columns: 3,
          cards: [
            { icon: 'Heart', title: 'Medical Insurance', text: 'Manage health insurance plans, employee classifications, dependent coverage, and claims tracking across multiple providers.' },
            { icon: 'Building2', title: 'Organization Setup', text: 'Define company structure with branches, departments, job titles, employee categories, and reporting hierarchies.' },
            { icon: 'Globe', title: 'Website CMS', text: 'Build and manage your company careers page, announcements, and public-facing content with a drag-and-drop page builder.' },
          ],
        },
      },
      {
        id: bid(),
        type: 'richtext',
        order: 4,
        data: {
          html: `
            <div style="text-align: center; background: #f8fafc; border-radius: 16px; padding: 48px 32px; margin: 20px 0;">
              <h2 style="font-size: 1.75em; font-weight: bold; color: #1e293b; margin-bottom: 12px;">Additional Capabilities</h2>
              <p style="color: #64748b; font-size: 1.05em; margin-bottom: 32px;">Every module includes these built-in features</p>
              <div style="display: flex; justify-content: center; gap: 32px; flex-wrap: wrap; max-width: 700px; margin: 0 auto;">
                <div style="background: white; padding: 16px 24px; border-radius: 10px; border: 1px solid #e2e8f0;">📊 Real-time Analytics</div>
                <div style="background: white; padding: 16px 24px; border-radius: 10px; border: 1px solid #e2e8f0;">📥 Excel & PDF Export</div>
                <div style="background: white; padding: 16px 24px; border-radius: 10px; border: 1px solid #e2e8f0;">🔍 Advanced Search</div>
                <div style="background: white; padding: 16px 24px; border-radius: 10px; border: 1px solid #e2e8f0;">🔐 Role-Based Access</div>
                <div style="background: white; padding: 16px 24px; border-radius: 10px; border: 1px solid #e2e8f0;">📱 Mobile Responsive</div>
                <div style="background: white; padding: 16px 24px; border-radius: 10px; border: 1px solid #e2e8f0;">🔔 Smart Alerts</div>
              </div>
            </div>
          `,
        },
      },
      { ...SHARED_FOOTER, id: bid(), order: 5 },
    ],
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// TEMPLATE 5: CONTACT US
// ═════════════════════════════════════════════════════════════════════════════

const CONTACT_PAGE: PageTemplate = {
  id: 'contact-us',
  name: 'Contact Us',
  description: 'Contact form with honeypot protection, office info cards, and FAQ section',
  thumbnail: '📧',
  category: 'Essential',
  pageData: {
    title: 'Contact Us',
    slug: 'contact-us',
    description: 'Get in touch with our team',
    showInMenu: true,
    menuOrder: 6,
    blocks: [
      {
        id: bid(),
        type: 'hero',
        order: 0,
        data: {
          template: 'centered',
          title: 'Get in Touch',
          subtitle: 'Have questions about our HR platform? Our team is here to help. Reach out and we\'ll respond within 24 hours.',
          buttonText: '',
          buttonLink: '',
          backgroundImage: '',
          overlayColor: '',
        },
      },
      {
        id: bid(),
        type: 'cards',
        order: 1,
        data: {
          heading: 'How to Reach Us',
          columns: 3,
          cards: [
            { icon: 'Mail', title: 'Email Us', text: 'info@hrerpplatform.com\nFor support: support@hrerpplatform.com\nWe respond within 24 hours.' },
            { icon: 'Phone', title: 'Call Us', text: '+971 4 XXX XXXX\nSunday – Thursday\n9:00 AM – 6:00 PM (GST)' },
            { icon: 'MapPin', title: 'Visit Us', text: 'Business Bay, Dubai\nUnited Arab Emirates\nPO Box XXXXX' },
          ],
        },
      },
      {
        id: bid(),
        type: 'form',
        order: 2,
        data: {
          formTitle: 'Send Us a Message',
          formSubtitle: 'Fill out the form below and we\'ll get back to you shortly.',
          fields: [
            { id: bid(), type: 'text', label: 'Full Name', placeholder: 'Enter your full name', required: true, width: 'half' },
            { id: bid(), type: 'email', label: 'Email Address', placeholder: 'Enter your email', required: true, width: 'half' },
            { id: bid(), type: 'text', label: 'Company Name', placeholder: 'Enter your company name', required: false, width: 'half' },
            { id: bid(), type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false, width: 'half' },
            { id: bid(), type: 'select', label: 'Subject', placeholder: 'What is this regarding?', required: true, width: 'full', options: ['Sales Inquiry', 'Product Demo Request', 'Technical Support', 'Billing Question', 'Partnership', 'Other'] },
            { id: bid(), type: 'textarea', label: 'Message', placeholder: 'Type your message here...', required: true, width: 'full' },
          ],
          submitButtonText: 'Send Message',
          submitButtonColor: '#2563eb',
          submitButtonTextColor: '#ffffff',
          successMessage: 'Thank you for reaching out! We\'ll get back to you within 24 hours.',
          redirectUrl: '',
          destination: 'firestore',
          firestoreCollection: 'contact_submissions',
          enableHoneypot: true,
          formWidth: 'wide',
          backgroundColor: '#f8fafc',
          padding: 'large',
        },
      },
      {
        id: bid(),
        type: 'cards',
        order: 3,
        data: {
          heading: 'Frequently Asked Questions',
          columns: 2,
          cards: [
            { icon: 'HelpCircle', title: 'Is there a free trial?', text: 'Yes! We offer a 14-day free trial with full access to all modules. No credit card required to get started.' },
            { icon: 'HelpCircle', title: 'How long does setup take?', text: 'Most companies are fully operational within 2-3 business days. Our onboarding team guides you through every step.' },
            { icon: 'HelpCircle', title: 'Can I import existing data?', text: 'Absolutely. We support bulk import from Excel, CSV, and can migrate from other HR systems with our data migration service.' },
            { icon: 'HelpCircle', title: 'What support do you offer?', text: 'We provide 24/7 email support, live chat during business hours, and dedicated account managers for enterprise plans.' },
          ],
        },
      },
      { ...SHARED_FOOTER, id: bid(), order: 4 },
    ],
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// TEMPLATE 6: ABOUT US / BLANK STARTER
// ═════════════════════════════════════════════════════════════════════════════

const ABOUT_PAGE: PageTemplate = {
  id: 'about-us',
  name: 'About Us',
  description: 'Company story, mission, team overview, and values section',
  thumbnail: '🏢',
  category: 'Essential',
  pageData: {
    title: 'About Us',
    slug: 'about-us',
    description: 'Learn about our company and team',
    showInMenu: true,
    menuOrder: 5,
    blocks: [
      {
        id: bid(),
        type: 'hero',
        order: 0,
        data: {
          template: 'gradient',
          title: 'Building the Future of HR Technology',
          subtitle: 'We\'re a team of HR professionals and engineers on a mission to make workforce management effortless for every organization.',
          buttonText: '',
          buttonLink: '',
          backgroundImage: '',
          overlayColor: 'rgba(0,0,0,0.1)',
        },
      },
      {
        id: bid(),
        type: 'richtext',
        order: 1,
        data: {
          html: `
            <div style="max-width: 750px; margin: 0 auto; padding: 20px 0;">
              <h2 style="font-size: 1.75em; font-weight: bold; color: #1e293b; margin-bottom: 16px;">Our Story</h2>
              <p style="color: #475569; line-height: 1.8; font-size: 1.05em; margin-bottom: 16px;">Founded with a simple belief: that managing people shouldn't require complex, expensive software. Our journey began when our founders — experienced HR directors — realized that existing solutions were either too complicated for mid-size companies or too basic to handle real-world HR complexity.</p>
              <p style="color: #475569; line-height: 1.8; font-size: 1.05em; margin-bottom: 16px;">We set out to build an HR platform that combines enterprise-grade power with consumer-grade simplicity. Today, our system serves hundreds of companies across the region, processing payroll for thousands of employees every month.</p>
              <p style="color: #475569; line-height: 1.8; font-size: 1.05em;">Every feature we build starts with one question: "Will this make an HR manager's day easier?" If the answer is yes, we build it. If not, we don't.</p>
            </div>
          `,
        },
      },
      {
        id: bid(),
        type: 'cards',
        order: 2,
        data: {
          heading: 'Our Core Values',
          columns: 4,
          cards: [
            { icon: 'Lightbulb', title: 'Innovation', text: 'We constantly push boundaries to deliver smarter HR solutions using the latest technology.' },
            { icon: 'Handshake', title: 'Trust', text: 'Your data security and privacy are non-negotiable. We earn trust through transparency.' },
            { icon: 'Heart', title: 'People-First', text: 'Technology should serve people. Every design decision puts humans at the center.' },
            { icon: 'Sparkles', title: 'Simplicity', text: 'Powerful doesn\'t mean complicated. We make complex workflows feel effortless.' },
          ],
        },
      },
      {
        id: bid(),
        type: 'richtext',
        order: 3,
        data: {
          html: `
            <div style="text-align:center; padding: 40px 0;">
              <h2 style="font-size: 1.75em; font-weight: bold; color: #1e293b; margin-bottom: 32px;">Our Impact in Numbers</h2>
              <div style="display: flex; justify-content: center; gap: 48px; flex-wrap: wrap;">
                <div>
                  <div style="font-size: 2.2em; font-weight: bold; color: #2563eb;">2020</div>
                  <div style="color: #64748b;">Founded</div>
                </div>
                <div>
                  <div style="font-size: 2.2em; font-weight: bold; color: #2563eb;">50+</div>
                  <div style="color: #64748b;">Team Members</div>
                </div>
                <div>
                  <div style="font-size: 2.2em; font-weight: bold; color: #2563eb;">500+</div>
                  <div style="color: #64748b;">Companies Served</div>
                </div>
                <div>
                  <div style="font-size: 2.2em; font-weight: bold; color: #2563eb;">12</div>
                  <div style="color: #64748b;">Countries</div>
                </div>
              </div>
            </div>
          `,
        },
      },
      {
        id: bid(),
        type: 'richtext',
        order: 4,
        data: {
          html: `
            <div style="text-align:center; background: linear-gradient(135deg, #eff6ff, #f0fdf4); border-radius: 16px; padding: 48px 32px; margin: 20px 0;">
              <h2 style="font-size: 1.5em; font-weight: bold; color: #1e293b; margin-bottom: 12px;">Want to Join Our Team?</h2>
              <p style="color: #64748b; font-size: 1.05em; margin-bottom: 24px;">We're always looking for talented people who share our passion for great HR technology.</p>
              <a href="/pages/contact-us" style="display: inline-block; padding: 12px 28px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Get in Touch</a>
            </div>
          `,
        },
      },
      { ...SHARED_FOOTER, id: bid(), order: 5 },
    ],
  },
};

// ─── Export All Templates ────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// TEMPLATE 7: NEWSLETTER SUBSCRIBE
// ═════════════════════════════════════════════════════════════════════════════

const NEWSLETTER_PAGE: PageTemplate = {
  id: 'newsletter',
  name: 'Newsletter Subscribe',
  description: 'Newsletter subscription page with form block, benefits section, and privacy assurance',
  thumbnail: '📰',
  category: 'Marketing',
  pageData: {
    title: 'Newsletter',
    slug: 'newsletter',
    description: 'Subscribe to our newsletter for HR insights and product updates',
    showInMenu: false,
    menuOrder: 99,
    blocks: [
      {
        id: bid(),
        type: 'hero',
        order: 0,
        data: {
          template: 'gradient',
          title: 'Stay Ahead in HR',
          subtitle: 'Get the latest HR industry insights, product updates, compliance tips, and expert advice delivered straight to your inbox — every two weeks.',
          buttonText: '',
          buttonLink: '',
          backgroundImage: '',
          overlayColor: 'rgba(0,0,0,0.1)',
        },
      },
      {
        id: bid(),
        type: 'cards',
        order: 1,
        data: {
          heading: 'What You\'ll Receive',
          columns: 3,
          cards: [
            { icon: 'BookOpen', title: 'HR Best Practices', text: 'Actionable guides and frameworks from experienced HR professionals to help you build a better workplace.' },
            { icon: 'Bell', title: 'Product Updates', text: 'Be the first to hear about new features, improvements, and upcoming modules in the HR ERP platform.' },
            { icon: 'TrendingUp', title: 'Industry Insights', text: 'Data-driven reports, salary benchmarks, and workforce trend analysis to inform your HR strategy.' },
          ],
        },
      },
      {
        id: bid(),
        type: 'form',
        order: 2,
        data: {
          formTitle: 'Subscribe to Our Newsletter',
          formSubtitle: 'Join 5,000+ HR professionals. Unsubscribe at any time.',
          fields: [
            { id: bid(), type: 'text', label: 'Full Name', placeholder: 'Enter your full name', required: true, width: 'half' },
            { id: bid(), type: 'email', label: 'Work Email', placeholder: 'you@company.com', required: true, width: 'half' },
            { id: bid(), type: 'text', label: 'Company Name', placeholder: 'Your company', required: false, width: 'half' },
            { id: bid(), type: 'select', label: 'Role', placeholder: 'Select your role', required: false, width: 'half', options: ['HR Director', 'HR Manager', 'Recruitment Specialist', 'Payroll Manager', 'CEO / Founder', 'Operations Manager', 'Other'] },
          ],
          submitButtonText: 'Subscribe Now',
          submitButtonColor: '#2563eb',
          submitButtonTextColor: '#ffffff',
          successMessage: 'You\'re subscribed! Check your inbox for a confirmation email.',
          redirectUrl: '',
          destination: 'firestore',
          firestoreCollection: 'newsletter_subscribers',
          enableHoneypot: true,
          formWidth: 'medium',
          backgroundColor: '#ffffff',
          padding: 'large',
        },
      },
      {
        id: bid(),
        type: 'richtext',
        order: 3,
        data: {
          html: `
            <div style="text-align: center; padding: 24px 0; max-width: 600px; margin: 0 auto;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px 32px; display: inline-block;">
                <p style="color: #166534; font-size: 0.9em; margin: 0;">
                  🔒 <strong>Privacy Promise:</strong> We never share your email. You can unsubscribe with one click at any time. No spam, ever.
                </p>
              </div>
            </div>
          `,
        },
      },
      { ...SHARED_FOOTER, id: bid(), order: 4 },
    ],
  },
};

export const PAGE_TEMPLATES: PageTemplate[] = [
  HOME_PAGE,
  FEATURES_PAGE,
  BENEFITS_PAGE,
  MODULES_PAGE,
  ABOUT_PAGE,
  CONTACT_PAGE,
  NEWSLETTER_PAGE,
];
