'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { payrollService } from '@/lib/services/payroll.service';
import type { PayrollRecord, PayrollFilters, PayrollListResponse } from '@/types/payroll';

interface UsePayrollReturn {
  records: PayrollRecord[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string;
  filters: PayrollFilters;
  setFilters: (f: PayrollFilters) => void;
  setPage: (p: number) => void;
  reload: () => void;
  publish: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  statusMsg: string;
  clearStatus: () => void;
}

const DEFAULT_LIMIT = 50;

export function usePayroll(initialFilters: PayrollFilters = {}): UsePayrollReturn {
  const [filters, setFiltersState] = useState<PayrollFilters>({ ...initialFilters, page: 1, limit: DEFAULT_LIMIT });
  const [response, setResponse] = useState<PayrollListResponse>({ items: [], total: 0, page: 1, limit: DEFAULT_LIMIT });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const loadingRef = useRef(false);

  const flash = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3500);
  };

  const load = useCallback(async (f: PayrollFilters) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const res = await payrollService.getAll(f);
      setResponse(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load payroll records');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  const setFilters = (f: PayrollFilters) => {
    setFiltersState({ ...f, page: 1, limit: DEFAULT_LIMIT });
  };

  const setPage = (p: number) => {
    setFiltersState((prev) => ({ ...prev, page: p }));
  };

  const reload = () => load(filters);

  const publish = async (id: string) => {
    await payrollService.publish(id);
    flash('Payroll published successfully');
    reload();
  };

  const remove = async (id: string) => {
    await payrollService.remove(id);
    flash('Payroll record deleted');
    reload();
  };

  return {
    records: response.items,
    total: response.total,
    page: response.page,
    limit: response.limit,
    loading,
    error,
    filters,
    setFilters,
    setPage,
    reload,
    publish,
    remove,
    statusMsg,
    clearStatus: () => setStatusMsg(''),
  };
}
