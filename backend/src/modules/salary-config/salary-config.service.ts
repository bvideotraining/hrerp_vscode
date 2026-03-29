import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import { CashAdvancesService } from '@modules/cash-advances/cash-advances.service';
import {
  CreateSalaryConfigDto,
  UpdateSalaryConfigDto,
  SalaryLineItemDto,
} from './dto/salary-config.dto';

// ─── Deterministic doc-id ──────────────────────────────────────────────────
// One config per employee per month.  The key separates the two parts so that
// employee-id collisions with month prefixes cannot happen.
function makeDocId(employeeId: string, month: string): string {
  return `${employeeId}__${month}`;
}

// ─── Calculation helpers ───────────────────────────────────────────────────
function sumItems(items: SalaryLineItemDto[] | undefined): number {
  return (items || []).reduce((s, i) => s + (i.amount || 0), 0);
}

function computeDerived(
  basicSalary: number,
  increaseAmount: number,
  allowances: SalaryLineItemDto[],
  deductions: SalaryLineItemDto[],
) {
  const r = (n: number) => Math.round(n * 100) / 100;
  const grossSalary = r(basicSalary + increaseAmount);
  const totalAllowances = r(sumItems(allowances));
  const totalDeductions = r(sumItems(deductions));
  const totalSalary = r(grossSalary + totalAllowances - totalDeductions);
  return { grossSalary, totalAllowances, totalDeductions, totalSalary };
}

// ─── Strip class instances to plain objects before writing to Firestore ──────
// ValidationPipe with transform:true turns nested DTOs into class instances;
// Firestore refuses objects with custom prototypes.
function plainLineItems(items: SalaryLineItemDto[] | undefined): object[] {
  return (items || []).map((item) => ({
    name: item.name,
    amount: item.amount,
    ...(item.source !== undefined && { source: item.source }),
  }));
}

// ─── Audit helper ─────────────────────────────────────────────────────────
function buildAuditEntry(
  action: 'create' | 'update' | 'delete',
  record: any,
  actorId: string,
  actorEmail: string,
  changes?: Partial<any>,
) {
  return {
    module: 'salary_configs',
    action,
    documentId: record.id,
    employeeId: record.employeeId,
    employeeName: record.employeeName,
    month: record.month,
    actorId,
    actorEmail,
    changes: changes || null,
    timestamp: new Date().toISOString(),
  };
}

@Injectable()
export class SalaryConfigService {
  constructor(
    private firebaseService: FirebaseService,
    private cashAdvancesService: CashAdvancesService,
  ) {}

  private get db() {
    return this.firebaseService.getFirestore();
  }

  private get col() {
    return this.db.collection('salary_configs');
  }

  // ─── List ────────────────────────────────────────────────────────────────

  /**
   * Return salary configs. Optionally scoped to a specific employee and/or month.
   * Admin callers receive all records; employee callers should pre-filter via controller.
   */
  async findAll(employeeId?: string, month?: string, search?: string) {
    let query: FirebaseFirestore.Query = this.col;
    if (employeeId) query = query.where('employeeId', '==', employeeId);
    if (month) query = query.where('month', '==', month);
    const snap = await query.get();
    let records = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    if (search) {
      const q = search.toLowerCase();
      records = records.filter(
        (r) =>
          (r.employeeName || '').toLowerCase().includes(q) ||
          (r.employeeCode || '').toLowerCase().includes(q),
      );
    }

    return records.sort(
      (a: any, b: any) =>
        ((b.month || '') + (a.employeeName || '')).localeCompare(
          (a.month || '') + (b.employeeName || ''),
        ),
    );
  }

  // ─── Single ──────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const doc = await this.col.doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Salary config '${id}' not found`);
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Load the salary config for a specific employee + month.
   * Returns null instead of throwing when the record does not exist yet.
   */
  async findByEmployeeAndMonth(employeeId: string, month: string) {
    const id = makeDocId(employeeId, month);
    const doc = await this.col.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as any;
  }

  /** Legacy compatibility — returns the most-recent config for an employee across all months. */
  async findByEmployee(employeeId: string) {
    const snap = await this.col
      .where('employeeId', '==', employeeId)
      .orderBy('month', 'desc')
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as any;
  }

