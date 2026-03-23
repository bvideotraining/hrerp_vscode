// Custom React hook for generic Firestore CRUD operations
'use client';

import { useState, useCallback } from 'react';
import { FirestoreService } from '@/lib/services/firestore.service';
import { QueryConstraint } from 'firebase/firestore';

export function useFirestore<T extends { id?: string }>(collectionName: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const service = new FirestoreService<T>(collectionName);

  const create = useCallback(
    async (data: Partial<T>, createdBy?: string): Promise<string | null> => {
      setLoading(true);
      setError(null);
      try {
        return await service.create(data, createdBy);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Create failed';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [service]
  );

  const getById = useCallback(
    async (id: string): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        return await service.getById(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Fetch failed';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [service]
  );

  const getAll = useCallback(
    async (constraints?: QueryConstraint[]): Promise<T[]> => {
      setLoading(true);
      setError(null);
      try {
        return await service.getAll(constraints);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Fetch failed';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [service]
  );

  const update = useCallback(
    async (id: string, data: Partial<T>, updatedBy?: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await service.update(id, data, updatedBy);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Update failed';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [service]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await service.delete(id);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Delete failed';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [service]
  );

  const batchGet = useCallback(
    async (ids: string[]): Promise<T[]> => {
      setLoading(true);
      setError(null);
      try {
        return await service.batchGet(ids);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Batch fetch failed';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [service]
  );

  const getCount = useCallback(
    async (constraints?: QueryConstraint[]): Promise<number> => {
      setLoading(true);
      setError(null);
      try {
        return await service.getCount(constraints);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Count failed';
        setError(message);
        return 0;
      } finally {
        setLoading(false);
      }
    },
    [service]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    create,
    getById,
    getAll,
    update,
    remove,
    batchGet,
    getCount,
    clearError,
  };
}
