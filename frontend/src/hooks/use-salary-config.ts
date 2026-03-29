'use client';

import { useState, useCallback, useRef } from 'react';
import { salaryConfigService, salaryIncreasesService } from '@/lib/services/salary-config.service';
import type {
  SalaryConfig,
  SalaryLineItem,
  CreateSalaryConfigPayload,
  UpdateSalaryConfigPayload,
} from '@/types/salary-config';

// ─── Calculation helpers (mirrors backend logic) ──────────────────────────

export function calcDerived(
  basicSalary: number,
  increaseAmount: number,
  allowances: SalaryLineItem[],
  deductions: SalaryLineItem[],
) {
  const r = (n: number) => Math.round(n * 100) / 100;
  const grossSalary = r(basicSalary + increaseAmount);
  const totalAllowances = r(allowances.reduce((s, i) => s + (i.amount || 0), 0));
  const totalDeductions = r(deductions.reduce((s, i) => s + (i.amount || 0), 0));
  const totalSalary = r(grossSalary + totalAllowances - totalDeductions);
  return { grossSalary, totalAllowances, totalDeductions, totalSalary };
}

/** Merge incoming items into existing without duplicating by source+name */
export function mergeLineItems(
  existing: SalaryLineItem[],
  incoming: SalaryLineItem[],
): SalaryLineItem[] {
  const result = [...existing];
  for (const inc of incoming) {
    const key = `${inc.source || 'manual'}::${inc.name.toLowerCase().trim()}`;
    const idx = result.findIndex(
      (r) => `${r.source || 'manual'}::${r.name.toLowerCase().trim()}` === key,
    );
    if (idx >= 0) result[idx] = inc;
    else result.push(inc);
  }
  return result;
}

// ─── Status message helper ────────────────────────────────────────────────

type StatusKind = 'success' | 'error';
interface StatusMsg {
  kind: StatusKind;
  text: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface EditorState {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  branch: string;
  month: string;
  basicSalary: number;
  increaseAmount: number;
  allowances: SalaryLineItem[];
  deductions: SalaryLineItem[];
  notes: string;
  configId: string | null; // null = new record
}

function emptyEditor(
  month: string,
  employeeId = '',
  employeeCode = '',
  employeeName = '',
  department = '',
  branch = '',
): EditorState {
  return {
    employeeId,
    employeeCode,
    employeeName,
    department,
    branch,
    month,
    basicSalary: 0,
    increaseAmount: 0,
    allowances: [],
    deductions: [],
    notes: '',
    configId: null,
  };
}

function configToEditor(cfg: SalaryConfig): EditorState {
  return {
    employeeId: cfg.employeeId,
    employeeCode: cfg.employeeCode,
    employeeName: cfg.employeeName,
    department: cfg.department,
    branch: cfg.branch || '',
    month: cfg.month,
    basicSalary: cfg.basicSalary,
    increaseAmount: cfg.increaseAmount || 0,
    allowances: cfg.allowances || [],
    deductions: cfg.deductions || [],
    notes: cfg.notes || '',
    configId: cfg.id,
  };
}

export function useSalaryConfig() {
  // ─── Shared state ───────────────────────────────────────────────────────
  const [historyRecords, setHistoryRecords] = useState<SalaryConfig[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importingAllowances, setImportingAllowances] = useState(false);
  const [importingDeductions, setImportingDeductions] = useState(false);
  const [importingIncrease, setImportingIncrease] = useState(false);

  const [status, setStatus] = useState<StatusMsg | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Flash message ──────────────────────────────────────────────────────
  const flash = useCallback((kind: StatusKind, text: string) => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setStatus({ kind, text });
    statusTimer.current = setTimeout(() => setStatus(null), 4000);
  }, []);

  // ─── Load history table ─────────────────────────────────────────────────

