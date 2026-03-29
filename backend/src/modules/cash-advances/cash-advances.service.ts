import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '../../config/firebase/firebase.service';
import {
  CreateCashAdvanceDto,
  UpdateCashAdvanceDto,
  DecideCashAdvanceDto,
} from './dto/cash-advance.dto';

// ─── Role helpers ─────────────────────────────────────────────────────────

/** Application Admin: accessType === 'full' — full CRUD + approve/reject */
function isAppAdmin(accessType: string): boolean {
  return accessType === 'full';
}

/** Finance manager: read-all, no mutations */
function isFinance(role: string): boolean {
  return role === 'finance_manager';
}

/** Can view all employees' requests (but not necessarily mutate) */
function canViewAll(role: string, accessType: string): boolean {
  return isAppAdmin(accessType) || isFinance(role);
}

// ─── Installment schedule helper ──────────────────────────────────────────

export interface InstallmentRow {
  month: string;       // YYYY-MM
  dueAmount: number;
  paidAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
}

/** Add `n` months to a YYYY-MM string */
function addMonths(yyyymm: string, n: number): string {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Round to 2 decimal places */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Generate an installment schedule for a cash advance.
 * The last installment is adjusted so the total equals amount exactly.
 */
function buildSchedule(
  amount: number,
  installmentMonths: number,
  repaymentStartMonth: string,
): InstallmentRow[] {
  const base = r2(amount / installmentMonths);
  const rows: InstallmentRow[] = [];
  let assigned = 0;
  for (let i = 0; i < installmentMonths; i++) {
    const isLast = i === installmentMonths - 1;
    const due = isLast ? r2(amount - assigned) : base;
    rows.push({
      month: addMonths(repaymentStartMonth, i),
      dueAmount: due,
      paidAmount: 0,
      status: 'pending',
    });
    assigned = r2(assigned + due);
  }
  return rows;
}

// ─── Service ─────────────────────────────────────────────────────────────

@Injectable()
export class CashAdvancesService {
  constructor(private firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.getFirestore();
  }

  // ── Create request ──────────────────────────────────────────────────────

  async create(dto: CreateCashAdvanceDto, createdBy: string) {
    const monthlyInstallment = r2(dto.amount / dto.installmentMonths);

    const ref = this.db.collection('cash_advances').doc();
    const data = {
      ...dto,
      monthlyInstallment,
      remainingAmount: dto.amount,
      status: 'pending' as const,
      schedule: [], // populated on approval
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  // ── List (role-scoped) ──────────────────────────────────────────────────

  async findAll(
    requesterId: string,
    requesterRole: string,
    accessType: string,
    employeeId?: string,
    status?: string,
  ) {
    let query: any;

    if (canViewAll(requesterRole, accessType)) {
      // Admin / finance: optionally filter by employeeId
      query = employeeId
        ? this.db.collection('cash_advances').where('employeeId', '==', employeeId)
        : this.db.collection('cash_advances').orderBy('createdAt', 'desc');
    } else {
      // Standard employee: own requests only
      query = this.db
        .collection('cash_advances')
        .where('employeeId', '==', requesterId);
    }

    const snap = await query.get();
    let records = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as any[];

    if (status) {
      records = records.filter((r: any) => r.status === status);
    }

    // Sort descending by createdAt
    records.sort((a: any, b: any) => {
      const ta = a.createdAt?._seconds ?? (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
      const tb = b.createdAt?._seconds ?? (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
      return tb - ta;
    });

    return records;
  }

  // ── Single ──────────────────────────────────────────────────────────────

  async findOne(id: string, requesterId: string, requesterRole: string, accessType: string) {
    const doc = await this.db.collection('cash_advances').doc(id).get();
    if (!doc.exists) throw new NotFoundException('Cash advance request not found');
    const data = { id: doc.id, ...doc.data() } as any;

    if (!canViewAll(requesterRole, accessType)) {
      if (data.employeeId !== requesterId) {
        throw new ForbiddenException('You can only view your own cash advance requests');
      }
    }
    return data;
  }

  // ── Update (admin or pending-owner) ────────────────────────────────────

  async update(
    id: string,
    dto: UpdateCashAdvanceDto,
    requesterId: string,
    requesterRole: string,
    accessType: string,
  ) {
    const doc = await this.db.collection('cash_advances').doc(id).get();
    if (!doc.exists) throw new NotFoundException('Cash advance request not found');
    const existing = doc.data() as any;

    if (isAppAdmin(accessType)) {
      // App admin: can edit anything
    } else {
      // Standard employee: own pending only
      if (existing.employeeId !== requesterId && existing.createdBy !== requesterId) {
        throw new ForbiddenException('You can only modify your own cash advance requests');
      }
      if (existing.status !== 'pending') {
        throw new ForbiddenException('Only pending requests can be modified');
      }
    }

    const updates: any = { ...dto, updatedAt: new Date() };
    // Recalculate derived fields when amount or months change
    const amount = dto.amount ?? existing.amount;
    const months = dto.installmentMonths ?? existing.installmentMonths;
    updates.monthlyInstallment = r2(amount / months);
    updates.remainingAmount = amount; // reset until approved-schedule tracks it

    await this.db.collection('cash_advances').doc(id).update(updates);
    return { id, ...existing, ...updates };
  }

  // ── Decide: approve / reject ────────────────────────────────────────────

  async decide(
    id: string,
    dto: DecideCashAdvanceDto,
    deciderId: string,
    accessType: string,
  ) {
    if (!isAppAdmin(accessType)) {
      throw new ForbiddenException('Only application administrators can approve or reject cash advance requests');
    }

    const doc = await this.db.collection('cash_advances').doc(id).get();
    if (!doc.exists) throw new NotFoundException('Cash advance request not found');
    const existing = doc.data() as any;

    if (existing.status !== 'pending') {
      throw new BadRequestException(`Request is already ${existing.status}`);
    }

    if (dto.status === 'approved') {
      // Enforce single-active-approved-request per employee
      const conflict = await this.db
        .collection('cash_advances')
        .where('employeeId', '==', existing.employeeId)
        .where('status', '==', 'approved')
        .get();
      if (!conflict.empty) {
        throw new ConflictException(
          'Employee already has an active approved cash advance. The existing advance must be fully repaid before a new one can be approved.',
        );
      }

      const schedule = buildSchedule(
        existing.amount,
        existing.installmentMonths,
        existing.repaymentStartMonth,
      );

      const updates = {
        status: 'approved',
        schedule,
        remainingAmount: existing.amount,
        approvedBy: deciderId,
        approvedAt: new Date(),
        note: dto.note ?? null,
        updatedAt: new Date(),
      };
      await this.db.collection('cash_advances').doc(id).update(updates);
      return { id, ...existing, ...updates };
    } else {
      // Reject
      const updates = {
        status: 'rejected',
        schedule: [],
        rejectedBy: deciderId,
        rejectedAt: new Date(),
        rejectionReason: dto.rejectionReason ?? null,
        updatedAt: new Date(),
      };
      await this.db.collection('cash_advances').doc(id).update(updates);
      return { id, ...existing, ...updates };
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────

  async remove(id: string, requesterId: string, requesterRole: string, accessType: string) {
    const doc = await this.db.collection('cash_advances').doc(id).get();
    if (!doc.exists) throw new NotFoundException('Cash advance request not found');
    const existing = doc.data() as any;

    if (!isAppAdmin(accessType)) {
      if (existing.employeeId !== requesterId && existing.createdBy !== requesterId) {
        throw new ForbiddenException('You can only delete your own cash advance requests');
      }
      if (existing.status !== 'pending') {
        throw new ForbiddenException('Only pending requests can be deleted');
      }
    }

    await this.db.collection('cash_advances').doc(id).delete();
    return { success: true };
  }

  // ── Payroll integration: fetch due installment ─────────────────────────

  /**
   * Returns the cash advance installment amount due for a given employee
   * and payroll month. Returns 0 if no approved active advance covers that month.
   */
  async getDueInstallment(employeeId: string, payrollMonth: string): Promise<number> {
    const snap = await this.db
      .collection('cash_advances')
      .where('employeeId', '==', employeeId)
      .where('status', '==', 'approved')
      .get();

    let total = 0;
    for (const doc of snap.docs) {
      const data = doc.data() as any;
      const schedule: InstallmentRow[] = data.schedule ?? [];
      const row = schedule.find((s) => s.month === payrollMonth && s.status === 'pending');
      if (row) {
        total = r2(total + row.dueAmount);
      }
    }
    return total;
  }

  /**
   * Mark a payroll month's installment as paid (called after payroll is published).
   * Updates remainingAmount on the parent request.
   */
  async markInstallmentPaid(employeeId: string, payrollMonth: string): Promise<void> {
    const snap = await this.db
      .collection('cash_advances')
      .where('employeeId', '==', employeeId)
      .where('status', '==', 'approved')
      .get();

    for (const doc of snap.docs) {
      const data = doc.data() as any;
      const schedule: InstallmentRow[] = data.schedule ?? [];
      let changed = false;
      let paidThisMonth = 0;

      const updated = schedule.map((row) => {
        if (row.month === payrollMonth && row.status === 'pending') {
          changed = true;
          paidThisMonth = row.dueAmount;
          return { ...row, paidAmount: row.dueAmount, status: 'paid' as const };
        }
        return row;
      });

      if (changed) {
        const newRemaining = r2((data.remainingAmount ?? 0) - paidThisMonth);
        const allPaid = updated.every((r) => r.status !== 'pending');
        await doc.ref.update({
          schedule: updated,
          remainingAmount: Math.max(0, newRemaining),
          ...(allPaid ? { status: 'completed' } : {}),
          updatedAt: new Date(),
        });
      }
    }
  }
}
