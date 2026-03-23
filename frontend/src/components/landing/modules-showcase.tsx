import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart3,
  Users,
  Clock,
  Calendar,
  Banknote,
  Gift,
  Heart,
  Shield,
  Building2,
  Globe,
  Settings,
  ArrowRight
} from 'lucide-react';

const modules = [
  {
    id: 1,
    name: 'Dashboard',
    description: 'Real-time analytics and KPIs including payroll estimates, pending leaves, attendance metrics, and salary insights.',
    icon: BarChart3,
    color: 'from-blue-500 to-blue-600',
    features: ['Payroll Estimate', 'Pending Leaves', 'Late Incidents', 'Salary by Branch']
  },
  {
    id: 2,
    name: 'Employees',
    description: 'Complete employee master data with profiles, documents, employment history, and status tracking.',
    icon: Users,
    color: 'from-emerald-500 to-emerald-600',
    features: ['Employee Profiles', 'Document Management', 'Employment History', 'Status Tracking']
  },
  {
    id: 3,
    name: 'Attendance',
    description: 'Daily attendance tracking with automated late calculation, absence management, and Saturday bonus tracking.',
    icon: Clock,
    color: 'from-purple-500 to-purple-600',
    features: ['Daily Check-in/out', 'Late Tracking', 'Saturday Bonus', 'Absence Management']
  },
  {
    id: 4,
    name: 'Leaves',
    description: 'Comprehensive leave management with request workflow, balance tracking, and approval process for multiple leave types.',
    icon: Calendar,
    color: 'from-orange-500 to-orange-600',
    features: ['Leave Requests', 'Balance Tracking', 'Approvals', 'Leave History']
  },
  {
    id: 5,
    name: 'Payroll',
    description: 'Automated monthly salary calculation with deductions, bonuses, insurance contributions, and salary slips generation.',
    icon: Banknote,
    color: 'from-green-500 to-green-600',
    features: ['Salary Calculation', 'Deductions', 'Salary Slips', 'Payroll Reports']
  },
  {
    id: 6,
    name: 'Bonuses',
    description: 'Track and manage all employee bonuses including Saturday, duty, training, and performance bonuses.',
    icon: Gift,
    color: 'from-pink-500 to-pink-600',
    features: ['Bonus Entry', 'Bonus Types', '7 Bonus Categories', 'Approval Workflow']
  },
  {
    id: 7,
    name: 'Social Insurance',
    description: 'Manage social insurance enrollment with automatic 11.25% employee and 19% employer contribution deductions.',
    icon: Shield,
    color: 'from-red-500 to-red-600',
    features: ['Enrollment', 'Contribution Tracking', 'Auto-deduction', 'Reports']
  },
  {
    id: 8,
    name: 'Medical Insurance',
    description: 'Medical insurance plan management with family member coverage and premium deduction integration.',
    icon: Heart,
    color: 'from-rose-500 to-rose-600',
    features: ['Plan Management', 'Family Coverage', 'Premium Tracking', 'Claims']
  },
  {
    id: 9,
    name: 'Organization',
    description: 'Organization structure setup including branding, branches, departments, job titles, and attendance rules.',
    icon: Building2,
    color: 'from-cyan-500 to-cyan-600',
    features: ['Branding', 'Branches', 'Departments', 'Job Titles', 'Attendance Rules']
  },
  {
    id: 10,
    name: 'Website CMS',
    description: 'Public website management with landing page builder, custom pages, and content management without coding.',
    icon: Globe,
    color: 'from-indigo-500 to-indigo-600',
    features: ['Page Builder', 'Custom Pages', 'Media Gallery', 'SEO Settings']
  },
  {
    id: 11,
    name: 'Settings',
    description: 'System administration with user management, roles/permissions, OAuth setup, backup/restore, and system configuration.',
    icon: Settings,
    color: 'from-slate-500 to-slate-600',
    features: ['User Management', 'Roles & Permissions', 'OAuth', 'Backup/Restore']
  }
];

export default function ModulesShowcase() {
  return (
    <section id="modules" className="py-20 md:py-32 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-slate-900">
            11 Powerful Modules
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Everything you need to manage your HR operations efficiently. Each module is designed for specific HR functions with seamless integration.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <Card 
                key={module.id} 
                className="group hover:shadow-xl transition-all duration-300 border-slate-200 overflow-hidden"
              >
                {/* Color accent bar */}
                <div className={`h-1 bg-gradient-to-r ${module.color}`} />

                <CardHeader>
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${module.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-slate-900">{module.name}</CardTitle>
                  <CardDescription className="text-slate-600 mt-2">
                    {module.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-slate-700">Key Features:</h4>
                    <ul className="space-y-2">
                      {module.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-50 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors group-hover:text-blue-600">
                    Learn More
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Modules Integration Info */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900">Integrated Ecosystem</CardTitle>
            <CardDescription className="text-slate-700 mt-2">
              All 11 modules work together seamlessly. Employees module feeds into Payroll, which integrates with Bonuses and Insurance. Attendance data automatically syncs with Leave and Payroll calculations. Dashboard aggregates data from all modules for real-time insights.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  );
}
