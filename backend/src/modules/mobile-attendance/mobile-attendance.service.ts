import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import { MobileCheckinDto, CheckinType } from './dto/mobile-checkin.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { CreateBranchAssignmentDto, BranchAssignmentResponse } from './dto/branch-assignment.dto';
import { v4 as uuidv4 } from 'uuid';

/** Haversine formula — returns distance in metres between two GPS coordinates */
function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

@Injectable()
export class MobileAttendanceService {
  constructor(private readonly firebaseService: FirebaseService) {}

  /** POST /api/mobile-attendance/checkin */
  async checkin(dto: MobileCheckinDto, userId: string) {
    const db = this.firebaseService.getFirestore();

    // Resolve employeeId: prefer body, fall back to JWT sub
    const employeeId = dto.employeeId || userId;

    // Resolve branchId: prefer body, fall back to employee's assigned branch
    let branchId = dto.branchId;
    if (!branchId) {
      const empSnap = await db.collection('employees').doc(employeeId).get();
      if (empSnap.exists) {
        branchId = (empSnap.data() as any).branchId;
      }
      if (!branchId) {
        // Last resort: first active branch
        const bSnap = await db.collection('branches').limit(1).get();
        if (!bSnap.empty) branchId = bSnap.docs[0].id;
      }
    }
    if (!branchId) throw new NotFoundException('No branch assigned to this employee');

    // 1. Load branch and verify it has GPS co-ordinates
    const branchDoc = await db.collection('branches').doc(branchId).get();
    if (!branchDoc.exists) throw new NotFoundException('Branch not found');
    const branch = branchDoc.data() as any;

    if (branch.latitude == null || branch.longitude == null) {
      throw new BadRequestException('Branch has no GPS geofence configured');
    }

    // 2. Geofence check
    const distance = haversineMetres(branch.latitude, branch.longitude, dto.latitude, dto.longitude);
    const radius = branch.radius ?? 50;
    if (distance > radius) {
      throw new ForbiddenException(`You are ${Math.round(distance)}m from the branch (max ${radius}m)`);
    }

    // 3. Determine today's date string (YYYY-MM-DD, UTC)
    const today = new Date().toISOString().split('T')[0];

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5); // HH:MM

    if (dto.type === CheckinType.CHECK_IN) {
      // Find the latest open record for today (has checkIn but no checkOut)
      const todaySnap = await db
        .collection('attendance')
        .where('employeeId', '==', employeeId)
        .where('date', '==', today)
        .get();

      const openRecord = todaySnap.docs
        .map((d) => d.data())
        .find((d) => d.checkIn && !d.checkOut);

      if (openRecord) {
        throw new BadRequestException('Already checked in. Please check out before checking in again.');
      }

      // Resolve branch-specific employee code from assignment sub-collection
      let branchEmployeeCode: string | null = null;
      const assignmentDoc = await db
        .collection('employees').doc(employeeId)
        .collection('branch_assignments').doc(branchId)
        .get();
      if (assignmentDoc.exists) {
        branchEmployeeCode = (assignmentDoc.data() as any).employeeCode || null;
      }
      // Fallback: use employee's main code
      if (!branchEmployeeCode) {
        const empSnap2 = await db.collection('employees').doc(employeeId).get();
        branchEmployeeCode = empSnap2.exists ? ((empSnap2.data() as any).employeeCode ?? null) : null;
      }

      // Create a new record for this check-in cycle
      const recordId = uuidv4();
      const recordRef = db.collection('attendance').doc(recordId);
      await recordRef.set({
        id: recordId,
        employeeId: employeeId,
        branchId: branchId,
        ...(branchEmployeeCode ? { branchEmployeeCode } : {}),
        date: today,
        checkIn: timeStr,
        checkInLat: dto.latitude,
        checkInLon: dto.longitude,
        checkInDistance: Math.round(distance),
        source: 'mobile',
        status: 'present',
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, type: 'check-in', time: timeStr, distance: Math.round(distance) };
    } else {
      // CHECK_OUT: find latest open record for today (has checkIn but no checkOut)
      const todaySnap = await db
        .collection('attendance')
        .where('employeeId', '==', employeeId)
        .where('date', '==', today)
        .get();

      const openDocs = todaySnap.docs.filter((d) => d.data().checkIn && !d.data().checkOut);
      if (openDocs.length === 0) {
        throw new BadRequestException('No active check-in found. Please check in first.');
      }

      // Use the most recent open record (latest checkIn time)
      const latestOpen = openDocs.sort((a, b) =>
        (b.data().checkIn || '').localeCompare(a.data().checkIn || '')
      )[0];

      await latestOpen.ref.update({
        checkOut: timeStr,
        checkOutLat: dto.latitude,
        checkOutLon: dto.longitude,
        checkOutDistance: Math.round(distance),
        updatedAt: now,
      });

      return { success: true, type: 'check-out', time: timeStr, distance: Math.round(distance) };
    }
  }

