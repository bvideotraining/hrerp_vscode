import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import {
  CreateSalaryIncreaseDto,
  UpdateSalaryIncreaseDto,
  BulkSaveIncreaseDto,
} from './dto/salary-increase.dto';

@Injectable()
export class SalaryIncreasesService {
  constructor(private firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.getFirestore();
  }

  async findAll(employeeId?: string, search?: string, year?: string, branch?: string) {
    let query: FirebaseFirestore.Query = this.db.collection('salary_increases');
    if (employeeId) {
      query = query.where('employeeId', '==', employeeId);
    }
    if (branch) {
      query = query.where('branch', '==', branch);
    }
    const snap = await query.get();
    let records = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];

    if (search) {
      const q = search.toLowerCase();
      records = records.filter(
        (r) =>
          (r.employeeName || '').toLowerCase().includes(q) ||
          (r.employeeCode || '').toLowerCase().includes(q),
      );
    }

    // Filter by year on applyMonth field (YYYY-MM)
    if (year) {
      records = records.filter((r) => (r.applyMonth || '').startsWith(year));
    }

    return records.sort((a: any, b: any) =>
      (a.applyMonth || a.effectiveDate || '').localeCompare(b.applyMonth || b.effectiveDate || ''),
    );
  }

  async findOne(id: string) {
    const doc = await this.db.collection('salary_increases').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Salary increase '${id}' not found`);
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Get all effective increases for an employee up to and including the given payroll month.
   * payrollMonth is 'YYYY-MM'.
   * An increase applies when its applyMonth <= payrollMonth (falling back to effectiveDate month).
   */
  async getEffectiveIncreases(employeeId: string, payrollMonth: string): Promise<any[]> {
    const snap = await this.db
      .collection('salary_increases')
      .where('employeeId', '==', employeeId)
      .get();

    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((r: any) => {
        // Use applyMonth (YYYY-MM) if present, otherwise fall back to effectiveDate (YYYY-MM-DD) month
        const scheduleMonth: string =
          r.applyMonth || (r.effectiveDate ? (r.effectiveDate as string).slice(0, 7) : '');
        return scheduleMonth <= payrollMonth;
      });
  }

  /** Sum of all effective increase amounts for an employee in a given payroll month */
  async getTotalIncreaseAmount(employeeId: string, payrollMonth: string): Promise<number> {
    const increases = await this.getEffectiveIncreases(employeeId, payrollMonth);
    return increases.reduce((sum: number, r: any) => sum + (r.increaseAmount || 0), 0);
  }

  async create(dto: CreateSalaryIncreaseDto) {
    const ref = this.db.collection('salary_increases').doc();
    const data = {
      ...dto,
      status: dto.status ?? 'pending',
      // Derive effectiveDate for backward compatibility with payroll resolution
      effectiveDate: `${dto.applyMonth}-01`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  /**
   * Apply a scheduled increase:
   *  1. Sets status → 'applied' on the salary_increase record
   *  2. Creates or updates the salary_config for employee+applyMonth
   *     setting its increaseAmount to this increase's increaseAmount
   */
  async applyScheduledIncrease(id: string) {
    const ref = this.db.collection('salary_increases').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException(`Salary increase '${id}' not found`);
    const record = { id: snap.id, ...snap.data() } as any;

    // 1. Mark as applied
    await ref.update({ status: 'applied', updatedAt: new Date().toISOString() });

    // 2. Upsert salary_config for the employee + applyMonth
    const applyMonth: string = record.applyMonth || (record.effectiveDate ? record.effectiveDate.slice(0, 7) : '');
    if (applyMonth) {
      const configDocId = `${record.employeeId}__${applyMonth}`;
      const configRef = this.db.collection('salary_configs').doc(configDocId);
      const configSnap = await configRef.get();

      const increaseAmount = Number(record.increaseAmount || 0);
      const basicSalary = Number(record.basicSalary || 0);
      const grossSalary = Math.round((basicSalary + increaseAmount) * 100) / 100;

      if (configSnap.exists) {
        const existing = configSnap.data() as any;
        const newGross = Math.round(((existing.basicSalary || basicSalary) + increaseAmount) * 100) / 100;
        const totalSalary = Math.round((newGross + (existing.totalAllowances || 0) - (existing.totalDeductions || 0)) * 100) / 100;
        await configRef.update({
          increaseAmount,
          grossSalary: newGross,
          totalSalary,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const totalSalary = Math.round((grossSalary) * 100) / 100;
        await configRef.set({
          employeeId: record.employeeId,
          employeeCode: record.employeeCode || '',
          employeeName: record.employeeName || '',
          department: record.department || '',
          branch: record.branch || '',
          month: applyMonth,
          basicSalary,
          increaseAmount,
          grossSalary,
          allowances: [],
          deductions: [],
          totalAllowances: 0,
          totalDeductions: 0,
          totalSalary,
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return { id, ...record, status: 'applied' };
  }

  async update(id: string, dto: UpdateSalaryIncreaseDto) {
    const ref = this.db.collection('salary_increases').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new NotFoundException(`Salary increase '${id}' not found`);
    const current = existing.data() as any;
    const updateData: any = { ...dto, updatedAt: new Date().toISOString() };
    // Re-derive effectiveDate if applyMonth is being changed
    if (dto.applyMonth) {
      updateData.effectiveDate = `${dto.applyMonth}-01`;
    }
    await ref.update(updateData);
    return { id, ...current, ...updateData };
  }

  async remove(id: string) {
    const ref = this.db.collection('salary_increases').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new NotFoundException(`Salary increase '${id}' not found`);
    await ref.delete();
    return { id };
  }

  /** Batch create / update / delete in a single request */
  async bulkSave(dto: BulkSaveIncreaseDto) {
    const results: { created: any[]; updated: any[]; deleted: string[]; errors: any[] } = {
      created: [],
      updated: [],
      deleted: [],
      errors: [],
    };

    // Creates
    for (const item of dto.creates || []) {
      try {
        const created = await this.create(item);
        results.created.push(created);
      } catch (e: any) {
        results.errors.push({ action: 'create', employeeId: item.employeeId, error: e.message });
      }
    }

    // Updates
    for (const item of dto.updates || []) {
      try {
        const updated = await this.update(item.id, item.data);
        results.updated.push(updated);
      } catch (e: any) {
        results.errors.push({ action: 'update', id: item.id, error: e.message });
      }
    }

    // Deletes
    for (const id of dto.deletes || []) {
      try {
        await this.remove(id);
        results.deleted.push(id);
      } catch (e: any) {
        results.errors.push({ action: 'delete', id, error: e.message });
      }
    }

    return results;
  }
}
