'use client';

import { useState, useEffect } from 'react';
import { organizationService, Department } from '@/lib/services/organization.service';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const EMPTY_FORM: Omit<Department, 'id'> = { name: '', type: 'operation' };

export function DepartmentsTab() {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: 'add' | 'edit'; item: Department | null }>({
    open: false, mode: 'add', item: null,
  });
  const [form, setForm] = useState<Omit<Department, 'id'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const load = () => {
    setLoading(true);
    organizationService.getDepartments()
      .then(setItems)
      .catch((e) => showToast('error', e.message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setModal({ open: true, mode: 'add', item: null }); };
  const openEdit = (item: Department) => {
    setForm({ name: item.name, type: item.type });
    setModal({ open: true, mode: 'edit', item });
  };
  const closeModal = () => setModal({ open: false, mode: 'add', item: null });

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('error', 'Department name is required'); return; }
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        await organizationService.createDepartment(form);
        showToast('success', 'Department created');
      } else if (modal.item?.id) {
        await organizationService.updateDepartment(modal.item.id, form);
        showToast('success', 'Department updated');
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
      await organizationService.deleteDepartment(id);
      showToast('success', 'Department deleted');
      load();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to delete');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div>
      {toast && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>{toast.message}</div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} department{items.length !== 1 ? 's' : ''}</p>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Add Department
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <p className="text-sm">No departments yet. Add your first department.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      item.type === 'operation' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {item.type}
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
                {modal.mode === 'add' ? 'Add Department' : 'Edit Department'}
              </h3>
              <button onClick={closeModal} className="rounded p-1 hover:bg-slate-100"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Department name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type <span className="text-red-500">*</span></label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'operation' | 'non-operation' }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="operation">Operation</option>
                  <option value="non-operation">Non-Operation</option>
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
