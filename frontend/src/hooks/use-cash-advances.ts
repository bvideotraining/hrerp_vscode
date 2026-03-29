'use client';

import { useState, useCallback } from 'react';
import { cashAdvancesService } from '@/lib/services/cash-advances.service';
import type {
  CashAdvance,
  CreateCashAdvancePayload,
  UpdateCashAdvancePayload,
  DecideCashAdvancePayload,
} from '@/types/cash-advances';

type StatusMsg = { kind: 'success' | 'error'; text: string } | null;

export function useCashAdvances() {
  const [records, setRecords] = useState<CashAdvance[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusMsg>(null);
  const [search, setSearch] = useState('');

  // ── flash helper ────────────────────────────────────────────────────────
  function flash(kind: 'success' | 'error', text: string) {
    setStatus({ kind, text });
    setTimeout(() => setStatus(null), 4000);
  }

  // ── Load ────────────────────────────────────────────────────────────────
  const load = useCallback(async (employeeId?: string, statusFilter?: string) => {
    setLoading(true);
    try {
      const data = await cashAdvancesService.getAll(employeeId, statusFilter);
      setRecords(data);
    } catch (e: any) {
      flash('error', e.message || 'Failed to load cash advance requests');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Create ──────────────────────────────────────────────────────────────
  const create = useCallback(async (payload: CreateCashAdvancePayload): Promise<boolean> => {
    try {
      const created = await cashAdvancesService.create(payload);
      setRecords((prev) => [created, ...prev]);
      flash('success', 'Cash advance request submitted successfully');
      return true;
    } catch (e: any) {
      flash('error', e.message || 'Failed to submit cash advance request');
      return false;
    }
  }, []);

  // ── Update ──────────────────────────────────────────────────────────────
  const update = useCallback(async (id: string, payload: UpdateCashAdvancePayload): Promise<boolean> => {
    try {
      const updated = await cashAdvancesService.update(id, payload);
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      flash('success', 'Cash advance request updated');
      return true;
    } catch (e: any) {
      flash('error', e.message || 'Failed to update request');
      return false;
    }
  }, []);

  // ── Decide ──────────────────────────────────────────────────────────────
  const decide = useCallback(async (id: string, payload: DecideCashAdvancePayload): Promise<boolean> => {
    try {
      const updated = await cashAdvancesService.decide(id, payload);
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      flash('success', payload.status === 'approved' ? 'Request approved' : 'Request rejected');
      return true;
    } catch (e: any) {
      flash('error', e.message || 'Failed to process decision');
      return false;
    }
  }, []);

  // ── Delete ──────────────────────────────────────────────────────────────
  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await cashAdvancesService.remove(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      flash('success', 'Request deleted');
      return true;
    } catch (e: any) {
      flash('error', e.message || 'Failed to delete request');
      return false;
    }
  }, []);

  return {
    records,
    loading,
    status,
    search,
    setSearch,
    load,
    create,
    update,
    decide,
    remove,
  };
}
