'use client';

import { useState, useCallback } from 'react';
import { medicalInsuranceService } from '@/lib/services/medical-insurance.service';
import type {
  MedicalInsuranceRecord,
  CreateMedicalInsurancePayload,
  UpdateMedicalInsurancePayload,
} from '@/types/medical-insurance';

export function useMedicalInsurance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const getAll = useCallback(
    async (employeeId?: string, search?: string): Promise<MedicalInsuranceRecord[]> => {
      setLoading(true);
      setError(null);
      try {
        return await medicalInsuranceService.getAll(employeeId, search);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load policies';
        setError(msg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const create = useCallback(
    async (data: CreateMedicalInsurancePayload): Promise<MedicalInsuranceRecord | null> => {
      setLoading(true);
      setError(null);
      try {
        return await medicalInsuranceService.create(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create policy';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const update = useCallback(
    async (id: string, data: UpdateMedicalInsurancePayload): Promise<MedicalInsuranceRecord | null> => {
      setLoading(true);
      setError(null);
      try {
        return await medicalInsuranceService.update(id, data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update policy';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await medicalInsuranceService.remove(id);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete policy';
        setError(msg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { loading, error, clearError, getAll, create, update, remove };
}
