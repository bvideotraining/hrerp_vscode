'use client';

import { useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { organizationService } from '@/lib/services/organization.service';
import { Employee } from '@/types/employee';

/**
 * Returns a `filterEmployees` function that restricts the employee list
 * based on the current user's role scope configuration.
 *
 * Scope rules (in priority order):
 *  - Full access (`accessType === 'full'` or role admin/hr_manager): all employees returned.
 *  - `specific_job_titles` with IDs: employees whose jobTitle name matches + own record.
 *  - `specific_job_titles` with empty list: all employees (meaning "all titles allowed").
 *  - Anything else: all employees returned (backend may apply further restrictions).
 */
export function useScopeFilter() {
  const { user } = useAuth();

  const filterEmployees = useCallback(
    async <T extends Pick<Employee, 'id' | 'jobTitle'>>(allEmployees: T[]): Promise<T[]> => {
      if (!user) return [];

      // Full-access roles see everything
      const roleKey = (user.role || '').toLowerCase().replace(/[\s-]+/g, '_');
      if (
        user.accessType === 'full' ||
        roleKey === 'admin' ||
        roleKey === 'hr_manager'
      ) {
        return allEmployees;
      }

      const scopeType = user.scopeType || [];
      const scopeJobTitleIds = user.scopeJobTitles || [];

      if (scopeType.includes('specific_job_titles')) {
        // Empty scopeJobTitles = "all titles" — no filtering needed
        if (scopeJobTitleIds.length === 0) return allEmployees;

        // Resolve Firestore job title document IDs → display names
        const jobTitles = await organizationService.getJobTitles();
        const allowedNames = new Set(
          jobTitles
            .filter((jt) => jt.id && scopeJobTitleIds.includes(jt.id))
            .map((jt) => jt.name),
        );

        return allEmployees.filter(
          (e) => e.id === user.employeeId || allowedNames.has(e.jobTitle ?? ''),
        );
      }

      // No specific scope — return all
      return allEmployees;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.accessType, user?.role, user?.employeeId, JSON.stringify(user?.scopeType), JSON.stringify(user?.scopeJobTitles)],
  );

  /**
   * True if the current user has a scope restriction that limits which employees
   * they can see (i.e. they are NOT full-access and have a non-empty job-title scope).
   */
  const hasScopeRestriction = Boolean(
    user &&
      user.accessType !== 'full' &&
      user.role !== 'admin' &&
      user.role !== 'hr_manager' &&
      (user.scopeType || []).includes('specific_job_titles') &&
      (user.scopeJobTitles || []).length > 0,
  );

  return { filterEmployees, hasScopeRestriction };
}
