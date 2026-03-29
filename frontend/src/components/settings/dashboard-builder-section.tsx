'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, Sparkles, Save, ChevronUp, ChevronDown, Plus, Trash2,
  LayoutDashboard, Loader2, CheckCircle, AlertCircle,
  Users, DollarSign, Clock, CalendarOff, Gift, Shield,
  TrendingUp, BarChart2, PieChart, BarChart, UserX, Activity,
  FileText, Zap, Server,
} from 'lucide-react';
import {
  WIDGET_REGISTRY,
  WIDGET_MAP,
  DASHBOARD_TEMPLATES,
  templateToWidgets,
  getAvailableWidgets,
  type WidgetItem,
} from '@/lib/dashboard-widget-registry';
import { dashboardLayoutService, type AiWidgetSuggestion } from '@/lib/services/dashboard-layout.service';
import type { Role } from '@/lib/services/settings.service';

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Users, DollarSign, Clock, CalendarOff, AlertCircle: AlertCircle, Gift, Shield,
  TrendingUp, BarChart2, PieChart, BarChart, UserX, Activity,
  FileText, Zap, Server,
};

function WidgetIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? LayoutDashboard;
  return <Icon className={className ?? 'h-4 w-4'} />;
}

// ─── Priority badge ───────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

interface Props {
  role: Role;
  onClose: () => void;
}

