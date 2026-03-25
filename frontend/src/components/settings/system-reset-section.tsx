'use client';

import { useState } from 'react';
import { settingsService } from '@/lib/services/settings.service';
import {
  AlertTriangle, Trash2, Eye, EyeOff, ShieldAlert, CheckCircle2,
} from 'lucide-react';

const CONSEQUENCES = [
  'All employee records will be permanently deleted',
  'All attendance logs and leave records will be removed',
  'All payroll and financial data will be erased',
  'All organisation structure (branches, departments) will be deleted',
  'All CMS pages and website content will be removed',
  'All user accounts and roles will be deleted',
  'System configuration will revert to defaults',
  'This action CANNOT be undone',
];

export default function SystemResetSection() {
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'idle' | 'confirm' | 'done'>('idle');
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  const canReset = confirmPhrase === 'RESET' && resetPassword.length >= 6;

  const handleReset = async () => {
    if (!canReset) return;
    setResetting(true);
    setError('');
    try {
      await settingsService.resetSystem(resetPassword, confirmPhrase);
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Reset failed. Check your authorization password.');
    } finally {
      setResetting(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">System Reset Complete</h2>
          <p className="text-sm text-slate-500 mb-6">
            All data has been permanently deleted. The system has been reset to factory defaults.
          </p>
          <a href="/dashboard" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">System Reset</h2>
        <p className="text-sm text-slate-500 mt-0.5">Factory reset — permanently delete all data from the system</p>
      </div>

      <div className="space-y-6 overflow-auto pb-6 max-w-2xl">
        {/* Danger Banner */}
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-red-900">DANGER ZONE — Irreversible Action</h3>
              <p className="text-xs text-red-700">Only authorized Application Admin can perform this action</p>
            </div>
          </div>
          <p className="text-sm text-red-800 font-medium mb-3">
            Factory Reset will permanently delete ALL data from the system database. This includes:
          </p>
          <ul className="space-y-1.5">
            {CONSEQUENCES.map((c) => (
              <li key={c} className="flex items-start gap-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        {step === 'idle' ? (
          <div>
            <button onClick={() => setStep('confirm')}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-sm">
              <Trash2 className="h-5 w-5" /> Proceed to Factory Reset
            </button>
            <p className="text-xs text-slate-500 mt-2">
              Clicking this will reveal the authorization form. No data will be deleted yet.
            </p>
          </div>
        ) : (
          <div className="bg-white border-2 border-red-200 rounded-xl p-6 space-y-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Authorization Required
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Type <span className="font-mono font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">RESET</span> to confirm
              </label>
              <input value={confirmPhrase} onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="Type RESET here"
                className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm font-mono focus:outline-none ${
                  confirmPhrase === 'RESET' ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />
              {confirmPhrase.length > 0 && confirmPhrase !== 'RESET' && (
                <p className="text-xs text-red-500 mt-1">Must be exactly &ldquo;RESET&rdquo; in uppercase</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Admin Authorization Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
                  placeholder="Enter the system reset password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                The reset password is set via the <span className="font-mono">SYSTEM_RESET_PASSWORD</span> environment variable on the server.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setStep('idle'); setConfirmPhrase(''); setResetPassword(''); setError(''); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm transition-colors">
                Cancel
              </button>
              <button onClick={handleReset} disabled={!canReset || resetting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold disabled:opacity-40 transition-colors">
                {resetting ? 'Resetting...' : '⚠ Execute Factory Reset'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
