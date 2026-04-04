'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Edit2, Save, X, RotateCw, Eye, EyeOff,
  AlertCircle, CheckCircle2, RefreshCw, Database, Wifi, WifiOff,
  Info, Download,
} from 'lucide-react';

interface Resource {
  key: string;
  value: string;
  label: string;
  category: 'Firebase Client' | 'Firebase Admin' | 'Application';
  isSecret: boolean;
  description: string;
  updatedAt: string;
  envValue?: string;
}

interface EditingState {
  key: string;
  value: string;
}

type SyncStatus = 'synced' | 'differs' | 'override' | 'no-value';

function getSyncStatus(resource: Resource): SyncStatus {
  const stored = resource.value?.trim();
  const env = resource.envValue?.trim();

  if (!stored && !env) return 'no-value';
  if (stored && !env) return 'override';           // stored in DB, not in env
  if (!stored && env) return 'no-value';           // env exists but no DB override
  if (stored === env) return 'synced';             // both match
  return 'differs';                                 // both exist but differ
}

function SyncBadge({ status }: { status: SyncStatus }) {
  const map: Record<SyncStatus, { label: string; className: string }> = {
    synced:   { label: 'In Sync',      className: 'bg-green-100 text-green-800 border-green-200' },
    differs:  { label: 'Override Active', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    override: { label: 'DB Only',      className: 'bg-blue-100 text-blue-800 border-blue-200' },
    'no-value': { label: 'Not Set',    className: 'bg-slate-100 text-slate-500 border-slate-200' },
  };
  const { label, className } = map[status];
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${className}`}>
      {label}
    </span>
  );
}

function MaskedValue({
  value,
  isSecret,
  visible,
  onToggle,
}: {
  value: string;
  isSecret: boolean;
  visible: boolean;
  onToggle: () => void;
}) {
  if (!value) {
    return <span className="text-slate-400 italic text-xs">not set</span>;
  }

  const display = isSecret && !visible ? 'â€¢'.repeat(Math.min(value.length, 16)) : value;

  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <code className="text-xs font-mono text-slate-700 break-all">{display}</code>
      {isSecret && (
        <button
          onClick={onToggle}
          className="flex-shrink-0 p-0.5 hover:bg-slate-200 rounded transition-colors"
          title={visible ? 'Hide' : 'Show'}
        >
          {visible ? <EyeOff className="h-3.5 w-3.5 text-slate-500" /> : <Eye className="h-3.5 w-3.5 text-slate-500" />}
        </button>
      )}
    </span>
  );
}

export function ResourcesTab() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'unknown'>('unknown');
  const [error, setError] = useState('');
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartMessage, setRestartMessage] = useState('');
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [autoFillingKeys, setAutoFillingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError('');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/developer/resources`);

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResources(data || []);
      setConnectionStatus('connected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resources');
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingState || !editingState.value.trim()) {
      setError('Value cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${apiUrl}/api/developer/resources/${encodeURIComponent(editingState.key)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: editingState.value }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update resource');
      }

      setEditingState(null);
      await fetchResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resource');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoFill = async (key: string, envValue: string) => {
    setAutoFillingKeys((prev) => new Set(prev).add(key));
    setError('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${apiUrl}/api/developer/resources/${encodeURIComponent(key)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: envValue }),
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to auto-fill resource');
      }
      await fetchResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-fill failed');
    } finally {
      setAutoFillingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleAutoFillCategory = async (items: Resource[]) => {
    const fillable = items.filter((r) => r.envValue && !r.value);
    for (const r of fillable) {
      await handleAutoFill(r.key, r.envValue!);
    }
  };

  const handleRestartServer = async () => {
    if (!confirm('Are you sure you want to restart the server? This will briefly interrupt service.')) {
      return;
    }

    try {
      setIsRestarting(true);
      setError('');
      setRestartMessage('');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      await fetch(`${apiUrl}/api/developer/restart`, { method: 'POST' }).catch(() => {
        // Expected â€” server is shutting down
      });

      setRestartMessage('Server restarting â€” waiting for it to come back online...');

      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          const healthResponse = await fetch(`${apiUrl}/`);
          if (healthResponse.ok) {
            setRestartMessage('Server restarted successfully!');
            await fetchResources();
            setTimeout(() => setRestartMessage(''), 4000);
            return;
          }
        } catch {
          // Still coming back up
        }
        attempts++;
      }

      setError('Server did not respond after 30 s. Refresh the page and try again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart server');
    } finally {
      setIsRestarting(false);
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setVisibleSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <p className="text-slate-500 text-sm">Connecting to database...</p>
      </div>
    );
  }

  const groupedResources = resources.reduce(
    (acc, resource) => {
      if (!acc[resource.category]) acc[resource.category] = [];
      acc[resource.category].push(resource);
      return acc;
    },
    {} as Record<string, Resource[]>,
  );

  const categoryOrder = ['Firebase Client', 'Firebase Admin', 'Application'];

  return (
    <div className="space-y-6">
      {/* Connection Status Bar */}
      <div className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
        connectionStatus === 'connected'
          ? 'bg-green-50 border-green-200'
          : connectionStatus === 'error'
          ? 'bg-red-50 border-red-200'
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : connectionStatus === 'error' ? (
            <WifiOff className="h-4 w-4 text-red-600" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          )}
          <span className={`font-medium ${
            connectionStatus === 'connected' ? 'text-green-800' : 'text-red-800'
          }`}>
            {connectionStatus === 'connected'
              ? `Connected â€” ${resources.length} resource${resources.length !== 1 ? 's' : ''} loaded from Firestore`
              : connectionStatus === 'error'
              ? 'Connection failed â€” check backend server'
              : 'Checking connection...'}
          </span>
        </div>
        <button
          onClick={fetchResources}
          className="flex items-center gap-1.5 px-3 py-1 text-xs rounded hover:bg-white/60 transition-colors text-slate-600"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-start gap-2 px-1 py-2 bg-slate-50 rounded-lg border border-slate-200">
        <Info className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-600 space-y-1">
          <p><strong>Stored Value</strong> — value saved to Firestore (the DB override). Changes here are persisted.</p>
          <p><strong>Current Env Value</strong> — value actively loaded from the server&apos;s <code className="font-mono bg-slate-200 px-1 rounded">.env</code> file at this moment.</p>
          <p>After editing and saving, click <strong>Restart Server</strong> to apply the stored value as the active runtime value.</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Restart Message */}
      {restartMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-green-700 text-sm">{restartMessage}</p>
        </div>
      )}

      {/* Resource Groups */}
      {categoryOrder.map((category) => {
        const items = groupedResources[category];
        if (!items || items.length === 0) return null;

        const categoryMeta: Record<string, { icon: string; color: string; desc: string }> = {
          'Firebase Client': { icon: '\uD83D\uDD36', color: 'orange', desc: 'Fetched by the frontend at startup via /api/developer/firebase-client-config' },
          'Firebase Admin':  { icon: '\uD83D\uDD12', color: 'red',    desc: 'Used by the backend NestJS process for Admin SDK operations' },
          'Application':     { icon: '\u2699\uFE0F',  color: 'slate',  desc: 'Core application secrets and configuration' },
        };
        const meta = categoryMeta[category] || { icon: '\uD83D\uDCE6', color: 'slate', desc: '' };
        const fillableCount = items.filter((r) => r.envValue && !r.value).length;

        return (
          <div key={category}>
            {/* Category Header */}
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-base">{meta.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{category}</h3>
                  <p className="text-xs text-slate-500">{meta.desc}</p>
                </div>
              </div>
              {fillableCount > 0 && (
                <button
                  onClick={() => handleAutoFillCategory(items)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-medium transition-colors whitespace-nowrap"
                  title={`Auto-fill ${fillableCount} empty value${fillableCount > 1 ? 's' : ''} from current env`}
                >
                  <Download className="h-3.5 w-3.5" />
                  Auto-fill {fillableCount} from env
                </button>
              )}
            </div>

            {/* Resource Cards */}
            <div className="space-y-3 mb-6">
              {items.map((resource) => {
                const syncStatus = getSyncStatus(resource);
                const isEditing = editingState?.key === resource.key;

                return (
                  <div
                    key={resource.key}
                    className={`border rounded-xl overflow-hidden transition-colors ${
                      isEditing ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-200'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{resource.label}</p>
                        {resource.isSecret && (
                          <span className="text-[11px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                            Secret
                          </span>
                        )}
                        <SyncBadge status={syncStatus} />
                      </div>
                      {!isEditing && (
                        <div className="flex items-center gap-2">
                          {resource.envValue && !resource.value && (
                            <button
                              onClick={() => handleAutoFill(resource.key, resource.envValue!)}
                              disabled={autoFillingKeys.has(resource.key)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 border border-emerald-200 rounded-lg transition-colors font-medium"
                              title="Copy current env value into stored DB value"
                            >
                              {autoFillingKeys.has(resource.key)
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Download className="h-3.5 w-3.5" />}
                              Auto-fill
                            </button>
                          )}
                          <button
                            onClick={() => setEditingState({ key: resource.key, value: resource.value || '' })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium border border-slate-200"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Env Key */}
                    <div className="px-4 pb-1 bg-white">
                      <code className="text-[11px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {resource.key}
                      </code>
                    </div>

                    {/* Values Grid */}
                    <div className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-100">
                      {/* Stored Value (DB) */}
                      <div className="px-4 py-3 bg-white">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Database className="h-3.5 w-3.5 text-blue-500" />
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            Stored Value (DB)
                          </span>
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingState.value}
                              onChange={(e) =>
                                setEditingState({ ...editingState, value: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter value..."
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveEdit}
                                disabled={isSaving}
                                className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                              >
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Save
                              </button>
                              <button
                                onClick={() => setEditingState(null)}
                                disabled={isSaving}
                                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <MaskedValue
                            value={resource.value}
                            isSecret={resource.isSecret}
                            visible={visibleSecrets.has(`stored-${resource.key}`)}
                            onToggle={() => toggleSecretVisibility(`stored-${resource.key}`)}
                          />
                        )}
                      </div>

                      {/* Current Env Value (live) */}
                      <div className={`px-4 py-3 ${resource.envValue ? 'bg-white' : 'bg-slate-50'}`}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            Current Env Value
                          </span>
                        </div>
                        <MaskedValue
                          value={resource.envValue || ''}
                          isSecret={resource.isSecret}
                          visible={visibleSecrets.has(`env-${resource.key}`)}
                          onToggle={() => toggleSecretVisibility(`env-${resource.key}`)}
                        />
                        {!resource.envValue && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            Not found in server env
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Updated At */}
                    {resource.updatedAt && (
                      <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-100">
                        <p className="text-[11px] text-slate-400">
                          Last updated: {new Date(resource.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Restart Button */}
      <div className="border-t border-slate-200 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Apply Stored Values</p>
            <p className="text-xs text-slate-500 mt-1">
              Restarting the server causes the backend process to reload. If a process manager (PM2, Docker) is running,
              it will restart and pick up the stored DB values as the new runtime credentials.
              The frontend will re-fetch Firebase client config on the next page refresh.
            </p>
          </div>
          <button
            onClick={handleRestartServer}
            disabled={isRestarting}
            className="flex-shrink-0 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
          >
            {isRestarting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
            {isRestarting ? 'Restarting...' : 'Restart Server'}
          </button>
        </div>
      </div>
    </div>
  );
}