  const loadHistory = useCallback(
    async (month?: string, employeeId?: string) => {
      setHistoryLoading(true);
      try {
        const records = await salaryConfigService.getAll(employeeId, month, historySearch || undefined);
        setHistoryRecords(records);
      } catch (e: any) {
        flash('error', e.message || 'Failed to load history');
      } finally {
        setHistoryLoading(false);
      }
    },
    [historySearch, flash],
  );

  // ─── Select employee to edit ────────────────────────────────────────────

  const selectEmployee = useCallback(
    async (
      employeeId: string,
      employeeCode: string,
      employeeName: string,
      department: string,
      branch: string,
      month: string,
    ) => {
      setEditorLoading(true);
      try {
        const existing = await salaryConfigService.getByEmployeeAndMonth(employeeId, month);
        if (existing) {
          setEditor(configToEditor(existing));
        } else {
          setEditor(emptyEditor(month, employeeId, employeeCode, employeeName, department, branch));
        }
      } catch (e: any) {
        // Still open an empty draft so the user can see fields and enter data
        setEditor(emptyEditor(month, employeeId, employeeCode, employeeName, department, branch));
        flash('error', 'Could not load existing config — starting with a blank draft');
      } finally {
        setEditorLoading(false);
      }
    },
    [flash],
  );

  // ─── Editor field setters ───────────────────────────────────────────────

  const setBasicSalary = useCallback((v: number) => {
    setEditor((prev) => (prev ? { ...prev, basicSalary: v } : prev));
  }, []);

  const setAllowances = useCallback((items: SalaryLineItem[]) => {
    setEditor((prev) => (prev ? { ...prev, allowances: items } : prev));
  }, []);

  const setDeductions = useCallback((items: SalaryLineItem[]) => {
    setEditor((prev) => (prev ? { ...prev, deductions: items } : prev));
  }, []);

  const setNotes = useCallback((v: string) => {
    setEditor((prev) => (prev ? { ...prev, notes: v } : prev));
  }, []);

  // ─── Import allowances from bonuses ────────────────────────────────────

  const importAllowances = useCallback(async () => {
    if (!editor) return;
    setImportingAllowances(true);
    try {
      const imported = await salaryConfigService.importAllowances(editor.employeeId, editor.month);
      if (imported.length === 0) {
        flash('error', 'No bonus allowances found for this employee and month.');
        return;
      }
      setEditor((prev) =>
        prev
          ? { ...prev, allowances: mergeLineItems(prev.allowances, imported) }
          : prev,
      );
      flash('success', `Imported ${imported.length} allowance item(s) from bonuses.`);
    } catch (e: any) {
      flash('error', e.message || 'Import failed');
    } finally {
      setImportingAllowances(false);
    }
  }, [editor, flash]);

  // ─── Import increase amount from salary increases ──────────────────────

  const importIncreaseAmount = useCallback(async () => {
    if (!editor) return;
    setImportingIncrease(true);
    try {
      const increases = await salaryIncreasesService.getAll(editor.employeeId);
      const effective = increases.filter(
        (r) => (r.applyMonth || '') <= editor.month,
      );
      const total = effective.reduce((s, r) => s + (r.increaseAmount || 0), 0);

      if (effective.length === 0) {
        flash('error', 'No salary increases found for this employee up to the selected month.');
        return;
      }

      // Save to Firestore immediately (don’t wait for React state flush)
      let saved: SalaryConfig;
      if (editor.configId) {
        saved = await salaryConfigService.update(editor.configId, { increaseAmount: total });
      } else {
        saved = await salaryConfigService.create({
          employeeId: editor.employeeId,
          employeeCode: editor.employeeCode,
          employeeName: editor.employeeName,
          department: editor.department,
          branch: editor.branch,
          month: editor.month,
          basicSalary: editor.basicSalary,
          increaseAmount: total,
          allowances: editor.allowances,
          deductions: editor.deductions,
          notes: editor.notes,
        });
      }

      setEditor(configToEditor(saved));
      await loadHistory(editor.month);
      flash(
        'success',
        `Increase amount updated to EGP ${total.toFixed(2)} from ${effective.length} scheduled increase(s) and saved.`,
      );
    } catch (e: any) {
      flash('error', e.message || 'Failed to fetch salary increases');
    } finally {
      setImportingIncrease(false);
    }
  }, [editor, flash, loadHistory]);

