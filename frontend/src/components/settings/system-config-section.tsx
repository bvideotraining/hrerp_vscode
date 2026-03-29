'use client';

import { useState, useEffect } from 'react';
import { settingsService, SystemConfig, OfficialVacation } from '@/lib/services/settings.service';
import { useSettings } from '@/context/settings-context';
import { Plus, Trash2, Save, CalendarDays } from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)' }, { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' }, { code: 'EGP', name: 'Egyptian Pound (EGP)' },
  { code: 'SAR', name: 'Saudi Riyal (SAR)' }, { code: 'AED', name: 'UAE Dirham (AED)' },
  { code: 'QAR', name: 'Qatari Riyal (QAR)' }, { code: 'KWD', name: 'Kuwaiti Dinar (KWD)' },
  { code: 'BHD', name: 'Bahraini Dinar (BHD)' }, { code: 'OMR', name: 'Omani Rial (OMR)' },
  { code: 'JOD', name: 'Jordanian Dinar (JOD)' }, { code: 'LBP', name: 'Lebanese Pound (LBP)' },
];

const WEEKDAYS = [
  { id: 'sunday', name: 'Sunday' }, { id: 'monday', name: 'Monday' },
  { id: 'tuesday', name: 'Tuesday' }, { id: 'wednesday', name: 'Wednesday' },
  { id: 'thursday', name: 'Thursday' }, { id: 'friday', name: 'Friday' },
  { id: 'saturday', name: 'Saturday' },
];

const DEFAULT_CONFIG: SystemConfig = {
  defaultCurrency: 'USD', workingDaysPerWeek: 5,
  weeklyHolidays: ['friday', 'saturday'], officialVacations: [],
};

export default function SystemConfigSection() {
  const { refreshSettings } = useSettings();
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newVacation, setNewVacation] = useState<OfficialVacation>({ name: '', date: '' });

  useEffect(() => {
    settingsService.getConfig()
      .then((c) => setConfig({ ...DEFAULT_CONFIG, ...c }))
      .catch(() => { /* Backend unavailable — use defaults */ })
      .finally(() => setLoading(false));
  }, []);

  const toggleHoliday = (day: string) => {
    setConfig((prev) => {
      const arr = prev.weeklyHolidays;
      return {
        ...prev,
        weeklyHolidays: arr.includes(day) ? arr.filter((d) => d !== day) : [...arr, day],
      };
    });
  };

  const addVacation = () => {
    if (!newVacation.name || !newVacation.date) return;
    setConfig((prev) => ({
      ...prev,
      officialVacations: [...prev.officialVacations, newVacation],
    }));
    setNewVacation({ name: '', date: '' });
  };

  const removeVacation = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      officialVacations: prev.officialVacations.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateConfig(config);
      await refreshSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading configuration...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">System Configuration</h2>
          <p className="text-sm text-slate-500 mt-0.5">Global system defaults applied across all modules</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition-colors">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6 overflow-auto pb-6">
        {/* Currency */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Default Currency</h3>
          <select
            value={config.defaultCurrency}
            onChange={(e) => setConfig({ ...config, defaultCurrency: e.target.value })}
            className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-2">Used in payroll, reports, and financial dashboards</p>
        </div>

        {/* Working Days */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Working Days Per Week</h3>
          <div className="flex items-center gap-3">
            <input
              type="number" min={1} max={7}
              value={config.workingDaysPerWeek}
              onChange={(e) => setConfig({ ...config, workingDaysPerWeek: Number(e.target.value) })}
              className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">days / week</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Used for leave accrual and attendance calculations</p>
        </div>

        {/* Weekly Holidays */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Weekly Holidays</h3>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => {
              const selected = config.weeklyHolidays.includes(day.id);
              return (
                <button key={day.id} onClick={() => toggleHoliday(day.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                    selected
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {day.name}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Selected: {config.weeklyHolidays.length === 0
              ? 'None'
              : config.weeklyHolidays.map((d) => WEEKDAYS.find((w) => w.id === d)?.name).join(', ')}
          </p>
        </div>

        {/* Official Vacations */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            Official Annual Vacations
          </h3>

          {/* Add new */}
          <div className="flex gap-2 mb-4">
            <input value={newVacation.name}
              onChange={(e) => setNewVacation({ ...newVacation, name: e.target.value })}
              placeholder="Holiday name (e.g. New Year)"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="date" value={newVacation.date}
              onChange={(e) => setNewVacation({ ...newVacation, date: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={addVacation} disabled={!newVacation.name || !newVacation.date}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 transition-colors">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          {/* List */}
          {config.officialVacations.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-lg">
              No official vacations added yet
            </p>
          ) : (
            <div className="space-y-2">
              {config.officialVacations
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((v, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        {new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-sm font-medium text-slate-800">{v.name}</span>
                    </div>
                    <button onClick={() => removeVacation(idx)} className="p-1.5 rounded hover:bg-red-100 transition-colors">
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
