import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { CreateRoleDto } from './dto/role.dto';
import { SystemConfigDto } from './dto/config.dto';
import { NotificationConfigDto, ResetSystemDto } from './dto/notification-config.dto';

const ALL_COLLECTIONS = [
  'systemUsers', 'roles', 'systemConfig', 'employees',
  'branches', 'departments', 'jobTitles', 'monthRanges',
  'attendanceRules', 'attendanceLogs', 'organization',
  'cmsPages', 'cmsMenuConfig', 'notifications', 'notificationSettings',
];

@Injectable()
export class SettingsService {
  constructor(private firebaseService: FirebaseService) {}

  // ═══ SYSTEM USERS ══════════════════════════════════════

  async getUsers() {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection('systemUsers').get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createUser(dto: CreateUserDto) {
    const db = this.firebaseService.getFirestore();
    const plain = JSON.parse(JSON.stringify(dto));
    const ref = db.collection('systemUsers').doc();
    const data = { ...plain, createdAt: new Date(), updatedAt: new Date() };
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const db = this.firebaseService.getFirestore();
    const plain = JSON.parse(JSON.stringify(dto));
    const data = { ...plain, updatedAt: new Date() };
    await db.collection('systemUsers').doc(id).update(data);
    return { id, ...data };
  }

  async deleteUser(id: string) {
    const db = this.firebaseService.getFirestore();
    await db.collection('systemUsers').doc(id).delete();
    return { deleted: true };
  }

  // ═══ ROLES ═════════════════════════════════════════════

  async getRoles() {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection('roles').get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createRole(dto: CreateRoleDto) {
    const db = this.firebaseService.getFirestore();
    const plain = JSON.parse(JSON.stringify(dto));
    const ref = db.collection('roles').doc();
    const data = { ...plain, createdAt: new Date(), updatedAt: new Date() };
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  async updateRole(id: string, dto: CreateRoleDto) {
    const db = this.firebaseService.getFirestore();
    const plain = JSON.parse(JSON.stringify(dto));
    const data = { ...plain, updatedAt: new Date() };
    await db.collection('roles').doc(id).update(data);
    return { id, ...data };
  }

  async deleteRole(id: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('roles').doc(id).get();
    if (!doc.exists) throw new NotFoundException('Role not found');
    const roleData = doc.data() as any;
    if (roleData?.isBuiltIn) throw new ForbiddenException('Built-in roles cannot be deleted');
    await db.collection('roles').doc(id).delete();
    return { deleted: true };
  }

  // ═══ SYSTEM CONFIG ══════════════════════════════════════

  async getConfig() {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('systemConfig').doc('default').get();
    const defaults = this.defaultConfig();
    if (!doc.exists) return defaults;
    return { ...defaults, ...doc.data() };
  }

  async updateConfig(dto: SystemConfigDto) {
    const db = this.firebaseService.getFirestore();
    const plain = JSON.parse(JSON.stringify(dto));
    await db.collection('systemConfig').doc('default').set(
      { ...plain, updatedAt: new Date() },
      { merge: true },
    );
    return dto;
  }

  private defaultConfig() {
    return {
      defaultCurrency: 'USD',
      workingDaysPerWeek: 5,
      weeklyHolidays: ['friday', 'saturday'],
      officialVacations: [],
    };
  }

  // ═══ BACKUP ════════════════════════════════════════════

  async generateBackup() {
    const db = this.firebaseService.getFirestore();
    const backup: Record<string, any[]> = {};
    for (const col of ALL_COLLECTIONS) {
      try {
        const snap = await db.collection(col).get();
        backup[col] = snap.docs.map((doc) => {
          const data = doc.data();
          // Convert Firestore Timestamps to ISO strings
          const serialized: Record<string, any> = { id: doc.id };
          for (const [k, v] of Object.entries(data)) {
            serialized[k] = v && typeof v === 'object' && '_seconds' in v
              ? new Date((v as any)._seconds * 1000).toISOString()
              : v;
          }
          return serialized;
        });
      } catch {
        backup[col] = [];
      }
    }
    return {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      system: 'HR ERP',
      data: backup,
    };
  }

  async restoreBackup(backupData: any) {
    if (!backupData || typeof backupData !== 'object' || !backupData.data) {
      throw new Error('Invalid backup format');
    }
    const db = this.firebaseService.getFirestore();
    const { data } = backupData;
    let restoredCount = 0;
    for (const [collection, records] of Object.entries(data)) {
      if (!Array.isArray(records)) continue;
      for (const record of records as any[]) {
        const plain = JSON.parse(JSON.stringify(record));
        const { id, ...rest } = plain;
        if (id) {
          await db.collection(collection).doc(id).set(rest, { merge: true });
          restoredCount++;
        }
      }
    }
    return { restored: restoredCount };
  }

  // ═══ NOTIFICATION CONFIG ════════════════════════════════

  async getNotificationConfig() {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('notificationSettings').doc('default').get();
    const defaults = this.defaultNotificationConfig();
    if (!doc.exists) return defaults;
    return { ...defaults, ...doc.data() };
  }

  async updateNotificationConfig(dto: NotificationConfigDto) {
    const db = this.firebaseService.getFirestore();
    const plain = JSON.parse(JSON.stringify(dto));
    await db.collection('notificationSettings').doc('default').set(
      { ...plain, updatedAt: new Date() },
      { merge: true },
    );
    return dto;
  }

  private defaultNotificationConfig() {
    return { emailEnabled: false, pushEnabled: false, inAppEnabled: true, rules: [] };
  }

  // ═══ USER NOTIFICATIONS ═════════════════════════════════

  async getUserNotifications(userId: string) {
    const db = this.firebaseService.getFirestore();
    try {
      const snap = await db
        .collection('notifications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err: any) {
      // Firestore composite index may not exist yet — fall back to unordered query
      if (err?.code === 9 || (err?.message || '').includes('requires an index')) {
        const snap = await db
          .collection('notifications')
          .where('userId', '==', userId)
          .limit(50)
          .get();
        return snap.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? new Date(a.createdAt).getTime() ?? 0;
            const bTime = b.createdAt?.toMillis?.() ?? new Date(b.createdAt).getTime() ?? 0;
            return bTime - aTime;
          });
      }
      throw err;
    }
  }

  async markNotificationRead(id: string) {
    const db = this.firebaseService.getFirestore();
    await db.collection('notifications').doc(id).update({ isRead: true });
    return { updated: true };
  }

  async markAllNotificationsRead(userId: string) {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .get();
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.update(doc.ref, { isRead: true }));
    await batch.commit();
    return { updated: snap.size };
  }

  async createNotification(notifData: any) {
    const db = this.firebaseService.getFirestore();
    const plain = JSON.parse(JSON.stringify(notifData));
    const ref = db.collection('notifications').doc();
    await ref.set({ ...plain, isRead: false, createdAt: new Date() });
    return { id: ref.id, ...plain };
  }

  // ═══ SYSTEM RESET ═══════════════════════════════════════

  async resetSystem(dto: ResetSystemDto) {
    const RESET_PASSWORD = process.env.SYSTEM_RESET_PASSWORD || 'ADMIN_RESET_2024';
    if (dto.confirmPhrase !== 'RESET') {
      throw new ForbiddenException('Confirmation phrase must be exactly "RESET"');
    }
    if (dto.resetPassword !== RESET_PASSWORD) {
      throw new ForbiddenException('Invalid reset authorization password');
    }
    const db = this.firebaseService.getFirestore();
    let deletedCount = 0;
    for (const col of ALL_COLLECTIONS) {
      try {
        const snap = await db.collection(col).get();
        if (snap.empty) continue;
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        deletedCount += snap.size;
      } catch {
        // continue deletion on any collection error
      }
    }
    return { deleted: deletedCount, reset: true };
  }
}
