import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../config/firebase/firebase.service';

export const DEFAULT_ALLOCATIONS: Record<string, number> = {
  annual: 15,
  casual: 6,
  sick: 5,
  death: 3,
  maternity: 0, // set manually by admin
  unpaid: 0,    // no day limit — deducted from salary monthly
};

// Leave types that track a numeric balance (no cap on unpaid)
const BALANCE_TRACKED_TYPES = ['annual', 'casual', 'sick', 'death', 'maternity'];

@Injectable()
export class LeaveBalanceService {
  constructor(private firebaseService: FirebaseService) {}

  private docId(employeeId: string, year: number) {
    return `${employeeId}_${year}`;
  }

  async initializeBalance(employeeId: string, employeeName: string, year?: number) {
    const db = this.firebaseService.getFirestore();
    const y = year ?? new Date().getFullYear();
    const docRef = db.collection('leave_balances').doc(this.docId(employeeId, y));
    const existing = await docRef.get();
    if (existing.exists) {
      return { id: docRef.id, ...existing.data() };
    }
    const data = {
      employeeId,
      employeeName,
      year: y,
      annual:   { allocated: DEFAULT_ALLOCATIONS.annual,   used: 0 },
      casual:   { allocated: DEFAULT_ALLOCATIONS.casual,   used: 0 },
      sick:     { allocated: DEFAULT_ALLOCATIONS.sick,     used: 0 },
      death:    { allocated: DEFAULT_ALLOCATIONS.death,    used: 0 },
      maternity:{ allocated: DEFAULT_ALLOCATIONS.maternity,used: 0 },
      unpaid:   { used: 0 },
      initialized: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await docRef.set(data);
    return { id: docRef.id, ...data };
  }

  async getBalance(employeeId: string, year?: number) {
    const db = this.firebaseService.getFirestore();
    const y = year ?? new Date().getFullYear();
    const doc = await db.collection('leave_balances').doc(this.docId(employeeId, y)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async getAllBalances(year?: number) {
    const db = this.firebaseService.getFirestore();
    const y = year ?? new Date().getFullYear();
    const snap = await db.collection('leave_balances').where('year', '==', y).get();
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  }

  async setBalance(
    employeeId: string,
    employeeName: string,
    updates: { annual?: number; casual?: number; sick?: number; death?: number; maternity?: number },
    year?: number,
  ) {
    const db = this.firebaseService.getFirestore();
    const y = year ?? new Date().getFullYear();
    const docRef = db.collection('leave_balances').doc(this.docId(employeeId, y));
    const existing = await docRef.get();

    if (!existing.exists) {
      await this.initializeBalance(employeeId, employeeName, y);
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (updates.annual   !== undefined) updateData['annual.allocated']    = updates.annual;
    if (updates.casual   !== undefined) updateData['casual.allocated']    = updates.casual;
    if (updates.sick     !== undefined) updateData['sick.allocated']      = updates.sick;
    if (updates.death    !== undefined) updateData['death.allocated']     = updates.death;
    if (updates.maternity !== undefined) updateData['maternity.allocated'] = updates.maternity;

    await docRef.update(updateData);
    const updated = await docRef.get();
    return { id: docRef.id, ...updated.data() };
  }

  async deductBalance(employeeId: string, leaveType: string, days: number, year?: number) {
    const db = this.firebaseService.getFirestore();
    const y = year ?? new Date().getFullYear();
    const docRef = db.collection('leave_balances').doc(this.docId(employeeId, y));
    const existing = await docRef.get();
    if (!existing.exists) return; // no balance record — skip silently

    // Track all recognised types; unpaid tracks usage only
    const isUnpaid = leaveType === 'unpaid';
    const isTracked = BALANCE_TRACKED_TYPES.includes(leaveType) || isUnpaid;
    if (!isTracked) return;

    const data = existing.data() as any;
    const currentUsed = data[leaveType]?.used ?? 0;
    await docRef.update({
      [`${leaveType}.used`]: currentUsed + days,
      updatedAt: new Date(),
    });
  }

  /** Called when an approved leave is cancelled/rejected — restores balance */
  async restoreBalance(employeeId: string, leaveType: string, days: number, year?: number) {
    const db = this.firebaseService.getFirestore();
    const y = year ?? new Date().getFullYear();
    const docRef = db.collection('leave_balances').doc(this.docId(employeeId, y));
    const existing = await docRef.get();
    if (!existing.exists) return;

    const data = existing.data() as any;
    const currentUsed = Math.max(0, (data[leaveType]?.used ?? 0) - days);
    await docRef.update({
      [`${leaveType}.used`]: currentUsed,
      updatedAt: new Date(),
    });
  }

  /**
   * Fetch balances for a specific set of employee IDs for the given year.
   * Retrieves all balances for the year then filters in-memory (avoids composite index).
   */
  async getBalancesByEmployeeIds(employeeIds: string[], year?: number) {
    if (employeeIds.length === 0) return [];
    const db = this.firebaseService.getFirestore();
    const y = year ?? new Date().getFullYear();
    const snap = await db.collection('leave_balances').where('year', '==', y).get();
    const idSet = new Set(employeeIds);
    return snap.docs
      .map((doc: any) => ({ id: doc.id, ...doc.data() }))
      .filter((b: any) => idSet.has(b.employeeId));
  }

  /**
   * Look up the department and branch of a user by their auth userId.
   * Checks systemUsers first (has employeeId link), then employees directly.
   */
  async getUserScopeInfo(userId: string): Promise<{ department: string; branch: string }> {
    const db = this.firebaseService.getFirestore();

    // 1. Try systemUsers to find linked employeeId
    let employeeId: string | null = null;
    try {
      const sysDoc = await db.collection('systemUsers').doc(userId).get();
      if (sysDoc.exists) {
        employeeId = (sysDoc.data() as any)?.employeeId || null;
      }
    } catch { /* ignore */ }

    // 2. Fall back: check if userId IS the employeeId directly
    if (!employeeId) employeeId = userId;

    try {
      const empDoc = await db.collection('employees').doc(employeeId).get();
      if (empDoc.exists) {
        const data = empDoc.data() as any;
        return {
          department: data.department || '',
          branch: data.branch || '',
        };
      }
    } catch { /* ignore */ }

    return { department: '', branch: '' };
  }

  /**
   * Fetch balances scoped to the approver's department (for 'approver' role)
   * or branch (for 'branch_approver' role).
   */
  async getScopedBalances(userId: string, role: string, year?: number) {
    const db = this.firebaseService.getFirestore();
    const y = year ?? new Date().getFullYear();
    const scope = await this.getUserScopeInfo(userId);

    let employeeIds: string[] = [];

    if (role === 'approver' && scope.department) {
      const snap = await db.collection('employees')
        .where('department', '==', scope.department)
        .get();
      employeeIds = snap.docs.map((d: any) => d.id);
    } else if (role === 'branch_approver' && scope.branch) {
      const snap = await db.collection('employees')
        .where('branch', '==', scope.branch)
        .get();
      employeeIds = snap.docs.map((d: any) => d.id);
    }

    return this.getBalancesByEmployeeIds(employeeIds, y);
  }
}