  // ─── Import deductions from insurance ──────────────────────────────────

  const importDeductions = useCallback(async () => {
    if (!editor) return;
    setImportingDeductions(true);
    try {
      const imported = await salaryConfigService.importDeductions(editor.employeeId, editor.month);
      if (imported.length === 0) {
        flash('error', 'No insurance deductions found for this employee.');
        return;
      }
      setEditor((prev) =>
        prev
          ? { ...prev, deductions: mergeLineItems(prev.deductions, imported) }
          : prev,
      );
      flash('success', `Imported ${imported.length} deduction item(s).`);
    } catch (e: any) {
      flash('error', e.message || 'Import failed');
    } finally {
      setImportingDeductions(false);
    }
  }, [editor, flash]);

  // ─── Save ───────────────────────────────────────────────────────────────

  const save = useCallback(
    async (month: string) => {
      if (!editor) return;
      setSaving(true);
      try {
        const payload: CreateSalaryConfigPayload = {
          employeeId: editor.employeeId,
          employeeCode: editor.employeeCode,
          employeeName: editor.employeeName,
          department: editor.department,
          branch: editor.branch,
          month,
          basicSalary: editor.basicSalary,
          increaseAmount: editor.increaseAmount,
          allowances: editor.allowances,
          deductions: editor.deductions,
          notes: editor.notes,
        };

        let saved: SalaryConfig;
        if (editor.configId) {
          const updatePayload: UpdateSalaryConfigPayload = {
            basicSalary: payload.basicSalary,
            increaseAmount: payload.increaseAmount,
            allowances: payload.allowances,
            deductions: payload.deductions,
            notes: payload.notes,
          };
          saved = await salaryConfigService.update(editor.configId, updatePayload);
        } else {
          saved = await salaryConfigService.create(payload);
        }

        setEditor(configToEditor(saved));
        flash('success', 'Salary configuration saved successfully.');
        // Refresh history
        await loadHistory(month);
      } catch (e: any) {
        flash('error', e.message || 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [editor, flash, loadHistory],
  );

  // ─── Delete ─────────────────────────────────────────────────────────────

  const deleteRecord = useCallback(
    async (id: string, month: string) => {
      setDeleting(true);
      try {
        await salaryConfigService.remove(id);
        flash('success', 'Salary configuration deleted.');
        // If we just deleted the currently-open record, clear the editor
        setEditor((prev) => (prev?.configId === id ? null : prev));
        await loadHistory(month);
      } catch (e: any) {
        flash('error', e.message || 'Delete failed');
      } finally {
        setDeleting(false);
      }
    },
    [flash, loadHistory],
  );

  // ─── Edit from history ──────────────────────────────────────────────────

  const editFromHistory = useCallback((cfg: SalaryConfig) => {
    setEditor(configToEditor(cfg));
  }, []);
  // ─── Clear editor ─────────────────────────────────────────────

  const clearEditor = useCallback(() => {
    setEditor(null);
  }, []);
  return {
    // History
    historyRecords,
    historyLoading,
    historySearch,
    setHistorySearch,
    loadHistory,

    // Editor
    editor,
    editorLoading,
    clearEditor,
    selectEmployee,
    setBasicSalary,
    setAllowances,
    setDeductions,
    setNotes,

    // Import
    importAllowances,
    importDeductions,
    importIncreaseAmount,
    importingAllowances,
    importingDeductions,
    importingIncrease,

    // Save / delete
    save,
    saving,
    deleteRecord,
    deleting,
    editFromHistory,

    // Status
    status,
    clearStatus: () => setStatus(null),
  };
}
