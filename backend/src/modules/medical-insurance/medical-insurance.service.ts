import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '@config/firebase/firebase.service';
import {
  CreateMedicalInsuranceDto,
  UpdateMedicalInsuranceDto,
  MedicalInsuranceDependentDto,
} from './dto/medical-insurance.dto';

const COLLECTION = 'medical_insurance';

function computeTotals(
  employeeAmount: number,
  dependents: MedicalInsuranceDependentDto[],
) {
  const totalDependentAmount =
    dependents.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalAmount = employeeAmount + totalDependentAmount;
  return {
    totalDependentAmount: Math.round(totalDependentAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    payrollDeductionAmount: Math.round(totalAmount * 100) / 100,
  };
}

@Injectable()
export class MedicalInsuranceService {
  constructor(private firebaseService: FirebaseService) {}

  async findAll(scopeEmployeeId?: string, search?: string) {
    const db = this.firebaseService.getFirestore();
    let query: FirebaseFirestore.Query = db.collection(COLLECTION);
    if (scopeEmployeeId) {
      query = query.where('employeeId', '==', scopeEmployeeId);
    }
    const snap = await query.get();
    let results = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    if (search) {
      const term = search.toLowerCase();
      results = results.filter((r) =>
        r.employeeName?.toLowerCase().includes(term),
      );
    }

    return results.sort((a, b) =>
      (a.employeeName || '').localeCompare(b.employeeName || ''),
    );
  }

  async findOne(id: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(
        `Medical insurance policy '${id}' not found`,
      );
    }
    return { id: doc.id, ...doc.data() };
  }

  async create(dto: CreateMedicalInsuranceDto) {
    const db = this.firebaseService.getFirestore();
    const docId = dto.employeeId;

    const existing = await db.collection(COLLECTION).doc(docId).get();
    if (existing.exists) {
      throw new BadRequestException(
        'A medical insurance policy already exists for this employee. Use edit to update it.',
      );
    }

    const dependents = (dto.dependents || []).map((d) => ({
      ...d,
      id: d.id || uuidv4(),
    }));

    const totals = computeTotals(dto.employeeAmount, dependents);
    const now = new Date().toISOString();

    const data = {
      employeeId: dto.employeeId,
      employeeName: dto.employeeName,
      employeeCode: dto.employeeCode,
      billingMonth: dto.billingMonth,
      enrollmentDate: dto.enrollmentDate,
      employeeAmount: dto.employeeAmount,
      dependents,
      ...totals,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(COLLECTION).doc(docId).set(data);
    return { id: docId, ...data };
  }

  async update(id: string, dto: UpdateMedicalInsuranceDto) {
    const db = this.firebaseService.getFirestore();
    const ref = db.collection(COLLECTION).doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new NotFoundException(
        `Medical insurance policy '${id}' not found`,
      );
    }
    const current = existing.data() as any;

    const newEmployeeAmount =
      dto.employeeAmount !== undefined
        ? dto.employeeAmount
        : current.employeeAmount;

    const rawDependents =
      dto.dependents !== undefined ? dto.dependents : current.dependents || [];

    const dependents = rawDependents.map((d: any) => ({
      ...d,
      id: d.id || uuidv4(),
    }));

    const totals = computeTotals(newEmployeeAmount, dependents);

    const updateData: any = {
      employeeAmount: newEmployeeAmount,
      dependents,
      ...totals,
      updatedAt: new Date().toISOString(),
    };
    if (dto.billingMonth !== undefined)
      updateData.billingMonth = dto.billingMonth;
    if (dto.enrollmentDate !== undefined)
      updateData.enrollmentDate = dto.enrollmentDate;

    await ref.update(updateData);
    return { id, ...current, ...updateData };
  }

  async remove(id: string) {
    const db = this.firebaseService.getFirestore();
    const ref = db.collection(COLLECTION).doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new NotFoundException(
        `Medical insurance policy '${id}' not found`,
      );
    }
    await ref.delete();
    return { id };
  }
}