  // ─── Create ──────────────────────────────────────────────────────────────

  async create(dto: CreateSalaryConfigDto, actorId = 'system', actorEmail = '') {
    const docId = makeDocId(dto.employeeId, dto.month);
    const existing = await this.col.doc(docId).get();
    if (existing.exists) {
      throw new BadRequestException(
        `A salary config already exists for employee ${dto.employeeId} in month ${dto.month}. Use PUT to update it.`,
      );
    }

    const allowances = plainLineItems(dto.allowances);
    const deductions = plainLineItems(dto.deductions);
    // Use explicitly provided increaseAmount, otherwise default to 0.
    const increaseAmount = dto.increaseAmount ?? 0;
    const derived = computeDerived(dto.basicSalary, increaseAmount, allowances as any, deductions as any);
    const now = new Date().toISOString();

    const data: any = {
      employeeId: dto.employeeId,
      employeeCode: dto.employeeCode,
      employeeName: dto.employeeName,
      department: dto.department,
      branch: dto.branch || '',
      month: dto.month,
      basicSalary: dto.basicSalary,
      increaseAmount,
      allowances,
      deductions,
      notes: dto.notes || '',
      ...derived,
      createdAt: now,
      updatedAt: now,
    };

    await this.col.doc(docId).set(data);

    // Audit log
    await this.db.collection('audit_logs').add(
      buildAuditEntry('create', { id: docId, ...data }, actorId, actorEmail),
    );

    return { id: docId, ...data };
  }

  // ─── Update ──────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateSalaryConfigDto, actorId = 'system', actorEmail = '') {
    const ref = this.col.doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new NotFoundException(`Salary config '${id}' not found`);
    const current = existing.data() as any;

    const allowances =
      dto.allowances !== undefined ? plainLineItems(dto.allowances) : (current.allowances || []);
    const deductions =
      dto.deductions !== undefined ? plainLineItems(dto.deductions) : (current.deductions || []);
    const basicSalary =
      dto.basicSalary !== undefined ? dto.basicSalary : current.basicSalary ?? 0;
    const increaseAmount =
      dto.increaseAmount !== undefined ? dto.increaseAmount : current.increaseAmount ?? 0;
    const derived = computeDerived(basicSalary, increaseAmount, allowances, deductions);

