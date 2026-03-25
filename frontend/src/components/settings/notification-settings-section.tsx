'use client';

import { useState, useEffect } from 'react';
import { settingsService, NotificationConfig, NotificationRule } from '@/lib/services/settings.service';
import {
  Mail, BellRing, Monitor, Save, Info, CheckCircle2,
} from 'lucide-react';

const MODULES = [
  { id: 'employees', name: 'Employees' }, { id: 'attendance', name: 'Attendance' },
  { id: 'leaves', name: 'Leaves' }, { id: 'payroll', name: 'Payroll' },
  { id: 'bonuses', name: 'Bonuses' }, { id: 'social_insurance', name: 'Social Insurance' },
  { id: 'medical_insurance', name: 'Medical Insurance' }, { id: 'organization', name: 'Organization' },
];

const ROLES = [
  { id: 'admin', name: 'Admin' }, { id: 'hr_manager', name: 'HR Manager' },
  { id: 'finance_manager', name: 'Finance Manager' }, { id: 'supervisor', name: 'Supervisor' },
  { id: 'employee', name: 'Employee' },
];

const EVENTS = ['create', 'update', 'delete'] as const;
type NEvent = (typeof EVENTS)[number];

const DEFAULT_CONFIG: NotificationConfig = {
  emailEnabled: false, pushEnabled: false, inAppEnabled: true,
  rules: MODULES.map((m) => ({ moduleId: m.id, moduleName: m.name, events: [], roleIds: [] })),
};

function ToggleCard({
  icon: Icon, title, description, checked, onChange, color,
}: {
  icon: any; title: string; description: string; checked: boolean;
  onChange: (v: boolean) => void; color: string;
}) {
  return (
    <div className={`bg-white border-2 rounded-xl p-4 transition-colors ${checked ? `border-${color}-400` : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${checked ? `bg-${color}-100` : 'bg-slate-100'}`}>
            <Icon className={`h-5 w-5 ${checked ? `text-${color}-600` : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <button
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? `bg-${color}-600` : 'bg-slate-200'}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
    </div>
  );
}

export default function NotificationSettingsSection() {
  const [config, setConfig] = useState<NotificationConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsService.getNotificationConfig()
      .then((c) => {
        const rules = MODULES.map((m) => {
          const existing = c.rules?.find((r) => r.moduleId === m.id);
          return existing || { moduleId: m.id, moduleName: m.name, events: [], roleIds: [] };
        });
        setConfig({ ...DEFAULT_CONFIG, ...c, rules });
      })
      .catch(() => { /* Backend unavailable — use defaults */ })
      .finally(() => setLoading(false));
  }, []);

  const updateRule = (moduleId: string, patch: Partial<NotificationRule>) => {
    setConfig((prev) => ({
      ...prev,
      rules: prev.rules.map((r) => r.moduleId === moduleId ? { ...r, ...patch } : r),
    }));
  };

  const toggleEvent = (moduleId: string, event: NEvent) => {
    const rule = config.rules.find((r) => r.moduleId === moduleId)!;
    const has = rule.events.includes(event);
    updateRule(moduleId, { events: has ? rule.events.filter((e) => e !== event) : [...rule.events, event] });
  };

  const toggleRole = (moduleId: string, roleId: string) => {
    const rule = config.rules.find((r) => r.moduleId === moduleId)!;
    const has = rule.roleIds.includes(roleId);
    updateRule(moduleId, { roleIds: has ? rule.roleIds.filter((r) => r !== roleId) : [...rule.roleIds, roleId] });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateNotificationConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading settings...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Notification Settings</h2>
          <p className="text-sm text-slate-500 mt-0.5">Control how and when users receive system notifications</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition-colors">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6 overflow-auto pb-6">
        {/* Channel Toggles */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Notification Channels</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ToggleCard icon={Mail} title="Email Notifications" description="Send emails for system events"
              checked={config.emailEnabled} onChange={(v) => setConfig({ ...config, emailEnabled: v })} color="blue" />
            <ToggleCard icon={BellRing} title="Push Notifications" description="Browser push alerts"
              checked={config.pushEnabled} onChange={(v) => setConfig({ ...config, pushEnabled: v })} color="purple" />
            <ToggleCard icon={Monitor} title="In-App Notifications" description="Bell icon in the top bar"
              checked={config.inAppEnabled} onChange={(v) => setConfig({ ...config, inAppEnabled: v })} color="emerald" />
          </div>
        </div>

        {/* In-App description */}
        {config.inAppEnabled && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-emerald-700">
              In-app notifications appear in the <strong>bell icon</strong> in the top navigation bar.
              Users with matching roles will see notifications for the events configured below.
            </p>
          </div>
        )}

        {/* Module Rules */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Notification Rules</h3>
          <p className="text-xs text-slate-500 mb-3">
            For each module, select which events trigger notifications and which roles receive them.
          </p>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 w-36">Module</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600" colSpan={3}>Events</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Notify Roles</th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2" />
                  {EVENTS.map((e) => (
                    <th key={e} className="text-center px-3 py-2 text-xs text-slate-500 capitalize font-medium">{e}</th>
                  ))}
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {config.rules.map((rule) => (
                  <tr key={rule.moduleId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 text-xs">
                      {MODULES.find((m) => m.id === rule.moduleId)?.name || rule.moduleName}
                    </td>
                    {EVENTS.map((event) => (
                      <td key={event} className="text-center px-3 py-3">
                        <input type="checkbox" checked={rule.events.includes(event)}
                          onChange={() => toggleEvent(rule.moduleId, event)}
                          className="rounded border-slate-300 h-3.5 w-3.5" />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ROLES.map((role) => {
                          const selected = rule.roleIds.includes(role.id);
                          return (
                            <button key={role.id} onClick={() => toggleRole(rule.moduleId, role.id)}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                                selected ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                              {role.name}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-600 mb-2">Active Rules Summary</h3>
          {config.rules.filter((r) => r.events.length > 0 && r.roleIds.length > 0).length === 0 ? (
            <p className="text-xs text-slate-400">No active notification rules configured.</p>
          ) : (
            <div className="space-y-1">
              {config.rules
                .filter((r) => r.events.length > 0 && r.roleIds.length > 0)
                .map((rule) => (
                  <div key={rule.moduleId} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="font-medium">{MODULES.find((m) => m.id === rule.moduleId)?.name}</span>
                    <span className="text-slate-400">—</span>
                    <span className="capitalize">{rule.events.join(', ')}</span>
                    <span className="text-slate-400">→</span>
                    <span>{rule.roleIds.map((rid) => ROLES.find((r) => r.id === rid)?.name).join(', ')}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
