'use client';

import { useState, useCallback } from 'react';
import { attendanceService } from '@/lib/services/attendance.service';
import { AttendanceRecord, AttendanceFormData, AttendanceFilters } from '@/types/attendance';

export function useAttendance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const createLog = useCallback(
    async (data: AttendanceFormData): Promise<AttendanceRecord | null> => {
      setLoading(true);
      setError(null);
      try {
        return await attendanceService.createLog(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create attendance log');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateLog = useCallback(
    async (id: string, data: Partial<AttendanceFormData>): Promise<AttendanceRecord | null> => {
      setLoading(true);
      setError(null);
      try {
        return await attendanceService.updateLog(id, data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update attendance log');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const deleteLog = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await attendanceService.deleteLog(id);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete attendance log');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getLog = useCallback(
    async (id: string): Promise<AttendanceRecord | null> => {
      setLoading(true);
      setError(null);
      try {
        return await attendanceService.getLogById(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch attendance log');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getAllLogs = useCallback(
    async (filters?: AttendanceFilters): Promise<AttendanceRecord[]> => {
      setLoading(true);
      setError(null);
      try {
        return await attendanceService.getAllLogs(filters);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch attendance records');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const bulkImport = useCallback(
    async (
      records: AttendanceFormData[],
    ): Promise<{ imported: number; records: AttendanceRecord[] } | null> => {
      setLoading(true);
      setError(null);
      try {
        return await attendanceService.bulkImport(records);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bulk import failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getExportData = useCallback(
    async (filters?: AttendanceFilters): Promise<AttendanceRecord[]> => {
      setLoading(true);
      setError(null);
      try {
        return await attendanceService.getExportData(filters);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Export failed');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    error,
    clearError,
    createLog,
    updateLog,
    deleteLog,
    getLog,
    getAllLogs,
    bulkImport,
    getExportData,
  };
}
