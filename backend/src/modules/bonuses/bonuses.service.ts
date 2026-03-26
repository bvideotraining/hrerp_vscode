import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import { CreateBonusDto, UpdateBonusDto, SyncSaturdaysDto } from './dto/bonus.dto';

const SATURDAY_RATES: { keyword: string; rate: number }[] = [
  { keyword: 'helper', rate: 200 },
  { keyword: 'cleaner', rate: 100 },
];

function getSaturdayRate(employee: { jobTitle?: string; department?: string }): number {
  const combined = [employee.jobTitle, employee.department]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  for (const entry of SATURDAY_RATES) {
    if (combined.includes(entry.keyword)) return entry.rate;
  }
  return 0;
}

function computeTotal(data: Partial<CreateBonusDto>): number {
  return (
    (data.saturday || 0) +
    (data.duty || 0) +
    (data.potty || 0) +
    (data.afterSchool || 0) +
    (data.transportation || 0) +
    (data.extraBonus || 0)
  );
}

@Injectable()
export class BonusesService {
  constructor(private firebaseService: FirebaseService) {}

  async findAll(monthId?: string, branch?: string, category?: string, employeeId?: string) {
    const db = this.firebaseService.getFirestore();
    let query: FirebaseFirestore.Query = db.collection('bonuses');

    if (monthId) {
      query = query.where('monthId', '==', monthId);
    }
    // Scope to a specific employee when provided (standard employee role)
    if (employeeId) {
      query = query.where('employeeId', '==', employeeId);
    }

    const snapshot = await query.get();
    let records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];

    if (branch) {
      records = records.filter((r) => r.branch === branch);
    }
    if (category) {
      records = records.filter((r) => r.category === category);
    }

    return records.sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''));
  }

  async upsert(dto: CreateBonusDto) {
    const db = this.firebaseService.getFirestore();
    const docId = `${dto.employeeId}_${dto.monthId}`;
    const total = computeTotal(dto);
    const data = {
      ...dto,
      total,
      updatedAt: new Date().toISOString(),
    };

    const ref = db.collection('bonuses').doc(docId);
    const existing = await ref.get();
    if (existing.exists) {
      await ref.update(data);
    } else {
      await ref.set({ ...data, createdAt: new Date().toISOString() });
    }

    return { id: docId, ...data };
  }

  async update(id: string, dto: UpdateBonusDto) {
    const db = this.firebaseService.getFirestore();
    const ref = db.collection('bonuses').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new NotFoundException(`Bonus record '${id}' not found`);

    const current = existing.data() as any;
    const merged = { ...current, ...dto };
    const total = computeTotal(merged);

    const updateData = { ...dto, total, updatedAt: new Date().toISOString() };
    await ref.update(updateData);

    return { id, ...current, ...updateData };
  }

  async remove(id: string) {
    const db = this.firebaseService.getFirestore();
    const ref = db.collection('bonuses').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new NotFoundException(`Bonus record '${id}' not found`);
    await ref.delete();
    return { id };
  }

  async syncSaturdays(dto: SyncSaturdaysDto) {
    const db = this.firebaseService.getFirestore();

    // Query all attendance records where saturdayWork is true
    const attendanceSnap = await db
      .collection('attendance')
      .where('saturdayWork', '==', true)
      .get();

    // Filter to records within the month's date range (in-memory)
    const startTs = new Date(dto.startDate).getTime();
    const endTs = new Date(dto.endDate).getTime();

    const countByEmployee: Record<string, { count: number; employeeId: string }> = {};
    for (const doc of attendanceSnap.docs) {
      const record = doc.data() as any;
      const recordDate = new Date(record.date).getTime();
      if (recordDate >= startTs && recordDate <= endTs) {
        const empId = record.employeeId;
        if (!countByEmployee[empId]) {
          countByEmployee[empId] = { count: 0, employeeId: empId };
        }
        countByEmployee[empId].count += 1;
      }
    }

    if (Object.keys(countByEmployee).length === 0) {
      return { synced: 0, message: 'No Saturday attendance records found in the given period.' };
    }

    // Fetch all employees at once
    const employeeIds = Object.keys(countByEmployee);
    const employeeDocs = await Promise.all(
      employeeIds.map((id) => db.collection('employees').doc(id).get()),
    );

    const employeeMap: Record<string, any> = {};
    for (const empDoc of employeeDocs) {
      if (empDoc.exists) {
        employeeMap[empDoc.id] = { id: empDoc.id, ...empDoc.data() };
      }
    }

    // Batch upsert saturday amounts
    const batch = db.batch();
    let synced = 0;

    for (const [empId, { count }] of Object.entries(countByEmployee)) {
      const employee = employeeMap[empId];
      if (!employee) continue;

      const rate = getSaturdayRate(employee);
      // Only update employees that have a saturday rate (Helper/Cleaner)
      if (rate === 0) continue;

      const saturdayAmount = count * rate;
      const docId = `${empId}_${dto.monthId}`;
      const ref = db.collection('bonuses').doc(docId);
      const existing = await ref.get();

      if (existing.exists) {
        const current = existing.data() as any;
        const merged = { ...current, saturday: saturdayAmount };
        const total = computeTotal(merged);
        batch.update(ref, {
          saturday: saturdayAmount,
          total,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const newRecord = {
          employeeId: empId,
          employeeName: employee.fullName || '',
          employeeCode: employee.employeeCode || '',
          branch: employee.branch || '',
          category: employee.category || '',
          monthId: dto.monthId,
          monthName: dto.monthName || dto.monthId,
          saturday: saturdayAmount,
          duty: 0,
          potty: 0,
          afterSchool: 0,
          transportation: 0,
          extraBonus: 0,
          notes: '',
          total: saturdayAmount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        batch.set(ref, newRecord);
      }
      synced += 1;
    }

    await batch.commit();
    return { synced, message: `Synced Saturday bonuses for ${synced} employee(s).` };
  }
}
