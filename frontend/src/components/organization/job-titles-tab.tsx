'use client';

import { useState, useEffect } from 'react';
import { organizationService, JobTitle, Department } from '@/lib/services/organization.service';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const CATEGORIES = ['WhiteCollar', 'BlueCollar', 'Management', 'PartTime'];

const EMPTY_FORM: Omit<JobTitle, 'id'> = { name: '', department: '', category: 'WhiteCollar' };

export function JobTitlesTab() {
  const [items, setItems] = useState<JobTitle[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: 'add' | 'edit'; item: JobTitle | null }>({
    open: false, mode: 'add', item: null,
  });
  const [form, setForm] = useState<Omit<JobTitle, 'id'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [jobTitles, depts] = await Promise.all([
        organizationService.getJobTitles(),
        organizationService.getDepartments(),
      ]);
      setItems(jobTitles);
      setDepartments(depts);
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    const defaultDept = departments[0]?.name || '';
    setForm({ ...EMPTY_FORM, department: defaultDept });
    setModal({ open: true, mode: 'add', item: null });
  };
  const openEdit = (item: JobTitle) => {
    setForm({ name: item.name, department: item.department, category: item.category });
    setModal({ open: true, mode: 'edit', item });
  };
  const closeModal = () => setModal({ open: false, mode: 'add', item: null });

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('error', 'Job title name is required'); return; }
    if (!form.department) { showToast('error', 'Department is required'); return; }
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        await organizationService.createJobTitle(form);
        showToast('success', 'Job title created');
      } else if (modal.item?.id) {
        await organizationService.updateJobTitle(modal.item.id, form);
        showToast('success', 'Job title updated');
      }
      closeModal();
      load();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await organizationService.deleteJobTitle(id);
      showToast('success', 'Job title deleted');
      load();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to delete');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const categoryColor: Record<string, string> = {
    WhiteCollar: 'bg-blue-100 text-blue-700',
    BlueCollar: 'bg-indigo-100 text-indigo-700',
    Management: 'bg-amber-100 text-amber-700',
    PartTime: 'bg-slate-100 text-slate-700',
  };

  return (
    <div>
      {toast && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>{toast.message}</div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} job title{items.length !== 1 ? 's' : ''}</p>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Add Job Title
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <p className="text-sm">No job titles yet. Add your first job title.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.department}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor[item.category] || 'bg-slate-100 text-slate-700'}`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(item)} className="rounded p-1.5 hover:bg-slate-100 text-slate-500 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      {deleteConfirm === item.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(item.id!)} className="rounded p-1.5 hover:bg-red-100 text-red-600 transition-colors"><Check className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteConfirm(null)} className="rounded p-1.5 hover:bg-slate-100 text-slate-500 transition-colors"><X className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(item.id!)} className="rounded p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {modal.mode === 'add' ? 'Add Job Title' : 'Edit Job Title'}
              </h3>
              <button onClick={closeModal} className="rounded p-1 hover:bg-slate-100"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. HR Manager" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Select department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={closeModal} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : modal.mode === 'add' ? 'Create' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