  /** GET /api/mobile-attendance/today/:employeeId */
  async getTodayRecord(employeeId: string) {
    const db = this.firebaseService.getFirestore();
    const today = new Date().toISOString().split('T')[0];
    const snap = await db
      .collection('attendance')
      .where('employeeId', '==', employeeId)
      .where('date', '==', today)
      .get();

    if (snap.empty) return { date: today, checkIn: null, checkOut: null, status: 'not-set', cyclesCount: 0 };

    const records = snap.docs.map((d) => d.data());
    // Return the open record (checked-in but not checked-out) if any
    const openRecord = records.find((r) => r.checkIn && !r.checkOut);
    if (openRecord) return { ...openRecord, cyclesCount: records.length };
    // Otherwise return the last closed record
    const last = records.sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''))[0];
    return { ...last, cyclesCount: records.length };
  }

  /** GET /api/mobile-attendance/history/:employeeId */
  async getHistory(employeeId: string, limit = 30) {
    const db = this.firebaseService.getFirestore();
    // Query by employeeId only (single-field index, auto-created by Firestore)
    // Filter source and sort in memory to avoid composite-index requirement
    const snap = await db
      .collection('attendance')
      .where('employeeId', '==', employeeId)
      .get();
    return snap.docs
      .map((d) => d.data())
      .filter((d) => !d.source || d.source === 'mobile')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, limit);
  }

  /** POST /api/mobile-attendance/devices/register */
  async registerDevice(dto: RegisterDeviceDto) {
    const db = this.firebaseService.getFirestore();
    await db.collection('mobileDevices').doc(dto.deviceId).set({
      ...dto,
      registeredAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    }, { merge: true });
    return { success: true };
  }

  /** POST /api/mobile-attendance/verify-employee-code — validate code and return employee info */
  async verifyEmployeeCode(employeeCode: string) {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection('employees')
      .where('employeeCode', '==', employeeCode)
      .limit(1)
      .get();
    if (snap.empty) throw new NotFoundException('Employee code not found. Please check your code and try again.');
    const doc = snap.docs[0];
    const data = doc.data() as any;

    // Check if an account already exists for this employee (by code or by employee doc ID)
    const [byCodeUsers, byCodeSys, byIdUsers, byIdSys] = await Promise.all([
      db.collection('users').where('employeeCode', '==', employeeCode).limit(1).get(),
      db.collection('systemUsers').where('employeeCode', '==', employeeCode).limit(1).get(),
      db.collection('users').where('employeeId', '==', doc.id).limit(1).get(),
      db.collection('systemUsers').where('employeeId', '==', doc.id).limit(1).get(),
    ]);
    const accountExists = !byCodeUsers.empty || !byCodeSys.empty || !byIdUsers.empty || !byIdSys.empty;

    return {
      success: true,
      data: {
        id: doc.id,
        fullName: data.fullName,
        employeeCode: data.employeeCode,
        branch: data.branch || '',
        department: data.department || '',
        jobTitle: data.jobTitle || '',
        accountExists,
      },
    };
  }

  /** GET /api/mobile-attendance/my-branches — all branches assigned to the authenticated employee */
  async getMyBranches(userId: string): Promise<BranchAssignmentResponse[]> {
    const db = this.firebaseService.getFirestore();
    const employeeId = userId;

    // Fetch branch_assignments sub-collection
    const assignmentsSnap = await db
      .collection('employees').doc(employeeId)
      .collection('branch_assignments')
      .get();

    if (!assignmentsSnap.empty) {
      // For each assignment, join with the branches collection for GPS data
      const results: BranchAssignmentResponse[] = [];
      for (const aDoc of assignmentsSnap.docs) {
        const a = aDoc.data() as any;
        const branchDoc = await db.collection('branches').doc(aDoc.id).get();
        if (!branchDoc.exists) continue;
        const b = branchDoc.data() as any;
        results.push({
          branchId: aDoc.id,
          branchName: b.name ?? '',
          employeeCode: a.employeeCode ?? '',
          isPrimary: a.isPrimary === true,
          latitude: b.latitude ?? null,
          longitude: b.longitude ?? null,
          radiusMeters: b.radius ?? 50,
          address: b.address ?? '',
        });
      }
      return results;
    }

    // Backward-compat fallback: employee has no branch_assignments sub-collection yet.
    // Use nationalId (preferred) or email to find ALL employee records for the same person
    // (one record per branch is a valid setup for multi-branch employees).
    const empSnap = await db.collection('employees').doc(employeeId).get();
    if (!empSnap.exists) throw new NotFoundException('Employee not found');
    const emp = empSnap.data() as any;

    // Find all employee docs belonging to the same person
    let allEmpDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    const linkField = emp.nationalId ? 'nationalId' : (emp.email ? 'email' : null);
    const linkValue = emp.nationalId || emp.email;
    if (linkField && linkValue) {
      const allSnap = await db.collection('employees').where(linkField, '==', linkValue).get();
      allEmpDocs = allSnap.docs;
    }
    // Ensure the primary doc is included even if query returned nothing
    if (allEmpDocs.length === 0) allEmpDocs = [empSnap as any];

    // Resolve branch for each employee record, deduplicate by branchId
    const results: BranchAssignmentResponse[] = [];
    const seenBranchIds = new Set<string>();

    for (const empDoc of allEmpDocs) {
      const e = empDoc.data() as any;
      let branchDoc: FirebaseFirestore.DocumentSnapshot | null = null;
      let resolvedBranchId: string | null = null;

      // Try branchId (doc reference) first
      if (e.branchId) {
        const snap = await db.collection('branches').doc(e.branchId).get();
        if (snap.exists) { branchDoc = snap; resolvedBranchId = e.branchId; }
      }

      // Fall back to branch name string (legacy web-created employees)
      if (!branchDoc && e.branch) {
        const snap = await db.collection('branches').where('name', '==', e.branch).limit(1).get();
        if (!snap.empty) { branchDoc = snap.docs[0]; resolvedBranchId = snap.docs[0].id; }
      }

      if (!branchDoc || !resolvedBranchId || seenBranchIds.has(resolvedBranchId)) continue;
      seenBranchIds.add(resolvedBranchId);

      const b = branchDoc.data() as any;
      results.push({
        branchId: resolvedBranchId,
        branchName: b.name ?? '',
        employeeCode: e.employeeCode ?? '',
        isPrimary: empDoc.id === employeeId,
        latitude: b.latitude ?? null,
        longitude: b.longitude ?? null,
        radiusMeters: b.radius ?? 50,
        address: b.address ?? '',
      });
    }

    return results;
  }

  /** POST /api/mobile-attendance/admin/branch-assignments — assign an employee to a branch */
  async addBranchAssignment(employeeId: string, dto: CreateBranchAssignmentDto): Promise<{ success: boolean }> {
    const db = this.firebaseService.getFirestore();

    // Verify employee exists
    const empSnap = await db.collection('employees').doc(employeeId).get();
    if (!empSnap.exists) throw new NotFoundException(`Employee ${employeeId} not found`);

    // Verify branch exists
    const branchDoc = await db.collection('branches').doc(dto.branchId).get();
    if (!branchDoc.exists) throw new NotFoundException(`Branch ${dto.branchId} not found`);

    // If isPrimary is true, clear existing primary flags for this employee
    if (dto.isPrimary) {
      const existingSnap = await db
        .collection('employees').doc(employeeId)
        .collection('branch_assignments')
        .where('isPrimary', '==', true)
        .get();
      const batch = db.batch();
      existingSnap.docs.forEach((d) => batch.update(d.ref, { isPrimary: false }));
      await batch.commit();
    }

    await db
      .collection('employees').doc(employeeId)
      .collection('branch_assignments').doc(dto.branchId)
      .set({
        employeeCode: dto.employeeCode,
        branchId: dto.branchId,
        isPrimary: dto.isPrimary === true,
        assignedAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });

    return { success: true };
  }

  /** DELETE /api/mobile-attendance/admin/branch-assignments/:employeeId/:branchId */
  async removeBranchAssignment(employeeId: string, branchId: string): Promise<{ success: boolean }> {
    const db = this.firebaseService.getFirestore();
    await db
      .collection('employees').doc(employeeId)
      .collection('branch_assignments').doc(branchId)
      .delete();
    return { success: true };
  }

  /** GET /api/mobile-attendance/admin/branch-assignments/:employeeId */
  async getEmployeeBranchAssignments(employeeId: string): Promise<BranchAssignmentResponse[]> {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection('employees').doc(employeeId)
      .collection('branch_assignments')
      .get();

    const results: BranchAssignmentResponse[] = [];
    for (const aDoc of snap.docs) {
      const a = aDoc.data() as any;
      const branchDoc = await db.collection('branches').doc(aDoc.id).get();
      if (!branchDoc.exists) continue;
      const b = branchDoc.data() as any;
      results.push({
        branchId: aDoc.id,
        branchName: b.name ?? '',
        employeeCode: a.employeeCode ?? '',
        isPrimary: a.isPrimary === true,
        latitude: b.latitude ?? null,
        longitude: b.longitude ?? null,
        radiusMeters: b.radius ?? 50,
        address: b.address ?? '',
      });
    }
    return results;
  }

  /** GET /api/mobile-attendance/branches (for the Android location picker) */
  async getActiveBranches() {
    const db = this.firebaseService.getFirestore();
    // isActive is not always set — return all branches
    const snap = await db.collection('branches').get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  /** GET /api/mobile-attendance/branch-info — employee's assigned branch */
  async getEmployeeBranchInfo(employeeId: string) {
    const db = this.firebaseService.getFirestore();

    // If no employeeId in JWT, fall through directly to first active branch
    if (employeeId) {
      const empSnap = await db.collection('employees').doc(employeeId).get();
      if (empSnap.exists) {
        const emp = empSnap.data() as any;

        // Try branchId (doc reference) first
        if (emp.branchId) {
          const branchDoc = await db.collection('branches').doc(emp.branchId).get();
          if (branchDoc.exists) {
            const bd = branchDoc.data() as any;
            return { success: true, message: 'ok', data: { id: branchDoc.id, name: bd.name, latitude: bd.latitude, longitude: bd.longitude, radiusMeters: bd.radius ?? 200, address: bd.address ?? '' } };
          }
        }

        // Fall back to branch name string (legacy web-created employees)
        if (emp.branch) {
          const snap = await db.collection('branches').where('name', '==', emp.branch).limit(1).get();
          if (!snap.empty) {
            const bd = snap.docs[0].data() as any;
            return { success: true, message: 'ok', data: { id: snap.docs[0].id, name: bd.name, latitude: bd.latitude, longitude: bd.longitude, radiusMeters: bd.radius ?? 200, address: bd.address ?? '' } };
          }
        }
      }
    }

    // Fallback: return the first branch (no isActive filter — branches are created without that field)
    const snap = await db.collection('branches').limit(1).get();
    if (snap.empty) throw new NotFoundException('No branch found. Please create a branch in the HR system first.');
    const b = snap.docs[0];
    const bd = b.data() as any;
    return { success: true, message: 'ok', data: { id: b.id, name: bd.name, latitude: bd.latitude, longitude: bd.longitude, radiusMeters: bd.radius ?? 200, address: bd.address ?? '' } };
  }

  // ── Admin endpoints ─────────────────────────────────────────────────────────

  /** GET /api/mobile-attendance/admin/records  (paginated, date-filtered) */
  async getAdminRecords(date?: string) {
    const db = this.firebaseService.getFirestore();
    // Avoid composite index: filter source in memory, sort after fetch
    let query: any = db.collection('attendance');
    if (date) query = query.where('date', '==', date);
    const snap = await query.get();
    return snap.docs
      .map((d: any) => d.data())
      .filter((d: any) => !d.source || d.source === 'mobile')
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 200);
  }

  /** GET /api/mobile-attendance/admin/devices */
  async getAdminDevices() {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection('mobileDevices').get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  /** DELETE /api/mobile-attendance/admin/devices/:deviceId */
  async revokeDevice(deviceId: string) {
    const db = this.firebaseService.getFirestore();
    await db.collection('mobileDevices').doc(deviceId).update({ isActive: false, revokedAt: new Date() });
    return { success: true };
  }

  /** GET /api/mobile-attendance/admin/members — only employees who signed up via the Android app */
  async getRegisteredMobileMembers() {
    const db = this.firebaseService.getFirestore();

    // ── Primary source: mobileDevices (Android-registered only) ────────────
    const devicesSnap = await db.collection('mobileDevices').get();
    if (devicesSnap.empty) return [];

    // Build device map: employeeId → latest device
    const deviceByEmployee = new Map<string, any>();
    for (const d of devicesSnap.docs) {
      const device = { id: d.id, ...d.data() } as any;
      const empId = device.employeeId as string;
      if (!empId) continue;
      const existing = deviceByEmployee.get(empId);
      const devTime = typeof device.registeredAt?.toDate === 'function'
        ? device.registeredAt.toDate().getTime() : 0;
      const exTime = existing && typeof existing.registeredAt?.toDate === 'function'
        ? existing.registeredAt.toDate().getTime() : 0;
      if (!existing || devTime > exTime) deviceByEmployee.set(empId, device);
    }

    if (deviceByEmployee.size === 0) return [];

    // Fetch ONLY the employees who have a registered device (batch in chunks of 30)
    const employeeIds = [...deviceByEmployee.keys()];
    const empDocs: any[] = [];
    const chunkSize = 30;
    for (let i = 0; i < employeeIds.length; i += chunkSize) {
      const chunk = employeeIds.slice(i, i + chunkSize);
      const snap = await db.collection('employees').where('__name__', 'in', chunk).get();
      empDocs.push(...snap.docs);
    }

    const members = empDocs.map((doc) => {
      const emp = { id: doc.id, ...doc.data() } as any;
      const empId: string = emp.id || doc.id;
      const device = deviceByEmployee.get(empId) || {};
      const regAt = device.registeredAt
        ? (typeof device.registeredAt.toDate === 'function'
            ? device.registeredAt.toDate().toISOString()
            : String(device.registeredAt))
        : null;
      return {
        employeeId: empId,
        fullName: emp.fullName || emp.name || '',
        email: emp.email || '',
        role: emp.role || 'employee',
        branch: emp.branch || emp.branchName || '',
        department: emp.department || '',
        jobTitle: emp.jobTitle || '',
        deviceModel: device.deviceModel || device.deviceName || '',
        osVersion: device.osVersion || '',
        registeredAt: regAt,
        isActive: emp.isActive !== false,
      };
    });

    // Sort by most recent registration date descending
    members.sort((a, b) => {
      if (a.registeredAt && b.registeredAt) return b.registeredAt.localeCompare(a.registeredAt);
      if (a.registeredAt) return -1;
      if (b.registeredAt) return 1;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

    return members;
  }

  /** PATCH /api/mobile-attendance/admin/records/:id */
  async updateRecord(id: string, data: Partial<{ checkIn: string; checkOut: string; status: string }>) {
    const db = this.firebaseService.getFirestore();
    const ref = db.collection('attendance').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException('Record not found');
    await ref.update({ ...data, updatedAt: new Date() });
    const updated = (await ref.get()).data();
    return { success: true, data: updated };
  }

  /** DELETE /api/mobile-attendance/admin/records/:id */
  async deleteRecord(id: string) {
    const db = this.firebaseService.getFirestore();
    const ref = db.collection('attendance').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException('Record not found');
    await ref.delete();
    return { success: true };
  }
}
