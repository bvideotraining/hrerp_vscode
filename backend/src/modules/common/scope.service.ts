import { Injectable } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';

const ADMIN_ROLES = ['admin', 'hr_manager'];

/** Normalize role strings: "Branch Approver" → "branch_approver" */
function normalizeRole(role: string): string {
  return (role || '').toLowerCase().replace(/[\s-]+/g, '_');
}

export interface ApproverScope {
  isAdmin: boolean;
  isApprover: boolean;
  isBranchApprover: boolean;
  /** True for standard employees who should only see their own records */
  isOwnScopeOnly: boolean;
  /**
   * Resolved department names the approver is allowed to see.
   * Empty array means no department restriction (admin) or no scope configured.
   */
  allowedDepartments: string[];
  /**
   * Resolved branch names the approver is allowed to see.
   * Empty array means all branches are allowed (applies to approver role).
   */
  allowedBranches: string[];
  /**
   * Resolved job title names for custom job-title-scoped roles.
   * Empty array means no job title restriction.
   */
  scopeJobTitles: string[];
}

@Injectable()
export class ScopeService {
  constructor(private firebaseService: FirebaseService) {
    // Automated debug: log all department IDs/names and all employee department values at startup
    setTimeout(async () => {
      try {
        await this.logAllDepartmentIdsAndNames();
        await this.logAllEmployeeDepartments();
      } catch (err) {
        console.error('[ScopeService] Startup debug logging failed:', err);
      }
    }, 5000); // Delay to ensure Firestore is ready
  }
  /**
   * Debug utility: Log all department IDs and names in the departments collection.
   */
  public async logAllDepartmentIdsAndNames() {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection('departments').get();
    const deptList = [];
    for (const doc of snap.docs) {
      const d = doc.data() as any;
      deptList.push({ id: doc.id, name: d.name });
    }
    console.log('[ScopeService] All departments (ID, name):', deptList);
  }

  /**
   * Resolve the scope for the authenticated user.
   * - admin / accessType=full : no restrictions
   * - approver               : reads scopeDepartments + scopeBranches from role settings, resolves IDs → names
   * - branch_approver        : reads branch from the user's linked employee record
   * - everyone else          : own-scope only
   */
  async resolveScope(userId: string, role: string, accessType: string, employeeId?: string): Promise<ApproverScope> {
    const normalized = normalizeRole(role);
    const isAdminUser = ADMIN_ROLES.includes(normalized) || accessType === 'full';
    const isApprover = normalized === 'approver';
    const isBranchApprover = normalized === 'branch_approver';

    console.log(`[ScopeService] resolveScope: raw role="${role}", normalized="${normalized}", accessType="${accessType}", employeeId="${employeeId}", isAdmin=${isAdminUser}, isApprover=${isApprover}, isBranchApprover=${isBranchApprover}`);

    if (isAdminUser) {
      return {
        isAdmin: true,
        isApprover: false,
        isBranchApprover: false,
        isOwnScopeOnly: false,
        allowedDepartments: [],
        allowedBranches: [],
        scopeJobTitles: [],
      };
    }

    const db = this.firebaseService.getFirestore();

    if (isApprover) {
      const roleDoc = await this.getRoleDocForUser(userId, db);
      const scopeDeptIds: string[] = roleDoc?.scopeDepartments ?? [];
      const scopeBranchIds: string[] = roleDoc?.scopeBranches ?? [];

      const [allowedDepartments, allowedBranches] = await Promise.all([
        this.resolveDeptNames(scopeDeptIds, db),
        scopeBranchIds.length > 0 ? this.resolveBranchNames(scopeBranchIds, db) : Promise.resolve([]),
      ]);

      return {
        isAdmin: false,
        isApprover: true,
        isBranchApprover: false,
        isOwnScopeOnly: false,
        allowedDepartments,
        allowedBranches,
        scopeJobTitles: [],
      };
    }

    if (isBranchApprover) {
      const userBranch = await this.getUserBranch(userId, db, employeeId);
      console.log(`[ScopeService] branch_approver resolved branch: "${userBranch}" (userId=${userId}, employeeId=${employeeId})`);
      return {
        isAdmin: false,
        isApprover: false,
        isBranchApprover: true,
        isOwnScopeOnly: false,
        allowedDepartments: [], // No department restriction — all depts in branch
        allowedBranches: userBranch ? [userBranch] : [],
        scopeJobTitles: [],
      };
    }

    // Custom role — look up scope configuration from the role document
    if (accessType === 'custom') {
      const roleDoc = await this.getRoleDocForUser(userId, db);
      const scopeType: string[] = roleDoc?.scopeType || [];
      const scopeJobTitleIds: string[] = roleDoc?.scopeJobTitles || [];

      if (scopeType.includes('specific_job_titles')) {
        // Resolve job title IDs -> display names
        const resolvedJobTitles = scopeJobTitleIds.length > 0
          ? await this.resolveJobTitleNames(scopeJobTitleIds, db)
          : [];
        return {
          isAdmin: false,
          isApprover: false,
          isBranchApprover: false,
          isOwnScopeOnly: false,
          allowedDepartments: [],
          allowedBranches: [],
          scopeJobTitles: resolvedJobTitles,
        };
      }

      // Custom role scoped to 'own' only
      if (scopeType.length > 0 && scopeType.every((t) => t === 'own')) {
        return {
          isAdmin: false,
          isApprover: false,
          isBranchApprover: false,
          isOwnScopeOnly: true,
          allowedDepartments: [],
          allowedBranches: [],
          scopeJobTitles: [],
        };
      }

      // Custom role with no restrictive scope — full access to all records
      return {
        isAdmin: false,
        isApprover: false,
        isBranchApprover: false,
        isOwnScopeOnly: false,
        allowedDepartments: [],
        allowedBranches: [],
        scopeJobTitles: [],
      };
    }

    // Standard employee (no custom access): own scope only
    return {
      isAdmin: false,
      isApprover: false,
      isBranchApprover: false,
      isOwnScopeOnly: true,
      allowedDepartments: [],
      allowedBranches: [],
      scopeJobTitles: [],
    };
  }

