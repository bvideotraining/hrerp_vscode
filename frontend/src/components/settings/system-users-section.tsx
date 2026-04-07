'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { settingsService, SystemUser, Role } from '@/lib/services/settings.service';
import { organizationService, Branch, Department } from '@/lib/services/organization.service';
import { employeeService } from '@/lib/services/employee.service';
import { Employee } from '@/types/employee';
import {
  Plus, Pencil, Trash2, Search, UserCheck, UserX, X, Eye, EyeOff, ChevronDown,
} from 'lucide-react';

function Badge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
      {active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

const EMPTY_FORM: Omit<SystemUser, 'id'> = {
  name: '', email: '', password: '', roleId: '', roleName: '',
  employeeId: '', branchId: '', departmentId: '', phone: '', isActive: true,
  employeeCode: '',
};

export default function SystemUsersSection() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<SystemUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Employee dropdown search state
  const [empSearch, setEmpSearch] = useState('');
  const [empDropOpen, setEmpDropOpen] = useState(false);
  const empDropRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r, b, d, emp] = await Promise.all([
        settingsService.getUsers(),
        settingsService.getRoles(),
        organizationService.getBranches(),
        organizationService.getDepartments(),
        employeeService.getAllEmployees(),
      ]);
      setUsers(u);
      setRoles(r);
      setBranches(b);
      setDepartments(d);
      setEmployees(emp);
    } catch {
      // Backend unavailable — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setEmpSearch('');
    setEmpDropOpen(false);
    setModalOpen(true);
  };

  const openEdit = (u: SystemUser) => {
    setEditing(u);
    setForm({ ...u, password: '' });
    setShowPassword(false);
    setEmpSearch(u.name || '');
    setEmpDropOpen(false);
    setModalOpen(true);
  };

  // Close employee dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (empDropRef.current && !empDropRef.current.contains(e.target as Node)) {
        setEmpDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredEmployees = employees.filter((e) =>
    e.fullName.toLowerCase().includes(empSearch.toLowerCase()) ||
    (e.email || '').toLowerCase().includes(empSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.name || !form.email || !form.roleId) return;
    // When editing a user without an employee code, require one
    if (editing && !(editing as any).employeeCode && !form.employeeCode?.trim()) {
      alert('Employee code is required for this user.');
      return;
    }
    setSaving(true);
    try {
      const roleName = roles.find((r) => r.id === form.roleId)?.name || form.roleId;
      const payload = { ...form, roleName };
      if (!payload.password) delete (payload as any).password;
      if (editing?.id) {
        await settingsService.updateUser(editing.id, payload);
      } else {
        await settingsService.createUser(payload);
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
      await settingsService.deleteUser(deleteConfirm.id);
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
          <h2 className="text-xl font-bold text-slate-900">System Users</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage user accounts and their access levels</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Loading users...</div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Branch</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No users found. Click &ldquo;Add User&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium capitalize">
                        {(u.roleName || u.roleId).replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {branches.find((b) => b.id === u.branchId)?.name || '—'}
                    </td>
                    <td className="px-4 py-3"><Badge active={u.isActive} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-slate-200 transition-colors">
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </button>
                        <button onClick={() => setDeleteConfirm(u)} className="p-1.5 rounded hover:bg-red-100 transition-colors">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">{editing ? 'Edit User' : 'Add User'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div ref={empDropRef} className="relative">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Employee Name *</label>
                  <div className="relative">
                    <input
                      value={empSearch}
                      onChange={(e) => { setEmpSearch(e.target.value); setEmpDropOpen(true); }}
                      onFocus={() => setEmpDropOpen(true)}
                      placeholder="Search employee..."
                      className="w-full px-3 py-2 pr-8 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  {empDropOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredEmployees.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400">
                          {employees.length === 0 ? 'No employees found in the system' : 'No matches'}
                        </div>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, name: emp.fullName, email: emp.email || prev.email, employeeId: emp.id || '' }));
                              setEmpSearch(emp.fullName);
                              setEmpDropOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                          >
                            <p className="text-sm font-medium text-slate-800">{emp.fullName}</p>
                            {emp.email && <p className="text-xs text-slate-400">{emp.email}</p>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="john@company.com" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Password {editing ? '(leave blank to keep current)' : '*'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password || ''}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={editing ? '••••••••' : 'Enter password'}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Role *</label>
                  <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select a role —</option>
                    {roles.length === 0 ? (
                      <option disabled>No roles defined yet</option>
                    ) : (
                      roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))
                    )}
                  </select>
                  {roles.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Go to Roles &amp; Permissions to create roles first.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+1 555 0000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Branch</label>
                  <select value={form.branchId || ''} onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All Branches</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
                  <select value={form.departmentId || ''} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All Departments</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-slate-300" />
                <span className="text-sm text-slate-700">Active account</span>
              </label>

              {/* Employee Code — required when editing user without one */}
              {(editing && !(editing as any).employeeCode) && (
                <div>
                  <label className="block text-xs font-medium text-red-600 mb-1">
                    Employee Code * <span className="text-red-500">(required — this user has no code)</span>
                  </label>
                  <input
                    value={(form as any).employeeCode || ''}
                    onChange={(e) => setForm({ ...form, employeeCode: e.target.value.toUpperCase() } as any)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50"
                    placeholder="e.g. EMP001"
                  />
                </div>
              )}
              {(!editing || (editing as any).employeeCode) && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Employee Code</label>
                  <input
                    value={(form as any).employeeCode || ''}
                    onChange={(e) => setForm({ ...form, employeeCode: e.target.value.toUpperCase() } as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. EMP001"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.email}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create User'}
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
                <h3 className="font-bold text-slate-900">Delete User</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-5">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
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
