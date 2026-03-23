'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { BrandingTab } from '@/components/organization/branding-tab';
import { BranchesTab } from '@/components/organization/branches-tab';
import { DepartmentsTab } from '@/components/organization/departments-tab';
import { JobTitlesTab } from '@/components/organization/job-titles-tab';
import { MonthRangesTab } from '@/components/organization/month-ranges-tab';
import { AttendanceRulesTab } from '@/components/organization/attendance-rules-tab';
import { Palette, MapPin, FolderTree, Briefcase, CalendarRange, Clock } from 'lucide-react';

const TABS = [
  { id: 'branding', label: 'Branding', icon: Palette, description: 'App name & logo' },
  { id: 'branches', label: 'Branches', icon: MapPin, description: 'Office locations' },
  { id: 'departments', label: 'Departments', icon: FolderTree, description: 'Org structure' },
  { id: 'job-titles', label: 'Job Titles', icon: Briefcase, description: 'Roles & categories' },
  { id: 'month-ranges', label: 'Month Range', icon: CalendarRange, description: 'Payroll periods' },
  { id: 'attendance-rules', label: 'Attendance Rules', icon: Clock, description: 'Work schedules' },
] as const;

type TabId = typeof TABS[number]['id'];

function OrganizationContent() {
  const [activeTab, setActiveTab] = useState<TabId>('branding');

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="px-8 pt-8 pb-6 border-b border-slate-200 bg-white">
        <h2 className="text-2xl font-bold text-slate-900">Organization</h2>
        <p className="text-sm text-slate-500 mt-1">Configure your organization's structure, branding, and policies</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tab Sidebar */}
        <div className="w-52 shrink-0 border-r border-slate-200 bg-slate-50 py-4 px-3 space-y-1 overflow-y-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                <div>
                  <p className={`text-sm font-medium ${active ? 'text-white' : 'text-slate-800'}`}>{tab.label}</p>
                  <p className={`text-xs ${active ? 'text-blue-100' : 'text-slate-400'}`}>{tab.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'branding' && <BrandingTab />}
          {activeTab === 'branches' && <BranchesTab />}
          {activeTab === 'departments' && <DepartmentsTab />}
          {activeTab === 'job-titles' && <JobTitlesTab />}
          {activeTab === 'month-ranges' && <MonthRangesTab />}
          {activeTab === 'attendance-rules' && <AttendanceRulesTab />}
        </div>
      </div>
    </div>
  );
}

export default function OrganizationPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <OrganizationContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
