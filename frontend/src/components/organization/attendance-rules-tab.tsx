'use client';

import { useState, useEffect } from 'react';
import { organizationService, AttendanceRule, DeductionEntry } from '@/lib/services/organization.service';
import { Pencil, X, Clock, Plus, Trash2 } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  WhiteCollar: 'White Collar',
  BlueCollar: 'Blue Collar',
  Management: 'Management',
  PartTime: 'Part Time',
};

const CATEGORY_COLORS: Record<string, string> = {
  WhiteCollar: 'border-blue-200 bg-blue-50',
  BlueCollar: 'border-indigo-200 bg-indigo-50',
  Management: 'border-amber-200 bg-amber-50',
  PartTime: 'border-slate-200 bg-slate-50',
};

const BADGE_COLORS: Record<string, string> = {
  WhiteCollar: 'bg-blue-100 text-blue-700',
  BlueCollar: 'bg-indigo-100 text-indigo-700',
  Management: 'bg-amber-100 text-amber-700',
  PartTime: 'bg-slate-100 text-slate-700',
};

function buildDefaultSchedule(freeMinutes: number): DeductionEntry[] {
  return [
    { upToMinutes: freeMinutes, days: 0 },
    { upToMinutes: freeMinutes + 60, days: 1 },
    { upToMinutes: freeMinutes + 120, days: 2 },
    { upToMinutes: freeMinutes + 180, days: 3 },
    { upToMinutes: freeMinutes + 240, days: 4 },
    { upToMinutes: freeMinutes + 300, days: 5 },
    { upToMinutes: 9999, days: 6 },
  ];
}

function getSchedule(rule: AttendanceRule): DeductionEntry[] {
  return rule.deductionSchedule?.length
    ? rule.deductionSchedule
    : buildDefaultSchedule(rule.freeMinutes);
}

function rangeLabel(entries: DeductionEntry[], index: number): string {
  const from = index === 0 ? 0 : entries[index - 1].upToMinutes + 1;
  if (index === entries.length - 1) return `${from} min +`;
  return `${from} – ${entries[index].upToMinutes} min`;
}