    const updateData: any = {
      ...(dto.employeeCode !== undefined && { employeeCode: dto.employeeCode }),
      ...(dto.employeeName !== undefined && { employeeName: dto.employeeName }),
      ...(dto.department !== undefined && { department: dto.department }),
      ...(dto.branch !== undefined && { branch: dto.branch }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      basicSalary,
      increaseAmount,
      allowances,
      deductions,
      ...derived,
      updatedAt: new Date().toISOString(),
    };

    await ref.update(updateData);

    // Audit log
    await this.db.collection('audit_logs').add(
      buildAuditEntry(
        'update',
        { id, ...current },
        actorId,
        actorEmail,
        { basicSalary, totalSalary: derived.totalSalary },
      ),
    );

    return { id, ...current, ...updateData };
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  async remove(id: string, actorId = 'system', actorEmail = '') {
    const ref = this.col.doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new NotFoundException(`Salary config '${id}' not found`);
    const data = existing.data() as any;

    await ref.delete();

    // Audit log
    await this.db.collection('audit_logs').add(
      buildAuditEntry('delete', { id, ...data }, actorId, actorEmail),
    );

    return { id };
  }

  // ─── Set increase amount (called by payroll engine) ────────────────────

  /**
   * Patch the persisted increaseAmount on a salary config when increaseAmount is
   * resolved externally (e.g. from salary_increases collection).
   * Re-derives all computed totals.  Non-destructive — no audit entry for this
   * automatic reconciliation.
   */
  async setIncreaseAmount(id: string, increaseAmount: number) {
    const ref = this.col.doc(id);
    const existing = await ref.get();
    if (!existing.exists) return null;
    const current = existing.data() as any;
    const derived = computeDerived(
      current.basicSalary ?? 0,
      increaseAmount,
      current.allowances || [],
      current.deductions || [],
    );
    await ref.update({ increaseAmount, ...derived, updatedAt: new Date().toISOString() });
    return { id, ...current, increaseAmount, ...derived };
  }

  // ─── Import aggregation ───────────────────────────────────────────────────

  /**
   * Collect all importable allowances for an employee for a specific month.
   * Returns normalized { name, amount, source } items from the bonuses collection.
   * Caller (controller) merges these with existing rows and deduplicates by source+name.
   */
  async importAllowances(employeeId: string, month: string): Promise<SalaryLineItemDto[]> {
    // `month` is in YYYY-MM format (e.g. "2026-03").
    // Bonus docs use monthName as display string (e.g. "March 2026").
    const [y, m] = month.split('-');
    const monthName = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString(
      'en-US',
      { month: 'long', year: 'numeric' },
    ); // e.g. "March 2026"

    // Query by employeeId only (single-field index always exists), then filter
    // monthName in-memory to avoid needing a composite Firestore index.
    const snap = await this.db
      .collection('bonuses')
      .where('employeeId', '==', employeeId)
      .get();

    if (snap.empty) return [];

    const bonusDoc = snap.docs.find((d) => d.data().monthName === monthName);
    if (!bonusDoc) return [];

    const bonus = bonusDoc.data() as any;
    const items: SalaryLineItemDto[] = [];

    const fields: { key: string; label: string }[] = [
      { key: 'saturday', label: 'Saturday Work' },
      { key: 'duty', label: 'Duty Allowance' },
      { key: 'potty', label: 'Potty Allowance' },
      { key: 'afterSchool', label: 'After School' },
      { key: 'transportation', label: 'Transportation' },
      { key: 'extraBonus', label: 'Extra Bonus' },
    ];

    for (const { key, label } of fields) {
      const amount = bonus[key] ?? 0;
      if (amount > 0) {
        items.push({ name: label, amount, source: 'bonuses' });
      }
    }

    return items;
  }

  /**
   * Collect all importable deductions for an employee for a specific month.
   * Sources: social insurance, medical insurance, cash advance installment.
   * Attendance/leave deductions are read-only at payroll generation time (not stored here).
   */
  async importDeductions(employeeId: string, month: string): Promise<SalaryLineItemDto[]> {
    const [socialDoc, medicalDoc, cashAdvanceAmount] = await Promise.all([
      this.db.collection('social_insurance').doc(employeeId).get(),
      this.db.collection('medical_insurance').doc(employeeId).get(),
      this.cashAdvancesService.getDueInstallment(employeeId, month),
    ]);

    const items: SalaryLineItemDto[] = [];

    if (socialDoc.exists) {
      const data = socialDoc.data() as any;
      const amount = data.employeeShare ?? 0;
      if (amount > 0) {
        items.push({ name: 'Social Insurance', amount, source: 'social_insurance' });
      }
    }

    if (medicalDoc.exists) {
      const data = medicalDoc.data() as any;
      const amount = data.payrollDeductionAmount ?? 0;
      if (amount > 0) {
        items.push({ name: 'Medical Insurance', amount, source: 'medical_insurance' });
      }
    }

    if (cashAdvanceAmount > 0) {
      items.push({ name: 'Cash in Advance', amount: cashAdvanceAmount, source: 'cash_advance' });
    }

    return items;
  }

  /** Merge incoming import items into existing items without duplication.
   *  Deduplication key: source + name combo. Later import replaces earlier amount. */
  mergeItems(
    existing: SalaryLineItemDto[],
    incoming: SalaryLineItemDto[],
  ): SalaryLineItemDto[] {
    const result = [...existing];
    for (const inc of incoming) {
      const key = `${inc.source || 'manual'}::${inc.name.toLowerCase().trim()}`;
      const idx = result.findIndex(
        (r) =>
          `${r.source || 'manual'}::${r.name.toLowerCase().trim()}` === key,
      );
      if (idx >= 0) {
        result[idx] = inc; // update amount in-place
      } else {
        result.push(inc);
      }
    }
    return result;
  }
}
