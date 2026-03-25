'use client';

import { useState, useEffect, useCallback } from 'react';
import { settingsService, Role } from '@/lib/services/settings.service';
import { organizationService, Branch, Department, JobTitle } from '@/lib/services/organization.service';
import {
  Plus, Pencil, Trash2, X, Lock, Unlock, ShieldCheck,
} from 'lucide-react';

// All available modules for permissions
const MODULES = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'employees', name: 'Employees' },
  { id: 'attendance', name: 'Attendance' },
  { id: 'leaves', name: 'Leaves' },
  { id: 'payroll', name: 'Payroll' },
  { id: 'bonuses', name: 'Bonuses' },
  { id: 'social_insurance', name: 'Social Insurance' },
  { id: 'medical_insurance', name: 'Medical Insurance' },
  { id: 'organization', name: 'Organization' },
  { id: 'cms', name: 'Website CMS' },
  { id: 'reports', name: 'Reports' },
  { id: 'settings', name: 'Settings' },
];

const ACTIONS = ['read', 'create', 'edit', 'delete'] as const;
type Action = (typeof ACTIONS)[number];

function AccessBadge({ type }: { type: 'full' | 'custom' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      type === 'full' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
      {type === 'full' ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      {type === 'full' ? 'Full Access' : 'Custom Access'}
    </span>
  );
}

type ScopeType = 'own' | 'same_branch' | 'same_department' | 'specific_job_titles';

const SCOPE_OPTIONS: { value: ScopeType; label: string; description: string }[] = [
  { value: 'own', label: 'Own data only', description: 'User can only access their own records' },
  { value: 'same_branch', label: 'Same branch employees', description: 'Access employees working in the same branch' },
  { value: 'same_department', label: 'Same department employees', description: 'Access employees in the same department' },
  { value: 'specific_job_titles', label: 'Specific job titles', description: 'Access employees with selected job titles only' },
];

const EMPTY_FORM: Omit<Role, 'id'> = {
  name: '', description: '', accessType: 'full',
  permissions: MODULES.map((m) => ({ moduleId: m.id, moduleName: m.name, actions: [...ACTIONS] })),
  scopeBranches: [], scopeDepartments: [], scopeType: [], scopeJobTitles: [],
};

export default function RolesSection() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<Omit<Role, 'id'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, b, d, jt] = await Promise.all([
        settingsService.getRoles(),
        organizationService.getBranches(),
        organizationService.getDepartments(),
        organizationService.getJobTitles(),
      ]);
      setRoles(r);
      setBranches(b);
      setDepartments(d);
      setJobTitles(jt);
    } catch {
      // Backend unavailable — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (r: Role) => {
    setEditing(r);
    setForm({
      name: r.name, description: r.description || '', accessType: r.accessType,
      permissions: r.permissions?.length
        ? r.permissions
        : MODULES.map((m) => ({ moduleId: m.id, moduleName: m.name, actions: [...ACTIONS] })),
      scopeBranches: r.scopeBranches || [],
      scopeDepartments: r.scopeDepartments || [],
      scopeType: r.scopeType || [],
      scopeJobTitles: r.scopeJobTitles || [],
      isBuiltIn: r.isBuiltIn,
    });
    setModalOpen(true);
  };

  const toggleAction = (moduleId: string, action: Action) => {
    setForm((prev) => ({
      ...prev,
      permissions: (prev.permissions || []).map((p) => {
        if (p.moduleId !== moduleId) return p;
        const has = p.actions.includes(action);
        return { ...p, actions: has ? p.actions.filter((a) => a !== action) : [...p.actions, action] };
      }),
    }));
  };

  const toggleAllActions = (moduleId: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: (prev.permissions || []).map((p) => {
        if (p.moduleId !== moduleId) return p;
        const allSelected = ACTIONS.every((a) => p.actions.includes(a));
        return { ...p, actions: allSelected ? [] : [...ACTIONS] };
      }),
    }));
  };

  const toggleBranch = (id: string) => {
    setForm((prev) => {
      const current = prev.scopeBranches || [];
      const has = current.includes(id);
      return { ...prev, scopeBranches: has ? current.filter((x) => x !== id) : [...current, id] };
    });
  };

  const toggleDepartment = (id: string) => {
    setForm((prev) => {
      const current = prev.scopeDepartments || [];
      const has = current.includes(id);
      return { ...prev, scopeDepartments: has ? current.filter((x) => x !== id) : [...current, id] };
    });
  };

  const toggleScopeType = (type: ScopeType) => {
    setForm((prev) => {
      const current = prev.scopeType || [];
      const has = current.includes(type);
      const next = has ? current.filter((x) => x !== type) : [...current, type];
      // Clear job title selections when specific_job_titles is unchecked
      return {
        ...prev,
        scopeType: next,
        scopeJobTitles: next.includes('specific_job_titles') ? (prev.scopeJobTitles || []) : [],
      };
    });
  };

  const toggleJobTitle = (id: string) => {
    setForm((prev) => {
      const current = prev.scopeJobTitles || [];
      const has = current.includes(id);
      return { ...prev, scopeJobTitles: has ? current.filter((x) => x !== id) : [...current, id] };
    });
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editing?.id) {
        await settingsService.updateRole(editing.id, form);
      } else {
        await settingsService.createRole(form);
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm?.id) return;
    try {
      await settingsService.deleteRole(deleteConfirm.id);
      setDeleteConfirm(null);
      load();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Roles & Permissions</h2>
          <p className="text-sm text-slate-500 mt-0.5">Define roles and control module access for each role</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" /> New Role
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Loading roles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto pb-4">
          {roles.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    r.accessType === 'full' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                    <ShieldCheck className={`h-5 w-5 ${r.accessType === 'full' ? 'text-emerald-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 capitalize">{(r.name || '').replace(/_/g, ' ')}</p>
                    {r.description && <p className="text-xs text-slate-500">{r.description}</p>}
                  </div>
                </div>
                {!r.isBuiltIn && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-slate-100 transition-colors">
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </button>
                    <button onClick={() => setDeleteConfirm(r)} className="p-1.5 rounded hover:bg-red-100 transition-colors">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <AccessBadge type={r.accessType} />
                {r.isBuiltIn && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs">Built-in</span>
                )}
                {(r.scopeBranches || []).length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                    {r.scopeBranches!.length} branch(es)
                  </span>
                )}
                {(r.scopeType || []).length > 0 && (
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                    {r.scopeType!.length} data scope(s)
                  </span>
                )}
              </div>
              {r.accessType === 'custom' && r.permissions && (
                <div className="text-xs text-slate-500">
                  {r.permissions.filter((p) => p.actions.length > 0).length} of {MODULES.length} modules enabled
                </div>
              )}
            </div>
          ))}
          {roles.length === 0 && (
            <div className="col-span-2 text-center py-12 text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
              No custom roles yet. Create one to get started.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">{editing ? 'Edit Role' : 'Create Role'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Name + Description */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Role Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    disabled={form.isBuiltIn}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    placeholder="e.g. Branch Manager" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                  <input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description" />
                </div>
              </div>

              {/* Access Type */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Access Type</label>
                <div className="flex gap-3">
                  {(['full', 'custom'] as const).map((type) => (
                    <button key={type} onClick={() => setForm({ ...form, accessType: type })}
                      className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors text-sm font-medium ${
                        form.accessType === type
                          ? (type === 'full' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-blue-500 bg-blue-50 text-blue-700')
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      {type === 'full' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      {type === 'full' ? 'Full Access' : 'Custom Access'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Module Permissions (custom only) */}
              {form.accessType === 'custom' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Module Permissions</label>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Module</th>
                          {ACTIONS.map((a) => (
                            <th key={a} className="text-center px-2 py-2 font-semibold text-slate-600 capitalize">{a}</th>
                          ))}
                          <th className="text-center px-2 py-2 font-semibold text-slate-600">All</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(form.permissions || []).map((perm) => {
                          const allSelected = ACTIONS.every((a) => perm.actions.includes(a));
                          return (
                            <tr key={perm.moduleId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium text-slate-700">
                                {MODULES.find((m) => m.id === perm.moduleId)?.name || perm.moduleName}
                              </td>
                              {ACTIONS.map((a) => (
                                <td key={a} className="text-center px-2 py-2">
                                  <input type="checkbox" checked={perm.actions.includes(a)}
                                    onChange={() => toggleAction(perm.moduleId, a)}
                                    className="rounded border-slate-300 h-3.5 w-3.5" />
                                </td>
                              ))}
                              <td className="text-center px-2 py-2">
                                <input type="checkbox" checked={allSelected}
                                  onChange={() => toggleAllActions(perm.moduleId)}
                                  className="rounded border-slate-300 h-3.5 w-3.5" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Scope — Branches */}
              {branches.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Scope — Branches
                    <span className="ml-1 font-normal text-slate-400">(leave empty for all branches)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {branches.map((b) => {
                      const selected = (form.scopeBranches || []).includes(b.id!);
                      return (
                        <button key={b.id} onClick={() => toggleBranch(b.id!)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                            selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                          {b.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Scope — Departments */}
              {departments.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Scope — Departments
                    <span className="ml-1 font-normal text-slate-400">(leave empty for all departments)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {departments.map((d) => {
                      const selected = (form.scopeDepartments || []).includes(d.id!);
                      return (
                        <button key={d.id} onClick={() => toggleDepartment(d.id!)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                            selected ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                          {d.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Data Access Scope */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data Access Scope</label>
                <p className="text-xs text-slate-400 mb-3">Define which employee records this role can access</p>
                <div className="space-y-2">
                  {SCOPE_OPTIONS.map((opt) => {
                    const checked = (form.scopeType || []).includes(opt.value);
                    return (
                      <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        checked ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleScopeType(opt.value)}
                          className="mt-0.5 rounded border-slate-300 h-4 w-4 accent-indigo-600"
                        />
                        <div>
                          <p className={`text-sm font-medium ${ checked ? 'text-indigo-700' : 'text-slate-700'}`}>{opt.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{opt.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {/* Job Title Picker — only when specific_job_titles is checked */}
                {(form.scopeType || []).includes('specific_job_titles') && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-600 mb-2">
                      Select job titles
                      <span className="ml-1 font-normal text-slate-400">(leave empty to match all titles)</span>
                    </p>
                    {jobTitles.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No job titles found. Add them in the Organization settings.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {jobTitles.map((jt) => {
                          const selected = (form.scopeJobTitles || []).includes(jt.id!);
                          return (
                            <button key={jt.id} onClick={() => toggleJobTitle(jt.id!)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}>
                              {jt.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.name}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Delete Role</h3>
                <p className="text-sm text-slate-500">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-5">
              Delete role <strong>{deleteConfirm.name}</strong>? Users assigned this role will need to be reassigned.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm">Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
