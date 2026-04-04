'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/context/auth-context';
import { dashboardLayoutService } from '@/lib/services/dashboard-layout.service';
import { templateToWidgets } from '@/lib/dashboard-widget-registry';
import type { WidgetItem } from '@/lib/dashboard-widget-registry';
import { WIDGET_COMPONENT_MAP, WIDGET_SPAN } from '@/components/dashboard/widgets/index';

/* ─── helpers ───────────────────────────────────────────────────── */
function normalizeRole(r: string | undefined) {
  return (r || '').toLowerCase().replace(/[\s-]+/g, '_');
}

/* ─── Page wrapper ──────────────────────────────────────────────── */
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <DashboardPageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

/* ─── Content ───────────────────────────────────────────────────── */
function DashboardPageContent() {
  const { user } = useAuth();
  const roleKey = normalizeRole(user?.role);
  const [widgets, setWidgets] = useState<WidgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLayout = useCallback(async () => {
    try {
      const saved = await dashboardLayoutService.getLayout(roleKey);
      if (saved && saved.widgets && saved.widgets.length > 0) {
        setWidgets([...saved.widgets].sort((a, b) => a.order - b.order));
      } else {
        setWidgets(templateToWidgets(roleKey));
      }
    } catch {
      setWidgets(templateToWidgets(roleKey));
    } finally {
      setLoading(false);
    }
  }, [roleKey]);

  useEffect(() => { if (roleKey) loadLayout(); }, [roleKey, loadLayout]);

  return (
    <div className="p-6">
      {/* Welcome header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Welcome back to HR ERP</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-6 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="col-span-2 h-28 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : widgets.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">No widgets configured</p>
          <p className="text-sm mt-1">Ask an admin to set up your dashboard layout in Settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-4">
          {widgets.map((w) => {
            const Component = WIDGET_COMPONENT_MAP[w.id];
            if (!Component) return null;
            const span = WIDGET_SPAN[w.id] ?? 2;
            return (
              <div key={w.id} style={{ gridColumn: `span ${span} / span ${span}` }}>
                <Component />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