  /**
   * Returns the set of employee IDs the user is allowed to see, for use in
   * attendance and leave record filtering where department is not stored directly.
   *
   * Returns null when the user is an admin (no restriction — caller should fetch all).
   * Returns an empty Set when an approver has no configured scope.
   */
  async getAllowedEmployeeIds(
    userId: string,
    role: string,
    accessType: string,
    employeeId?: string,
  ): Promise<Set<string> | null> {
    const scope = await this.resolveScope(userId, role, accessType, employeeId);

    if (scope.isAdmin) return null;

    const db = this.firebaseService.getFirestore();
    const ids = new Set<string>();

    if (scope.isApprover && scope.allowedDepartments.length > 0) {
      console.log('[ScopeService] Approver allowedDepartments:', scope.allowedDepartments);
      for (const dept of scope.allowedDepartments) {
        const snap = await db.collection('employees').where('department', '==', dept).get();
        console.log(`[ScopeService] Employees found for department '${dept}':`, snap.size);
        for (const doc of snap.docs) {
          const emp = doc.data() as any;
          // If branches are restricted, honour that; empty = all branches
          if (scope.allowedBranches.length === 0 || scope.allowedBranches.includes(emp.branch)) {
            ids.add(doc.id);
          }
        }
      }
    } else if (scope.isBranchApprover && scope.allowedBranches.length > 0) {
      // Branch approver: all employees in their branch, no department restriction
      console.log('[ScopeService] Branch Approver allowedBranches:', scope.allowedBranches);
      for (const branch of scope.allowedBranches) {
        const snap = await db.collection('employees').where('branch', '==', branch).get();
        console.log(`[ScopeService] Employees in branch '${branch}':`, snap.size);
        for (const doc of snap.docs) {
          ids.add(doc.id);
        }
      }
    } else if (scope.scopeJobTitles && scope.scopeJobTitles.length > 0) {
      // Custom job-title-scoped role: return all employee IDs with matching job titles
      for (const jobTitle of scope.scopeJobTitles) {
        const snap = await db.collection('employees').where('jobTitle', '==', jobTitle).get();
        for (const doc of snap.docs) {
          ids.add(doc.id);
        }
      }
    }

    return ids;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Debug utility: Log all unique department values in the employees collection.
   */
  public async logAllEmployeeDepartments() {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection('employees').get();
    const deptSet = new Set<string>();
    for (const doc of snap.docs) {
      const emp = doc.data() as any;
      if (emp.department) deptSet.add(emp.department);
    }
    console.log('[ScopeService] Unique departments in employees collection:', Array.from(deptSet));
  }

  /** Look up the user's record, then resolve and return their role document */
  private async getRoleDocForUser(userId: string, db: any): Promise<any | null> {
    let roleId = '';
    let roleName = '';

    try {
      const sysDoc = await db.collection('systemUsers').doc(userId).get();
      if (sysDoc.exists) {
        const d = sysDoc.data() as any;
        roleId = d.roleId || d.role || '';
        roleName = d.roleName || '';
      } else {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const d = userDoc.data() as any;
          roleId = d.roleId || d.role || '';
          roleName = d.roleName || '';
        }
      }
    } catch {
      /* non-critical */
    }

    return this.getRoleDoc(roleId, roleName, db);
  }

