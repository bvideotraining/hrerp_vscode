'use client';

import { useState, useEffect } from 'react';
import { dashboardLayoutService } from '@/lib/services/dashboard-layout.service';
import {
  WIDGET_REGISTRY,
  templateToWidgets,
  getAvailableWidgets,
  type WidgetItem,
  type WidgetDefinition,
} from '@/lib/dashboard-widget-registry';
import {
  LayoutDashboard, Save, RotateCcw, ChevronUp, ChevronDown,
  Check, X, Loader2, Info,
} from 'lucide-react';

/* ── Role options ─────────────────────────────────────────────── */
const ROLES: { id: string; label: string }[] = [
  { id: 'admin',           label: 'Admin'           },
  { id: 'hr_manager',      label: 'HR Manager'      },
  { id: 'finance_manager', label: 'Finance Manager' },
  { id: 'approver',        label: 'Approver'        },
  { id: 'branch_approver', label: 'Branch Approver' },
  { id: 'supervisor',      label: 'Supervisor'      },
  { id: 'employee',        label: 'Employee'        },
];

const CATEGORY_LABELS: Record<string, string> = {
  kpi:     'KPI Cards',
  chart:   'Charts',
  list:    'Lists',
  utility: 'Utilities',
};

const CATEGORY_ORDER = ['kpi', 'chart', 'list', 'utility'];

/* ── Component ────────────────────────────────────────────────── */
export default function DashboardLayoutBuilder() {
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [widgets, setWidgets] = useState<WidgetItem[]>([]);   // enabled widgets, ordered
  const [saving, setSaving] = useState(false);
  const [loadingRole, setLoadingRole] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  /* available widgets for selected role (adminOnly based) */
  const isAdmin = selectedRole === 'admin';
  const available: WidgetDefinition[] = getAvailableWidgets(
    WIDGET_REGISTRY.map((w) => w.requiredModules).flat(),
    true, // isFullAccess
    isAdmin,
  );

  /* load saved layout when role changes */
  useEffect(() => {
    setLoadingRole(true);
    dashboardLayoutService.getLayout(selectedRole)
      .then((saved) => {
        if (saved && saved.widgets && saved.widgets.length > 0) {
          setWidgets([...saved.widgets].sort((a, b) => a.order - b.order));
        } else {
          setWidgets(templateToWidgets(selectedRole));
        }
      })
      .catch(() => { setWidgets(templateToWidgets(selectedRole)); })
      .finally(() => setLoadingRole(false));
  }, [selectedRole]);

  const enabledIds = new Set(widgets.map((w) => w.id));

  const toggleWidget = (id: string) => {
    if (enabledIds.has(id)) {
      setWidgets((prev) => prev.filter((w) => w.id !== id).map((w, i) => ({ ...w, order: i })));
    } else {
      setWidgets((prev) => [...prev, { id, order: prev.length }]);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setWidgets((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((w, i) => ({ ...w, order: i }));
    });
  };

  const moveDown = (index: number) => {
    setWidgets((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((w, i) => ({ ...w, order: i }));
    });
  };

  const resetToDefaults = () => {
    setWidgets(templateToWidgets(selectedRole));
  };

  const save = async () => {
    setSaving(true);
    try {
      await dashboardLayoutService.saveLayout(selectedRole, widgets);
      showToast('success', 'Layout saved successfully.');
    } catch {
      showToast('error', 'Failed to save layout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* group available widgets by category */
  const byCategory = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = available.filter((w) => w.category === cat);
    return acc;
  }, {} as Record<string, WidgetDefinition[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <LayoutDashboard className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Dashboard Layouts</h2>
          <p className="text-sm text-slate-500">Configure which widgets each role sees on their dashboard</p>
        </div>
      </div>

      {/* Role tabs */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRole(r.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              selectedRole === r.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loadingRole ? (
        <div className="flex items-center gap-2 text-slate-500 py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading layout…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: widget picker */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Available Widgets</h3>
            {CATEGORY_ORDER.map((cat) => {
              const group = byCategory[cat];
              if (!group || group.length === 0) return null;
              return (
                <div key={cat} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {CATEGORY_LABELS[cat]}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.map((w) => {
                      const enabled = enabledIds.has(w.id);
                      return (
                        <div
                          key={w.id}
                          className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            enabled ? 'bg-blue-50 hover:bg-blue-50/80' : 'hover:bg-slate-50'
                          }`}
                          onClick={() => toggleWidget(w.id)}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            enabled ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                          }`}>
                            {enabled && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">{w.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{w.description}</p>
                            {w.adminOnly && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                <Info className="h-2.5 w-2.5" /> Admin only
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: order preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Display Order ({widgets.length} widgets)
              </h3>
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> Reset defaults
              </button>
            </div>

            {widgets.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
                <LayoutDashboard className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No widgets selected. Click widgets on the left to add them.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {widgets.map((w, idx) => {
                  const def = WIDGET_REGISTRY.find((r) => r.id === w.id);
                  if (!def) return null;
                  return (
                    <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
                        >
                          <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                        </button>
                        <button
                          onClick={() => moveDown(idx)}
                          disabled={idx === widgets.length - 1}
                          className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
                        >
                          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                        </button>
                      </div>
                      <span className="text-xs text-slate-400 w-5 text-center">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{def.title}</p>
                        <p className="text-xs text-slate-500 capitalize">{def.category}</p>
                      </div>
                      <button
                        onClick={() => toggleWidget(w.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Save button */}
            <button
              onClick={save}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : `Save Layout for ${ROLES.find((r) => r.id === selectedRole)?.label}`}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