export function AttendanceRulesTab() {
  const [rules, setRules] = useState<AttendanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRule, setEditRule] = useState<AttendanceRule | null>(null);
  const [form, setForm] = useState<Partial<AttendanceRule>>({});
  const [schedule, setSchedule] = useState<DeductionEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const load = () => {
    setLoading(true);
    organizationService.getAttendanceRules()
      .then(setRules)
      .catch((e) => showToast('error', e.message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const openEdit = (rule: AttendanceRule) => {
    setEditRule(rule);
    setForm({
      workStart: rule.workStart || '',
      workEnd: rule.workEnd,
      freeMinutes: rule.freeMinutes,
      isFlexible: rule.isFlexible,
    });
    setSchedule(getSchedule(rule).map((e) => ({ ...e })));
  };
  const closeModal = () => { setEditRule(null); setForm({}); setSchedule([]); };

  // ── Schedule row helpers ─────────────────────────────
  const updateScheduleRow = (index: number, field: keyof DeductionEntry, value: number) => {
    setSchedule((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const addScheduleRow = () => {
    setSchedule((prev) => {
      const copy = [...prev];
      const overflow = copy.pop()!; // always keep last row as overflow
      const prevMax = copy.length > 0 ? copy[copy.length - 1].upToMinutes : 0;
      const newRow: DeductionEntry = { upToMinutes: prevMax + 60, days: overflow.days };
      overflow.days = overflow.days + 1;
      return [...copy, newRow, overflow];
    });
  };

  const removeScheduleRow = (index: number) => {
    if (schedule.length <= 2) return; // must keep at least 2 rows
    setSchedule((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!editRule) return;
    if (!form.isFlexible && !form.workStart) { showToast('error', 'Work start time is required'); return; }
    if (!form.workEnd) { showToast('error', 'Work end time is required'); return; }
    if (schedule.length < 1) { showToast('error', 'Deduction schedule must have at least one row'); return; }
    // Validate rows are in ascending order (excluding last overflow row)
    for (let i = 0; i < schedule.length - 2; i++) {
      if (schedule[i].upToMinutes >= schedule[i + 1].upToMinutes) {
        showToast('error', `Row ${i + 1}: "Up to" must be less than row ${i + 2}`);
        return;
      }
    }
    setSaving(true);
    try {
      await organizationService.updateAttendanceRule(editRule.category, {
        category: editRule.category,
        workStart: form.workStart || undefined,
        workEnd: form.workEnd as string,
        freeMinutes: form.freeMinutes as number,
        isFlexible: form.isFlexible as boolean,
        deductionSchedule: schedule,
      });
      showToast('success', 'Rule updated');
      closeModal();
      load();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>;
  }

  const sortOrder = ['WhiteCollar', 'BlueCollar', 'Management', 'PartTime'];
  const sorted = [...rules].sort((a, b) => sortOrder.indexOf(a.category) - sortOrder.indexOf(b.category));

  return (
    <div>
      {toast && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>{toast.message}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sorted.map((rule) => {
          const sched = getSchedule(rule);
          return (
            <div key={rule.category} className={`rounded-xl border p-5 ${CATEGORY_COLORS[rule.category] || 'border-slate-200 bg-white'}`}>
              <div className="mb-3 flex items-center justify-between">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_COLORS[rule.category]}`}>
                  {CATEGORY_LABELS[rule.category] || rule.category}
                </span>
                <button
                  onClick={() => openEdit(rule)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              </div>

              <div className="space-y-1.5 mb-4">
                {rule.isFlexible ? (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">Flexible hours</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>{rule.workStart} — {rule.workEnd}</span>
                  </div>
                )}
                <div className="text-xs text-slate-500">
                  Free minutes: <span className="font-semibold text-slate-700">{rule.freeMinutes} min</span>
                </div>
              </div>

              {/* Read-only deduction schedule */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Deduction Schedule</p>
                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-1.5 font-medium text-slate-500">Late by</th>
                        <th className="text-right px-3 py-1.5 font-medium text-slate-500">Deduction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sched.map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-slate-600">{rangeLabel(sched, i)}</td>
                          <td className="px-3 py-1.5 text-right font-medium text-slate-800">
                            {row.days === 0 ? '—' : `${row.days} day${row.days !== 1 ? 's' : ''}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h3 className="text-base font-semibold text-slate-900">
                Edit – {CATEGORY_LABELS[editRule.category] || editRule.category}
              </h3>
              <button onClick={closeModal} className="rounded p-1 hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body — scrollable */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {/* Work Hours Section */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Work Hours</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isFlexible" checked={!!form.isFlexible}
                      onChange={(e) => setForm((f) => ({ ...f, isFlexible: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                    <label htmlFor="isFlexible" className="text-sm text-slate-700">Flexible hours (no fixed start time)</label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {!form.isFlexible && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Work Start <span className="text-red-500">*</span></label>
                        <input type="time" value={form.workStart || ''}
                          onChange={(e) => setForm((f) => ({ ...f, workStart: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Work End <span className="text-red-500">*</span></label>
                      <input type="time" value={form.workEnd || ''}
                        onChange={(e) => setForm((f) => ({ ...f, workEnd: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Free Late Minutes</label>
                      <input type="number" min={0} max={240} value={form.freeMinutes ?? 60}
                        onChange={(e) => setForm((f) => ({ ...f, freeMinutes: Number(e.target.value) }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Deduction Schedule Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700">Deduction Schedule</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Days deducted based on minutes late</p>
                  </div>
                  <button
                    onClick={addScheduleRow}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </button>
                </div>

                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-28">Range</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Up to (min)</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Days deducted</th>
                        <th className="w-8 px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schedule.map((row, i) => {
                        const isLastRow = i === schedule.length - 1;
                        const fromMin = i === 0 ? 0 : schedule[i - 1].upToMinutes + 1;
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            {/* Range (read-only) */}
                            <td className="px-3 py-2 text-xs text-slate-400 tabular-nums whitespace-nowrap">
                              {fromMin} – {isLastRow ? '∞' : row.upToMinutes}
                            </td>
                            {/* Up to minutes — editable except last row */}
                            <td className="px-3 py-2">
                              {isLastRow ? (
                                <span className="text-sm text-slate-400 italic">∞</span>
                              ) : (
                                <input
                                  type="number"
                                  min={fromMin + 1}
                                  value={row.upToMinutes}
                                  onChange={(e) => updateScheduleRow(i, 'upToMinutes', Number(e.target.value))}
                                  className="w-20 rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              )}
                            </td>
                            {/* Days deducted — always editable */}
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                value={row.days}
                                onChange={(e) => updateScheduleRow(i, 'days', Number(e.target.value))}
                                className="w-16 rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            {/* Delete */}
                            <td className="px-2 py-2">
                              {schedule.length > 2 && (
                                <button
                                  onClick={() => removeScheduleRow(i)}
                                  className="rounded p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                                  title="Remove row"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  The last row (∞) is the overflow — applies to any lateness beyond the previous row.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 shrink-0">
              <button onClick={closeModal}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Update Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