export default function DashboardBuilderSection({ role, onClose }: Props) {
  const [activeWidgets, setActiveWidgets] = useState<WidgetItem[]>([]);
  const [suggestions, setSuggestions] = useState<AiWidgetSuggestion[]>([]);
  const [loadingLayout, setLoadingLayout] = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Permissions for filtering
  const readableModules: string[] = role.accessType === 'full'
    ? WIDGET_REGISTRY.map((w) => w.requiredModules).flat()
    : (role.permissions ?? [])
        .filter((p) => p.actions.includes('read'))
        .map((p) => p.moduleId);
  const isFullAccess = role.accessType === 'full';
  const availableWidgets = getAvailableWidgets(readableModules, isFullAccess);

  // Widgets not yet in active list
  const inactiveWidgets = availableWidgets.filter(
    (w) => !activeWidgets.some((a) => a.id === w.id),
  );

  // ─── Load saved layout ────────────────────────────────────────────────────
  const loadLayout = useCallback(async () => {
    if (!role.id) return;
    try {
      setLoadingLayout(true);
      setError(null);
      const layout = await dashboardLayoutService.getLayout(role.id);
      if (layout && layout.widgets?.length) {
        setActiveWidgets([...layout.widgets].sort((a, b) => a.order - b.order));
      } else {
        // Apply default template for this role archetype if no layout saved
        const templateKey = Object.keys(DASHBOARD_TEMPLATES).find((k) =>
          role.name?.toLowerCase().includes(k.replace('_', ' ').toLowerCase()),
        ) ?? 'default';
        setActiveWidgets(templateToWidgets(templateKey));
      }
    } catch {
      setError('Could not load the saved layout. Using defaults.');
      setActiveWidgets(templateToWidgets('default'));
    } finally {
      setLoadingLayout(false);
    }
  }, [role.id, role.name]);

  useEffect(() => { loadLayout(); }, [loadLayout]);

  // ─── Reorder helpers ──────────────────────────────────────────────────────
  function moveUp(idx: number) {
    if (idx === 0) return;
    setActiveWidgets((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((w, i) => ({ ...w, order: i }));
    });
  }

  function moveDown(idx: number) {
    setActiveWidgets((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((w, i) => ({ ...w, order: i }));
    });
  }

  function removeWidget(id: string) {
    setActiveWidgets((prev) =>
      prev.filter((w) => w.id !== id).map((w, i) => ({ ...w, order: i })),
    );
  }

  function addWidget(id: string) {
    setActiveWidgets((prev) => {
      if (prev.some((w) => w.id === id)) return prev;
      return [...prev, { id, order: prev.length }];
    });
  }

  // ─── Apply template ────────────────────────────────────────────────────────
  function applyTemplate(templateKey: string) {
    if (!templateKey) return;
    const widgets = templateToWidgets(templateKey)
      .filter((w) => availableWidgets.some((a) => a.id === w.id));
    setActiveWidgets(widgets);
    setSelectedTemplate(templateKey);
  }

  // ─── AI Suggest ────────────────────────────────────────────────────────────
  async function handleAiSuggest() {
    if (!role.id) return;
    setSuggestLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const result = await dashboardLayoutService.aiSuggest(role.id, role);
      setSuggestions(result);
    } catch (err: any) {
      setError(err?.message ?? 'AI suggestion failed. Is GEMINI_API_KEY configured?');
    } finally {
      setSuggestLoading(false);
    }
  }

  function addSuggested(widgetId: string) {
    addWidget(widgetId);
    setSuggestions((prev) => prev.filter((s) => s.widgetId !== widgetId));
  }

  // ─── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!role.id) return;
    setSaving(true);
    setError(null);
    try {
      await dashboardLayoutService.saveLayout(role.id, activeWidgets);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save layout.');
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loadingLayout) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading layout…
      </div>
    );
  }

  return (
    <div className="border border-indigo-200 rounded-xl bg-indigo-50/30 mt-4 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-indigo-600" />
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              Dashboard Layout — <span className="text-indigo-600">{role.name}</span>
            </p>
            <p className="text-xs text-gray-400">Drag, reorder, or remove widgets · changes are role-wide</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Template picker */}
          <select
            value={selectedTemplate}
            onChange={(e) => applyTemplate(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">Apply template…</option>
            {Object.keys(DASHBOARD_TEMPLATES).map((k) => (
              <option key={k} value={k}>{k.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>

          {/* AI Suggest */}
          <button
            onClick={handleAiSuggest}
            disabled={suggestLoading}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
          >
            {suggestLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5" />}
            AI Suggest
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>

          {/* Close */}
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* ── Save success / error banner ──────────────────────────────────────── */}
      {saveSuccess && (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 text-xs border-b border-green-100">
          <CheckCircle className="h-4 w-4" /> Layout saved successfully.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-xs border-b border-red-100">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Left: Active widget list ─────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Active Widgets ({activeWidgets.length})
          </p>

          {activeWidgets.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">
              No widgets added. Use &quot;Add Widget&quot; or apply a template.
            </p>
          )}

          <div className="space-y-1.5">
            {activeWidgets.map((item, idx) => {
              const def = WIDGET_MAP.get(item.id);
              if (!def) return null;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2 shadow-sm"
                >
                  <span className="text-xs text-gray-300 w-5 text-right">{idx + 1}</span>
                  <div className={`p-1.5 rounded-md ${def.color}`}>
                    <WidgetIcon name={def.icon} className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{def.title}</p>
                    <p className="text-[10px] text-gray-400 truncate">{def.description}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${def.color}`}>
                    {def.category}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === activeWidgets.length - 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => removeWidget(item.id)}
                      className="p-1 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Widget toggle */}
          <button
            onClick={() => setShowAddPanel((v) => !v)}
            className="mt-2 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 w-full justify-center transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Widget
          </button>

          {/* Add Widget panel */}
          {showAddPanel && (
            <div className="mt-2 border border-gray-200 rounded-lg bg-white p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Available ({inactiveWidgets.length})
              </p>
              {inactiveWidgets.length === 0 ? (
                <p className="text-xs text-gray-400">All available widgets are already added.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {inactiveWidgets.map((def) => (
                    <button
                      key={def.id}
                      onClick={() => addWidget(def.id)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition-colors"
                    >
                      <div className={`p-1 rounded-md flex-shrink-0 ${def.color}`}>
                        <WidgetIcon name={def.icon} className="h-3 w-3" />
                      </div>
                      <span className="text-[11px] text-gray-700 truncate leading-snug">{def.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: AI Suggestions ────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            AI Suggestions
            {suggestLoading && <Loader2 className="inline h-3.5 w-3.5 animate-spin ml-1 text-violet-500" />}
          </p>

          {suggestions.length === 0 && !suggestLoading && (
            <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center">
              <Sparkles className="h-6 w-6 text-violet-300 mx-auto mb-1.5" />
              <p className="text-xs text-gray-400">
                Click <strong>AI Suggest</strong> to let Gemini recommend
                widgets based on this role&apos;s permissions.
              </p>
            </div>
          )}

          {suggestLoading && (
            <div className="border border-dashed border-violet-200 rounded-lg p-4 text-center text-violet-400 text-xs">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1" />
              Gemini is analysing permissions…
            </div>
          )}

          <div className="space-y-1.5">
            {suggestions.map((s) => {
              const def = WIDGET_MAP.get(s.widgetId);
              const alreadyAdded = activeWidgets.some((a) => a.id === s.widgetId);
              return (
                <div
                  key={s.widgetId}
                  className="flex items-start gap-2 bg-white border border-violet-100 rounded-lg px-3 py-2 shadow-sm"
                >
                  {def && (
                    <div className={`p-1.5 rounded-md flex-shrink-0 mt-0.5 ${def.color}`}>
                      <WidgetIcon name={def.icon} className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">
                      {def?.title ?? s.widgetId}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{s.reason}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[s.priority] ?? ''}`}>
                      {s.priority}
                    </span>
                    {!alreadyAdded && def && (
                      <button
                        onClick={() => addSuggested(s.widgetId)}
                        className="flex items-center gap-0.5 text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    )}
                    {alreadyAdded && (
                      <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
                        <CheckCircle className="h-3 w-3" /> Added
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
