import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import {
  CreateSalaryIncreaseDto,
  UpdateSalaryIncreaseDto,
} from './dto/salary-increase.dto';

@Injectable()
export class SalaryIncreasesService {
  constructor(private firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.getFirestore();
  }

  async findAll(employeeId?: string, search?: string) {
    let query: FirebaseFirestore.Query = this.db.collection('salary_increases');
    if (employeeId) {
      query = query.where('employeeId', '==', employeeId);
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

    return records.sort((a: any, b: any) =>
      (a.effectiveDate || '').localeCompare(b.effectiveDate || ''),
    );
  }

  async findOne(id: string) {
    const doc = await this.db.collection('salary_increases').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Salary increase '${id}' not found`);
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Get all effective increases for an employee up to and including the given payroll month.
   * payrollMonth is 'YYYY-MM'. effectiveDate is 'YYYY-MM-DD'.
   * An increase applies when its effectiveDate month <= payrollMonth.
   */
  async getEffectiveIncreases(employeeId: string, payrollMonth: string): Promise<any[]> {
    const snap = await this.db
      .collection('salary_increases')
      .where('employeeId', '==', employeeId)
      .get();

    // effectiveDate threshold: payrollMonth is 'YYYY-MM', so cutoff = payrollMonth + '-31'
    const cutoff = `${payrollMonth}-31`;
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((r: any) => (r.effectiveDate || '') <= cutoff);
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  async update(id: string, dto: UpdateSalaryIncreaseDto) {
    const ref = this.db.collection('salary_increases').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new NotFoundException(`Salary increase '${id}' not found`);
    const current = existing.data() as any;
    const updateData = { ...dto, updatedAt: new Date().toISOString() };
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
}
