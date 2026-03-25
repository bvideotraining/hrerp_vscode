import { Injectable, ConflictException } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import { BrandingDto } from './dto/branding.dto';
import { BranchDto } from './dto/branch.dto';
import { DepartmentDto } from './dto/department.dto';
import { JobTitleDto } from './dto/job-title.dto';
import { MonthRangeDto } from './dto/month-range.dto';
import { AttendanceRuleDto } from './dto/attendance-rule.dto';

const DEFAULT_DEDUCTION_SCHEDULE = [
  { upToMinutes: 60, days: 0 },
  { upToMinutes: 120, days: 1 },
  { upToMinutes: 180, days: 2 },
  { upToMinutes: 240, days: 3 },
  { upToMinutes: 300, days: 4 },
  { upToMinutes: 360, days: 5 },
  { upToMinutes: 9999, days: 6 },
];

const DEFAULT_ATTENDANCE_RULES = [
  { category: 'WhiteCollar', workStart: '08:00', workEnd: '16:00', freeMinutes: 60, isFlexible: false, deductionSchedule: DEFAULT_DEDUCTION_SCHEDULE },
  { category: 'BlueCollar', workStart: '07:30', workEnd: '16:00', freeMinutes: 60, isFlexible: false, deductionSchedule: DEFAULT_DEDUCTION_SCHEDULE },
  { category: 'Management', workStart: '09:00', workEnd: '16:00', freeMinutes: 60, isFlexible: false, deductionSchedule: DEFAULT_DEDUCTION_SCHEDULE },
  { category: 'PartTime', workStart: null, workEnd: '16:00', freeMinutes: 60, isFlexible: true, deductionSchedule: DEFAULT_DEDUCTION_SCHEDULE },
];

@Injectable()
export class OrganizationService {
  constructor(private firebaseService: FirebaseService) {}

  // ═══ BRANDING ═══════════════════════════════════════

  async getBranding() {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('organization').doc('branding').get();
    if (!doc.exists) return { appName: 'HR ERP', logoUrl: '' };
    return doc.data();
  }

  async updateBranding(dto: BrandingDto) {
    const db = this.firebaseService.getFirestore();
    await db.collection('organization').doc('branding').set(
      { ...dto, updatedAt: new Date() },
      { merge: true }
    );
    return dto;
  }

  // ═══ BRANCHES ════════════════════════════════════════

  async getBranches() {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection('branches').orderBy('name').get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createBranch(dto: BranchDto) {
    const db = this.firebaseService.getFirestore();
    const existing = await db.collection('branches').where('code', '==', dto.code).limit(1).get();
    if (!existing.empty) throw new ConflictException(`Branch code '${dto.code}' already exists`);
    const ref = db.collection('branches').doc();
    const data = { ...dto, createdAt: new Date(), updatedAt: new Date() };
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  async updateBranch(id: string, dto: BranchDto) {
    const db = this.firebaseService.getFirestore();
    const existing = await db.collection('branches').where('code', '==', dto.code).limit(1).get();
    if (!existing.empty && existing.docs[0].id !== id) throw new ConflictException(`Branch code '${dto.code}' already exists`);
    const data = { ...dto, updatedAt: new Date() };
    await db.collection('branches').doc(id).update(data);
    return { id, ...data };
  }

  async deleteBranch(id: string) {
    const db = this.firebaseService.getFirestore();
    await db.collection('branches').doc(id).delete();
    return { deleted: true };
  }

  // ═══ DEPARTMENTS ══════════════════════════════════════

  async getDepartments() {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection('departments').orderBy('name').get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createDepartment(dto: DepartmentDto) {
    const db = this.firebaseService.getFirestore();
    const existing = await db.collection('departments').where('code', '==', dto.code).limit(1).get();
    if (!existing.empty) throw new ConflictException(`Department code '${dto.code}' already exists`);
    const ref = db.collection('departments').doc();
    const data = { ...dto, createdAt: new Date(), updatedAt: new Date() };
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  async updateDepartment(id: string, dto: DepartmentDto) {
    const db = this.firebaseService.getFirestore();
    const existing = await db.collection('departments').where('code', '==', dto.code).limit(1).get();
    if (!existing.empty && existing.docs[0].id !== id) throw new ConflictException(`Department code '${dto.code}' already exists`);
    const data = { ...dto, updatedAt: new Date() };
    await db.collection('departments').doc(id).update(data);
    return { id, ...data };
  }

  async deleteDepartment(id: string) {
    const db = this.firebaseService.getFirestore();
    await db.collection('departments').doc(id).delete();
    return { deleted: true };
  }

  // ═══ JOB TITLES ══════════════════════════════════════

  async getJobTitles() {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection('job_titles').orderBy('name').get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createJobTitle(dto: JobTitleDto) {
    const db = this.firebaseService.getFirestore();
    const existing = await db.collection('job_titles').where('code', '==', dto.code).limit(1).get();
    if (!existing.empty) throw new ConflictException(`Job title code '${dto.code}' already exists`);
    const ref = db.collection('job_titles').doc();
    const data = { ...dto, createdAt: new Date(), updatedAt: new Date() };
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  async updateJobTitle(id: string, dto: JobTitleDto) {
    const db = this.firebaseService.getFirestore();
    const existing = await db.collection('job_titles').where('code', '==', dto.code).limit(1).get();
    if (!existing.empty && existing.docs[0].id !== id) throw new ConflictException(`Job title code '${dto.code}' already exists`);
    const data = { ...dto, updatedAt: new Date() };
    await db.collection('job_titles').doc(id).update(data);
    return { id, ...data };
  }

  async deleteJobTitle(id: string) {
    const db = this.firebaseService.getFirestore();
    await db.collection('job_titles').doc(id).delete();
    return { deleted: true };
  }

  // ═══ MONTH RANGES ════════════════════════════════════

  async getMonthRanges() {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection('month_ranges').orderBy('monthName').get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createMonthRange(dto: MonthRangeDto) {
    const db = this.firebaseService.getFirestore();
    const ref = db.collection('month_ranges').doc();
    const data = { ...dto, createdAt: new Date(), updatedAt: new Date() };
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  async updateMonthRange(id: string, dto: MonthRangeDto) {
    const db = this.firebaseService.getFirestore();
    const data = { ...dto, updatedAt: new Date() };
    await db.collection('month_ranges').doc(id).update(data);
    return { id, ...data };
  }

  async deleteMonthRange(id: string) {
    const db = this.firebaseService.getFirestore();
    await db.collection('month_ranges').doc(id).delete();
    return { deleted: true };
  }

  // ═══ ATTENDANCE RULES ════════════════════════════════

  async getAttendanceRules() {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection('attendance_rules').get();

    if (snap.empty) {
      // Seed defaults on first access
      const batch = db.batch();
      for (const rule of DEFAULT_ATTENDANCE_RULES) {
        const ref = db.collection('attendance_rules').doc(rule.category);
        batch.set(ref, { ...rule, updatedAt: new Date() });
      }
      await batch.commit();
      return DEFAULT_ATTENDANCE_RULES.map((r) => ({ id: r.category, ...r }));
    }

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async updateAttendanceRule(category: string, dto: AttendanceRuleDto) {
    const db = this.firebaseService.getFirestore();
    await db
      .collection('attendance_rules')
      .doc(category)
      .set({ ...dto, category, updatedAt: new Date() }, { merge: true });
    return { id: category, ...dto };
  }
}
