'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { salaryIncreasesService } from '@/lib/services/salary-config.service';
import type {
  SalaryIncrease,
  CreateSalaryIncreasePayload,
  UpdateSalaryIncreasePayload,
} from '@/types/salary-increases';

// ─── Row types ────────────────────────────────────────────────────────────────

/** A persisted row loaded from the server */
export interface SavedRow extends SalaryIncrease {
  _isDraft: false;
  _isDeleted: boolean;
  _localEdits?: UpdateSalaryIncreasePayload;
}

/** A locally-staged new row not yet saved to Firestore */
export interface DraftRow extends CreateSalaryIncreasePayload {
  _draftId: string; // temp client-side ID
  _isDraft: true;
}

export type IncreaseRow = SavedRow | DraftRow;

// ─── Helper ───────────────────────────────────────────────────────────────────

function currentMonthValue(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSalaryIncreases() {
  // ── Server state ────────────────────────────────────────────────────────
  const [savedRows, setSavedRows] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Draft / edit state ──────────────────────────────────────────────────
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const draftIdCounterRef = useRef(0);

  // ── Pending local edits to saved rows: Map<id, partial update> ──────────
  const [localEdits, setLocalEdits] = useState<Map<string, UpdateSalaryIncreasePayload>>(
    new Map(),
  );

  // ── Pending deletes of saved rows ────────────────────────────────────────
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());

  // ── Filters ─────────────────────────────────────────────────────────────
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterBranch, setFilterBranch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Save state ───────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [flashMsg, setFlashMsg] = useState('');
  const [flashType, setFlashType] = useState<'success' | 'error'>('success');
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Entry form state ─────────────────────────────────────────────────────
  const [form, setForm] = useState<{
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    branch: string;
    department: string;
    jobTitle: string;
    hiringDate: string;
    basicSalary: string;
    grossSalary: string;
    increaseAmount: string;
    applyMonth: string;
    previousIncreaseDate: string;
    nextIncreaseMonth: string;
    newGrossSalary: string;
    reason: string;
    notes: string;
  }>({
    employeeId: '',
    employeeCode: '',
    employeeName: '',
    branch: '',
    department: '',
    jobTitle: '',
    hiringDate: '',
    basicSalary: '',
    grossSalary: '',
    increaseAmount: '',
    applyMonth: currentMonthValue(),
    previousIncreaseDate: '',
    nextIncreaseMonth: '',
    newGrossSalary: '',
    reason: '',
    notes: '',
  });

  // ── Flash helper ─────────────────────────────────────────────────────────

  const flash = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashMsg(msg);
    setFlashType(type);
    flashTimerRef.current = setTimeout(() => setFlashMsg(''), 4000);
  }, []);

  // ── Load / refresh ───────────────────────────────────────────────────────

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await salaryIncreasesService.getAll(
        undefined,
        undefined,
        filterYear || undefined,
        filterBranch || undefined,
      );
      setSavedRows(
        data.map((r) => ({
          ...r,
          _isDraft: false,
          _isDeleted: false,
        })),
      );
    } catch (e: any) {
      setError(e.message || 'Failed to load salary increases');
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterBranch]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // ── Computed display list ────────────────────────────────────────────────

  const displayRows: IncreaseRow[] = [
    ...savedRows
      .filter((r) => {
        if (pendingDeletes.has(r.id)) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (
            !(r.employeeName || '').toLowerCase().includes(q) &&
            !(r.employeeCode || '').toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      })
      .map((r) => ({
        ...r,
        ...(localEdits.get(r.id) || {}),
        _isDraft: false as const,
        _localEdits: localEdits.get(r.id),
      })),
    ...draftRows.filter((d) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (d.employeeName || '').toLowerCase().includes(q) ||
        (d.employeeCode || '').toLowerCase().includes(q)
      );
    }),
  ];

  const isDirty =
    draftRows.length > 0 ||
    localEdits.size > 0 ||
    pendingDeletes.size > 0;

  // ── Entry form actions ───────────────────────────────────────────────────

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Auto-compute newGrossSalary when relevant fields change
    if (field === 'increaseAmount' || field === 'grossSalary') {
      setForm((prev) => {
        const gross = parseFloat(field === 'grossSalary' ? value : prev.grossSalary) || 0;
        const inc = parseFloat(field === 'increaseAmount' ? value : prev.increaseAmount) || 0;
        return {
          ...prev,
          [field]: value,
          newGrossSalary: (gross + inc).toFixed(2),
        };
      });
    }
  }

  function scheduleIncrease(): string | null {
    if (!form.employeeId) return 'Please select an employee.';
    if (!form.increaseAmount || parseFloat(form.increaseAmount) < 0)
      return 'Increase amount must be ≥ 0.';
    if (!form.applyMonth || !/^\d{4}-\d{2}$/.test(form.applyMonth))
      return 'Apply month must be YYYY-MM.';

    // Check for duplicate in drafts
    const dup = draftRows.find(
      (d) => d.employeeId === form.employeeId && d.applyMonth === form.applyMonth,
    );
    if (dup) return 'A draft for this employee and month already exists.';

    const id = `draft_${++draftIdCounterRef.current}`;
    const newDraft: DraftRow = {
      _draftId: id,
      _isDraft: true,
      employeeId: form.employeeId,
      employeeCode: form.employeeCode,
      employeeName: form.employeeName,
      branch: form.branch || undefined,
      department: form.department || undefined,
      jobTitle: form.jobTitle || undefined,
      hiringDate: form.hiringDate || undefined,
      basicSalary: parseFloat(form.basicSalary) || undefined,
      grossSalary: parseFloat(form.grossSalary) || undefined,
      increaseAmount: parseFloat(form.increaseAmount) || 0,
      effectiveDate: `${form.applyMonth}-01`,
      applyMonth: form.applyMonth,
      previousIncreaseDate: form.previousIncreaseDate || undefined,
      nextIncreaseMonth:
        form.nextIncreaseMonth || autoNextMonth(form.applyMonth),
      newGrossSalary: parseFloat(form.newGrossSalary) || undefined,
      reason: form.reason || undefined,
      notes: form.notes || undefined,
    };
    setDraftRows((prev) => [...prev, newDraft]);

    // Reset the form (keep applyMonth and employee selections for convenience)
    setForm((prev) => ({
      ...prev,
      increaseAmount: '',
      basicSalary: '',
      grossSalary: '',
      previousIncreaseDate: '',
      nextIncreaseMonth: '',
      newGrossSalary: '',
      reason: '',
      notes: '',
    }));

    return null;
  }

  function resetForm() {
    setForm({
      employeeId: '',
      employeeCode: '',
      employeeName: '',
      branch: '',
      department: '',
      jobTitle: '',
      hiringDate: '',
      basicSalary: '',
      grossSalary: '',
      increaseAmount: '',
      applyMonth: currentMonthValue(),
      previousIncreaseDate: '',
      nextIncreaseMonth: '',
      newGrossSalary: '',
      reason: '',
      notes: '',
    });
  }

  // ── Row edit / delete ────────────────────────────────────────────────────

  function editDraft(draftId: string, update: Partial<DraftRow>) {
    setDraftRows((prev) =>
      prev.map((d) => (d._draftId === draftId ? { ...d, ...update } : d)),
    );
  }

  function deleteDraft(draftId: string) {
    setDraftRows((prev) => prev.filter((d) => d._draftId !== draftId));
  }

  function editSaved(id: string, update: UpdateSalaryIncreasePayload) {
    setLocalEdits((prev) => {
      const next = new Map(prev);
      next.set(id, { ...(next.get(id) || {}), ...update });
      return next;
    });
  }

  function deleteSaved(id: string) {
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function undoDelete(id: string) {
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // ── Save All ──────────────────────────────────────────────────────────────

  async function saveAll(): Promise<boolean> {
    setSaving(true);
    try {
      const creates = draftRows.map(({ _draftId, _isDraft, ...rest }) => rest as CreateSalaryIncreasePayload);
      const updates = Array.from(localEdits.entries()).map(([id, data]) => ({ id, data }));
      const deletes = Array.from(pendingDeletes);

      const result = await salaryIncreasesService.bulkSave({ creates, updates, deletes });

      if (result.errors && result.errors.length > 0) {
        flash(`Saved with ${result.errors.length} error(s). Check the console.`, 'error');
        console.error('Bulk save errors:', result.errors);
      } else {
        flash(
          `Saved: ${result.created.length} added, ${result.updated.length} updated, ${result.deleted.length} deleted.`,
        );
      }

      // Clear local state and reload
      setDraftRows([]);
      setLocalEdits(new Map());
      setPendingDeletes(new Set());
      await loadRows();
      return true;
    } catch (e: any) {
      flash(e.message || 'Save failed', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }

  // ── Discard all pending changes ──────────────────────────────────────────

  function discardAll() {
    setDraftRows([]);
    setLocalEdits(new Map());
    setPendingDeletes(new Set());
  }

  return {
    // State
    savedRows,
    draftRows,
    displayRows,
    loading,
    error,
    isDirty,
    saving,
    flashMsg,
    flashType,

    // Filters
    filterYear,
    setFilterYear,
    filterBranch,
    setFilterBranch,
    searchQuery,
    setSearchQuery,

    // Form
    form,
    updateForm,
    resetForm,
    scheduleIncrease,

    // Row ops
    editDraft,
    deleteDraft,
    editSaved,
    deleteSaved,
    undoDelete,
    pendingDeletes,

    // Persist
    saveAll,
    discardAll,
    reload: loadRows,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Auto-suggest next increase month: applyMonth + 12 months */
function autoNextMonth(applyMonth: string): string {
  if (!applyMonth || !/^\d{4}-\d{2}$/.test(applyMonth)) return '';
  const [y, m] = applyMonth.split('-').map(Number);
  const next = new Date(y, m - 1 + 12, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}
