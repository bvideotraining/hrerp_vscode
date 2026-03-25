'use client';

import {
  Chrome, CheckCircle2, ExternalLink, Shield, Globe, Key,
  ChevronRight, Info,
} from 'lucide-react';

const STEPS = [
  {
    number: 1,
    title: 'Open Firebase Console',
    description: 'Navigate to your Firebase project and open the Authentication section.',
    action: 'https://console.firebase.google.com',
    actionLabel: 'Open Firebase Console',
    notes: ['Make sure you are using the correct Firebase project for this HR ERP instance.'],
  },
  {
    number: 2,
    title: 'Enable Google Sign-In Provider',
    description: 'In Authentication → Sign-in method, find Google and enable it.',
    notes: [
      'Click the "Google" row under Sign-in providers.',
      'Toggle "Enable" to the on position.',
      'Under "Project support email", enter an admin email address.',
      'Click Save.',
    ],
  },
  {
    number: 3,
    title: 'Configure OAuth Consent Screen',
    description: 'Set up the Google OAuth consent screen in Google Cloud Console.',
    action: 'https://console.cloud.google.com/apis/credentials/consent',
    actionLabel: 'Open OAuth Consent',
    notes: [
      'Choose "Internal" if only your organization members should sign in.',
      'Set the App name to match your HR ERP branding.',
      'Add your organization domain to authorized domains.',
    ],
  },
  {
    number: 4,
    title: 'Add Authorized Domains',
    description: 'Tell Firebase which domains are allowed to initiate Google login.',
    notes: [
      'In Firebase Console → Authentication → Settings → Authorized domains.',
      'Add your production domain (e.g. hr.yourdomain.com).',
      'localhost is already included for development.',
    ],
  },
  {
    number: 5,
    title: 'Update Environment Variables',
    description: 'Ensure your frontend environment file has the correct Firebase config.',
    notes: [
      'All NEXT_PUBLIC_FIREBASE_* variables must be set in .env.local.',
      'The firebaseConfig in frontend/src/config/firebase.config.ts auto-reads from env.',
      'Restart the dev server after any .env changes.',
    ],
  },
  {
    number: 6,
    title: 'Test Google Login',
    description: 'Visit the login page and click "Sign in with Google" to verify setup.',
    notes: [
      'A Google account selector popup should appear.',
      'On success, the user is redirected to the dashboard.',
      'Check browser console for any errors related to OAuth redirects.',
    ],
  },
];

export default function AuthSettingsSection() {
  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '(not configured)';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Auth Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Setup guide for Google Authentication integration</p>
      </div>

      <div className="space-y-5 overflow-auto pb-6">
        {/* Status Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Google Authentication via Firebase</p>
            <p className="text-xs text-blue-700 mt-0.5">
              This system uses Firebase Authentication to handle Google OAuth. Follow the steps below to enable
              Google Sign-In for your HR ERP users.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-blue-500 font-mono">Firebase Project:</span>
              <span className="text-xs font-mono font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                {firebaseProjectId}
              </span>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-500" /> How Google Authentication Works
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: Chrome, label: 'User clicks\n"Sign in with Google"', color: 'bg-blue-50 text-blue-600' },
              { icon: Key, label: 'Firebase handles\nOAuth flow securely', color: 'bg-purple-50 text-purple-600' },
              { icon: CheckCircle2, label: 'User lands on\nHR ERP Dashboard', color: 'bg-emerald-50 text-emerald-600' },
            ].map(({ icon: Icon, label, color }, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-50">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-600 text-center whitespace-pre-line">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800">Setup Steps</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {STEPS.map((step) => (
              <div key={step.number} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">{step.title}</h4>
                      {step.action && (
                        <a href={step.action} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline flex-shrink-0">
                          {step.actionLabel} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                    {step.notes.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {step.notes.map((note, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                            <ChevronRight className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                            {note}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Domain note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Globe className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Important: Authorized Domains</p>
            <p className="text-xs text-amber-700 mt-1">
              If users encounter an &ldquo;auth/unauthorized-domain&rdquo; error, your deployment domain has not been
              added to Firebase → Authentication → Settings → Authorized domains. Add it there and the error
              will resolve immediately without a deployment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
