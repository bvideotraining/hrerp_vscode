import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { CreateLeaveDto, UpdateLeaveDto } from './dto/leave.dto';
import { LeaveBalanceService } from './leave-balance.service';

const ADMIN_ROLES = ['admin', 'hr_manager'];
const APPROVER_ROLES = ['approver', 'branch_approver'];
const ALL_PRIVILEGED = [...ADMIN_ROLES, ...APPROVER_ROLES];

/** Application Admin has role='employee' but accessType='full' — treat as admin */
function isAdmin(role: string, accessType: string): boolean {
  return ADMIN_ROLES.includes(role) || accessType === 'full';
}

@Injectable()
export class LeavesService {
  constructor(
    private firebaseService: FirebaseService,
    private leaveBalanceService: LeaveBalanceService,
  ) {}

  async create(dto: CreateLeaveDto, createdBy: string) {
    const db = this.firebaseService.getFirestore();
    const ref = db.collection('leaves').doc();
    const data = {
      ...dto,
      status: 'pending',
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  /**
   * Find leave requests with optional filters.
   * Role-aware: branch_approver automatically filtered to their branch.
   */
  async findAll(
    employeeId?: string,
    status?: string,
    requesterRole?: string,
    requesterId?: string,
    accessType?: string,
  ) {
    const db = this.firebaseService.getFirestore();
    let query: any;
    if (employeeId) {
      query = db.collection('leaves').where('employeeId', '==', employeeId);
    } else {
      query = db.collection('leaves').orderBy('createdAt', 'desc');
    }
    const snap = await query.get();
    let records = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as any[];

    // Filter by status in-memory to avoid composite Firestore indexes
    if (status) {
      records = records.filter((r: any) => r.status === status);
    }

    // Application Admin (accessType='full') sees all — no branch filter
    if (isAdmin(requesterRole || '', accessType || '')) return records;

    // Branch approver: restrict to leaves in their branch
    if (requesterRole === 'branch_approver' && requesterId) {
      const userBranch = await this.getUserBranch(requesterId);
      if (userBranch) {
        records = records.filter((r: any) => r.employeeBranch === userBranch);
      }
    }

    // Sort in-memory descending by createdAt
    records.sort((a: any, b: any) => {
      const ta = a.createdAt?._seconds ?? 0;
      const tb = b.createdAt?._seconds ?? 0;
      return tb - ta;
    });
    return records;
  }

  async findOne(id: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('leaves').doc(id).get();
    if (!doc.exists) throw new NotFoundException('Leave request not found');
    return { id: doc.id, ...doc.data() };
  }

  async update(
    id: string,
    dto: UpdateLeaveDto,
    requesterId: string,
    requesterRole: string,
    accessType: string = '',
  ) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('leaves').doc(id).get();
    if (!doc.exists) throw new NotFoundException('Leave request not found');

    const existing = doc.data() as any;
    const isAdminUser = isAdmin(requesterRole, accessType);
    const isApprover = requesterRole === 'approver';
    const isBranchApprover = requesterRole === 'branch_approver';

    if (isAdminUser) {
      // Admin/HR: full access — no restrictions
    } else if (isApprover) {
      // Approver: can only approve/reject pending leaves
      if (existing.status !== 'pending') {
        throw new ForbiddenException('Only pending requests can be approved or rejected');
      }
      const allowed = new Set(['status', 'approvedBy', 'rejectedReason']);
      (Object.keys(dto) as (keyof UpdateLeaveDto)[]).forEach((k) => {
        if (!allowed.has(k)) delete dto[k];
      });
    } else if (isBranchApprover) {
      // Branch approver: can only approve/reject pending leaves within their branch
      if (existing.status !== 'pending') {
        throw new ForbiddenException('Only pending requests can be approved or rejected');
      }
      const userBranch = await this.getUserBranch(requesterId);
      if (userBranch && existing.employeeBranch && existing.employeeBranch !== userBranch) {
        throw new ForbiddenException('You can only approve leave requests for employees in your branch');
      }
      const allowed = new Set(['status', 'approvedBy', 'rejectedReason']);
      (Object.keys(dto) as (keyof UpdateLeaveDto)[]).forEach((k) => {
        if (!allowed.has(k)) delete dto[k];
      });
    } else {
      // Regular employee: can only edit their own pending requests (no approve/reject)
      if (existing.employeeId !== requesterId && existing.createdBy !== requesterId) {
        throw new ForbiddenException('You can only modify your own leave requests');
      }
      if (existing.status !== 'pending') {
        throw new ForbiddenException('Only pending requests can be modified');
      }
      delete dto.status;
      delete dto.approvedBy;
      delete dto.rejectedReason;
    }

    const wasApproved = existing.status === 'approved';
    const nowApproved = dto.status === 'approved';
    const nowRejected = dto.status === 'rejected';

    const data = { ...dto, updatedAt: new Date() };
    await db.collection('leaves').doc(id).update(data);

    // Sync leave balance
    const leaveYear = existing.startDate
      ? new Date(existing.startDate).getFullYear()
      : new Date().getFullYear();

    if (!wasApproved && nowApproved) {
      // Newly approved → deduct from balance
      await this.leaveBalanceService.deductBalance(
        existing.employeeId,
        existing.leaveType,
        existing.totalDays,
        leaveYear,
      );
    } else if (wasApproved && (nowRejected || dto.status === 'pending')) {
      // Un-approved → restore balance
      await this.leaveBalanceService.restoreBalance(
        existing.employeeId,
        existing.leaveType,
        existing.totalDays,
        leaveYear,
      );
    }

    return { id, ...existing, ...data };
  }

  async remove(id: string, requesterId: string, requesterRole: string, accessType: string = '') {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('leaves').doc(id).get();
    if (!doc.exists) throw new NotFoundException('Leave request not found');

    const existing = doc.data() as any;

    if (!isAdmin(requesterRole, accessType)) {
      if (existing.employeeId !== requesterId && existing.createdBy !== requesterId) {
        throw new ForbiddenException('You can only cancel your own leave requests');
      }
      if (existing.status !== 'pending') {
        throw new ForbiddenException('Only pending requests can be cancelled');
      }
    }

    await db.collection('leaves').doc(id).delete();
    return { deleted: true };
  }

  /** Look up the branch associated with a user from systemUsers / users collection */
  private async getUserBranch(userId: string): Promise<string | null> {
    const db = this.firebaseService.getFirestore();
    const sysDoc = await db.collection('systemUsers').doc(userId).get();
    if (sysDoc.exists) {
      const d = sysDoc.data() as any;
      return d?.branch || d?.employeeBranch || null;
    }
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const d = userDoc.data() as any;
      return d?.branch || d?.employeeBranch || null;
    }
    return null;
  }
}
