'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import SystemUsersSection from '@/components/settings/system-users-section';
import RolesSection from '@/components/settings/roles-section';
import SystemConfigSection from '@/components/settings/system-config-section';
import AuthSettingsSection from '@/components/settings/auth-settings-section';
import BackupRestoreSection from '@/components/settings/backup-restore-section';
import NotificationSettingsSection from '@/components/settings/notification-settings-section';
import SystemResetSection from '@/components/settings/system-reset-section';
import {
  Users, ShieldCheck, SlidersHorizontal, KeyRound,
  Database, Bell, Trash2,
} from 'lucide-react';

type Section =
  | 'users' | 'roles' | 'config' | 'auth' | 'backup' | 'notifications' | 'reset';

const NAV_GROUPS = [
  {
    label: 'Access Control',
    items: [
      { id: 'users' as Section, label: 'System Users', icon: Users, description: 'Manage user accounts' },
      { id: 'roles' as Section, label: 'Roles & Permissions', icon: ShieldCheck, description: 'Define access levels' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { id: 'config' as Section, label: 'System Configuration', icon: SlidersHorizontal, description: 'Currency, holidays, etc.' },
      { id: 'auth' as Section, label: 'Auth Settings', icon: KeyRound, description: 'Google Authentication' },
    ],
  },
  {
    label: 'Data Management',
    items: [
      { id: 'backup' as Section, label: 'Backup & Restore', icon: Database, description: 'Export / Import data' },
      { id: 'notifications' as Section, label: 'Notification Settings', icon: Bell, description: 'Alerts & channels' },
    ],
  },
  {
    label: 'Danger Zone',
    items: [
      { id: 'reset' as Section, label: 'System Reset', icon: Trash2, description: 'Factory reset' },
    ],
    danger: true,
  },
];

function SettingsContent() {
  const [activeSection, setActiveSection] = useState<Section>('users');

  const renderSection = () => {
    switch (activeSection) {
      case 'users':         return <SystemUsersSection />;
      case 'roles':         return <RolesSection />;
      case 'config':        return <SystemConfigSection />;
      case 'auth':          return <AuthSettingsSection />;
      case 'backup':        return <BackupRestoreSection />;
      case 'notifications': return <NotificationSettingsSection />;
      case 'reset':         return <SystemResetSection />;
    }
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">System administration</p>
        </div>
        <nav className="p-3 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 px-2 ${
                group.danger ? 'text-red-400' : 'text-slate-400'}`}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        active
                          ? group.danger
                            ? 'bg-red-50 text-red-700 border-l-2 border-red-500'
                            : 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                          : group.danger
                            ? 'text-red-500 hover:bg-red-50'
                            : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 flex-shrink-0 ${active ? '' : 'opacity-70'}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-slate-50">
        <div className="h-full p-6 overflow-auto">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute moduleId="settings">
      <DashboardLayout>
        <SettingsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

