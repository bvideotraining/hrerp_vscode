'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useBranding } from '@/context/branding-context';
import { settingsService, AppNotification } from '@/lib/services/settings.service';
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
  ChevronDown,
  FileBarChart,
  Bell,
  CheckCheck,
} from 'lucide-react';

interface Module {
  id: number;
  /** matches the moduleId used in Role.permissions */
  moduleId: string;
  name: string;
  icon: any;
  color: string;
  href: string;
  description: string;
}

const modules: Module[] = [
  { id: 1,  moduleId: 'dashboard',          name: 'Dashboard',         icon: BarChart3,   color: 'bg-blue-100',   href: '/dashboard',                  description: 'Analytics & KPIs' },
  { id: 2,  moduleId: 'employees',          name: 'Employees',         icon: Users,       color: 'bg-emerald-100', href: '/dashboard/employees',        description: 'Master Data' },
  { id: 3,  moduleId: 'attendance',         name: 'Attendance',        icon: Clock,       color: 'bg-purple-100', href: '/dashboard/attendance',       description: 'Check-in/out' },
  { id: 4,  moduleId: 'leaves',             name: 'Leaves',            icon: Calendar,    color: 'bg-orange-100', href: '/dashboard/leaves',           description: 'Requests' },
  { id: 5,  moduleId: 'payroll',            name: 'Payroll',           icon: Banknote,    color: 'bg-green-100',  href: '/dashboard/payroll',          description: 'Salary' },
  { id: 6,  moduleId: 'bonuses',            name: 'Bonuses',           icon: Gift,        color: 'bg-pink-100',   href: '/dashboard/bonuses',          description: 'Bonus Tracking' },
  { id: 7,  moduleId: 'social_insurance',   name: 'Social Insurance',  icon: Shield,      color: 'bg-red-100',    href: '/dashboard/social-insurance', description: 'Insurance' },
  { id: 8,  moduleId: 'medical_insurance',  name: 'Medical Insurance', icon: Heart,       color: 'bg-rose-100',   href: '/dashboard/medical-insurance', description: 'Health' },
  { id: 9,  moduleId: 'organization',       name: 'Organization',      icon: Building2,   color: 'bg-cyan-100',   href: '/dashboard/organization',     description: 'Structure' },
  { id: 10, moduleId: 'cms',                name: 'Website CMS',       icon: Globe,       color: 'bg-indigo-100', href: '/dashboard/cms',              description: 'Pages' },
  { id: 11, moduleId: 'reports',            name: 'Reports',           icon: FileBarChart, color: 'bg-amber-100', href: '/dashboard/reports',          description: 'Employee Reports' },
  { id: 12, moduleId: 'settings',           name: 'Settings',          icon: Settings,    color: 'bg-slate-100',  href: '/dashboard/settings',         description: 'Admin' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, canAccess } = useAuth();
  const { appName, logoUrl } = useBranding();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    setNotifLoading(true);
    try {
      const data = await settingsService.getUserNotifications(user.id);
      setNotifications(data);
    } catch {
      // silently ignore — notifications are non-critical
    } finally {
      setNotifLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) loadNotifications();
  }, [user?.id, loadNotifications]);

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await settingsService.markAllNotificationsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* silently ignore */ }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await settingsService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* silently ignore */ }
  };

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
          {modules.filter((m) => canAccess(m.moduleId)).map((module) => {
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

        {/* ── Permission Debug Panel ── */}
        {sidebarOpen && (
          <div className="mx-4 mb-4 mt-2 rounded-lg border border-slate-600 bg-slate-900 p-3 text-xs">
            <p className="font-semibold text-slate-300 mb-1">Session Info</p>
            <p className="text-slate-400">Role: <span className="text-slate-200">{user?.roleId ? `ID: ${user.roleId.slice(0, 8)}...` : user?.role || '—'}</span></p>
            <p className="text-slate-400">Access: <span className={`font-semibold ${user?.accessType === 'full' ? 'text-emerald-400' : user?.accessType === 'custom' ? 'text-blue-400' : 'text-red-400'}`}>{user?.accessType || 'MISSING ⚠️'}</span></p>
            <p className="text-slate-400">Permissions: <span className={`font-semibold ${(user?.permissions?.length ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{user?.permissions?.length ?? 0} modules</span></p>
            {(user?.permissions?.length ?? 0) > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {user!.permissions!.filter(p => p.actions.length > 0).map(p => (
                  <span key={p.moduleId} className="bg-slate-700 text-slate-300 px-1 rounded">{p.moduleId}</span>
                ))}
              </div>
            )}
            {!user?.accessType && (
              <p className="text-amber-400 mt-1">⚠️ Please log out and log in again</p>
            )}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-600">Welcome back to HR ERP</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => { setBellOpen(!bellOpen); setProfileOpen(false); if (!bellOpen) loadNotifications(); }}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Bell className="h-5 w-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Notifications</p>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                        </button>
                      )}
                      <button onClick={() => setBellOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifLoading ? (
                      <div className="py-8 text-center text-xs text-slate-400">Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">No notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <button key={n.id} onClick={() => n.id && handleMarkRead(n.id)}
                          className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}>
                          <div className="flex items-start gap-2">
                            {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                            <div className={!n.isRead ? '' : 'pl-4'}>
                              <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                              {n.createdAt && (
                                <p className="text-xs text-slate-400 mt-1">
                                  {new Date(typeof n.createdAt === 'string' ? n.createdAt : n.createdAt?.seconds * 1000).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen(!profileOpen); setBellOpen(false); }}
                className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-2 hover:bg-slate-100 transition-colors"
              >
              <img
                src={user?.avatar}
                alt={user?.name}
                className="h-8 w-8 rounded-full"
              />
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.roleName || user?.role.replace('_', ' ')}</p>
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
          </div> {/* end flex items-center gap-3 */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
