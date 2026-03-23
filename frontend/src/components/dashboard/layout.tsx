'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useBranding } from '@/context/branding-context';
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
  LogOut,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';

interface Module {
  id: number;
  name: string;
  icon: any;
  color: string;
  href: string;
  description: string;
}

const modules: Module[] = [
  { id: 1, name: 'Dashboard', icon: BarChart3, color: 'bg-blue-100', href: '/dashboard', description: 'Analytics & KPIs' },
  { id: 2, name: 'Employees', icon: Users, color: 'bg-emerald-100', href: '/dashboard/employees', description: 'Master Data' },
  { id: 3, name: 'Attendance', icon: Clock, color: 'bg-purple-100', href: '/dashboard/attendance', description: 'Check-in/out' },
  { id: 4, name: 'Leaves', icon: Calendar, color: 'bg-orange-100', href: '/dashboard/leaves', description: 'Requests' },
  { id: 5, name: 'Payroll', icon: Banknote, color: 'bg-green-100', href: '/dashboard/payroll', description: 'Salary' },
  { id: 6, name: 'Bonuses', icon: Gift, color: 'bg-pink-100', href: '/dashboard/bonuses', description: 'Bonus Tracking' },
  { id: 7, name: 'Social Insurance', icon: Shield, color: 'bg-red-100', href: '/dashboard/social-insurance', description: 'Insurance' },
  { id: 8, name: 'Medical Insurance', icon: Heart, color: 'bg-rose-100', href: '/dashboard/medical-insurance', description: 'Health' },
  { id: 9, name: 'Organization', icon: Building2, color: 'bg-cyan-100', href: '/dashboard/organization', description: 'Structure' },
  { id: 10, name: 'Website CMS', icon: Globe, color: 'bg-indigo-100', href: '/dashboard/cms', description: 'Pages' },
  { id: 11, name: 'Settings', icon: Settings, color: 'bg-slate-100', href: '/dashboard/settings', description: 'Admin' }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { appName, logoUrl } = useBranding();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-800 text-slate-100 transition-all duration-300 overflow-y-auto border-r border-slate-700`}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">
                    {appName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-lg font-bold">{appName}</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-700 transition-colors"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Modules Navigation */}
        <nav className="p-4 space-y-2">
          {sidebarOpen && <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Modules</h3>}
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => router.push(module.href)}
                title={module.name}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors ${
                  sidebarOpen ? '' : 'justify-center'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${module.color} transition-colors`}>
                  <Icon className="h-4 w-4 text-slate-800" />
                </div>
                {sidebarOpen && (
                  <div className="text-left">
                    <p className="text-sm font-medium">{module.name}</p>
                    <p className="text-xs text-slate-400">{module.description}</p>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-600">Welcome back to HR ERP</p>
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-2 hover:bg-slate-100 transition-colors"
            >
              <img
                src={user?.avatar}
                alt={user?.name}
                className="h-8 w-8 rounded-full"
              />
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.role.replace('_', ' ')}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-600 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                <div className="p-3 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-600">{user?.email}</p>
                  {user?.branch && <p className="text-xs text-slate-600">{user.branch}</p>}
                </div>
                <button
                  onClick={() => router.push('/dashboard/settings')}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-slate-200 rounded-b-lg"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