  private async getRoleDoc(
    roleId: string,
    roleName: string,
    db: any,
  ): Promise<any | null> {
    const rolesRef = db.collection('roles');
    if (roleId) {
      const byId = await rolesRef.doc(roleId).get();
      if (byId.exists) return byId.data();
      const byName = await rolesRef.where('name', '==', roleId).limit(1).get();
      if (!byName.empty) return byName.docs[0].data();
    }
    if (roleName) {
      const byRoleName = await rolesRef.where('name', '==', roleName).limit(1).get();
      if (!byRoleName.empty) return byRoleName.docs[0].data();
    }
    return null;
  }

  private async resolveJobTitleNames(ids: string[], db: any): Promise<string[]> {
    if (!ids.length) return [];
    const results = await Promise.allSettled(
      ids.map((id) => db.collection('job_titles').doc(id).get()),
    );
    return results
      .filter((r) => r.status === 'fulfilled' && (r as any).value?.exists)
      .map((r) => ((r as any).value.data() as any).name)
      .filter(Boolean);
  }

  private async resolveDeptNames(ids: string[], db: any): Promise<string[]> {
    if (!ids.length) return [];
    const results = await Promise.allSettled(
      ids.map((id) => db.collection('departments').doc(id).get()),
    );
    const names = results
      .filter((r) => r.status === 'fulfilled' && (r as any).value?.exists)
      .map((r) => {
        const name = ((r as any).value.data() as any).name;
        const id = (r as any).value.id;
        console.log(`[ScopeService] Department ID '${id}' resolved to name: '${name}'`);
        return name;
      })
      .filter(Boolean);
    console.log('[ScopeService] Final resolved department names for scope:', names);
    return names;
  }

  private async resolveBranchNames(ids: string[], db: any): Promise<string[]> {
    if (!ids.length) return [];
    const results = await Promise.allSettled(
      ids.map((id) => db.collection('branches').doc(id).get()),
    );
    return results
      .filter((r) => r.status === 'fulfilled' && (r as any).value?.exists)
      .map((r) => ((r as any).value.data() as any).name)
      .filter(Boolean);
  }

  private async getUserBranch(userId: string, db: any, employeeId?: string): Promise<string | null> {
    try {
      // 1. Try user document (systemUsers first, then users)
      const sysDoc = await db.collection('systemUsers').doc(userId).get();
      if (sysDoc.exists) {
        const d = sysDoc.data() as any;
        if (d?.branch) return d.branch;
        if (d?.branchId) {
          const branchDoc = await db.collection('branches').doc(d.branchId).get();
          if (branchDoc.exists) {
            const branchData = branchDoc.data() as any;
            if (branchData?.name) return branchData.name;
          }
        }
        if (d?.employeeBranch) return d.employeeBranch;
        // Use employeeId from user doc as fallback
        if (!employeeId && d?.employeeId) employeeId = d.employeeId;
      } else {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const d = userDoc.data() as any;
          if (d?.branch) return d.branch;
          if (d?.branchId) {
            const branchDoc = await db.collection('branches').doc(d.branchId).get();
            if (branchDoc.exists) {
              const branchData = branchDoc.data() as any;
              if (branchData?.name) return branchData.name;
            }
          }
          if (d?.employeeBranch) return d.employeeBranch;
          if (!employeeId && d?.employeeId) employeeId = d.employeeId;
        }
      }

      // 2. Fall back to the employee record (most reliable — branch is stored there)
      if (employeeId) {
        const empDoc = await db.collection('employees').doc(employeeId).get();
        if (empDoc.exists) {
          const emp = empDoc.data() as any;
          console.log(`[ScopeService] getUserBranch via employee record: empId=${employeeId}, branch=${emp?.branch}`);
          if (emp?.branch) return emp.branch;
        }
      }
    } catch (err) {
      console.error('[ScopeService] getUserBranch error:', err);
    }
    return null;
  }
}