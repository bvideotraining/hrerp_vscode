import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { CreateRoleDto } from './dto/role.dto';
import { SystemConfigDto } from './dto/config.dto';
import { NotificationConfigDto, ResetSystemDto } from './dto/notification-config.dto';
import { SaveDashboardLayoutDto } from './dto/dashboard-layout.dto';

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
      defaultCurrency: 'EGP',
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

  // ═══ DASHBOARD LAYOUTS ══════════════════════════════════════

  async getDashboardLayout(roleId: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('dashboard_layouts').doc(roleId).get();
    if (!doc.exists) return null;
    return { roleId, ...doc.data() };
  }

  async saveDashboardLayout(roleId: string, dto: SaveDashboardLayoutDto) {
    const db = this.firebaseService.getFirestore();
    const plain = JSON.parse(JSON.stringify(dto));
    const data = { ...plain, roleId, updatedAt: new Date().toISOString() };
    await db.collection('dashboard_layouts').doc(roleId).set(data);
    return { roleId, ...data };
  }

  async aiSuggestWidgets(roleId: string, role: any) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured in .env');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const configuredModel = process.env.GEMINI_MODEL?.trim();
    const modelCandidates = [
      configuredModel,
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash-latest',
    ].filter((m): m is string => Boolean(m));
    const moduleAccess =
      role?.accessType === 'full'
        ? 'all HR modules (full admin access)'
        : (role?.permissions || [])
            .filter((p: any) => Array.isArray(p.actions) && p.actions.includes('read'))
            .map((p: any) => p.moduleName)
            .join(', ') || 'no specific modules';
    const widgetList = [
      { id: 'kpi_total_employees', category: 'kpi', description: 'Total active employees' },
      { id: 'kpi_payroll_estimate', category: 'kpi', description: 'Monthly payroll cost estimate' },
      { id: 'kpi_pending_leaves', category: 'kpi', description: 'Leave requests awaiting approval' },
      { id: 'kpi_on_leave_today', category: 'kpi', description: 'Employees on leave today' },
      { id: 'kpi_late_incidents', category: 'kpi', description: 'Late attendance incidents this month' },
      { id: 'kpi_bonuses_total', category: 'kpi', description: 'Total bonuses disbursed' },
      { id: 'kpi_social_insurance', category: 'kpi', description: 'Employees under social insurance' },
      { id: 'chart_attendance_trend', category: 'chart', description: 'Daily attendance rate trend' },
      { id: 'chart_salary_distribution', category: 'chart', description: 'Salary ranges by department' },
      { id: 'chart_leave_types', category: 'chart', description: 'Leave requests by type breakdown' },
      { id: 'chart_headcount_by_dept', category: 'chart', description: 'Employee count per department' },
      { id: 'list_late_employees', category: 'list', description: 'Recent late or absent employees' },
      { id: 'list_recent_activities', category: 'list', description: 'Latest system events' },
      { id: 'list_pending_leaves', category: 'list', description: 'Pending leave approvals list' },
      { id: 'quick_actions', category: 'utility', description: 'Shortcuts to common tasks' },
      { id: 'system_status', category: 'utility', description: 'System health and stats' },
    ];
    const prompt = `You are an HR ERP dashboard configuration expert. A user role named "${role?.name || roleId}" has access to: ${moduleAccess}.\n\nSelect the most relevant dashboard widgets for this role from the list below and explain why each is useful.\n\nAvailable widgets:\n${JSON.stringify(widgetList, null, 2)}\n\nRespond with a JSON array ONLY (no markdown, no code fences). Each item:\n{"widgetId": "string", "reason": "brief reason (max 15 words)", "priority": "high" | "medium" | "low"}`;
    let rawText = '';
    let lastError: any = null;

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        rawText = result.response.text().trim();
        if (rawText) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!rawText) {
      const detail = lastError?.message || 'No model candidate returned a response';
      throw new Error(`Gemini request failed. Set GEMINI_MODEL in backend/.env to a supported model. Details: ${detail}`);
    }

    const text = rawText;
    // Strip any accidental markdown fences
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(clean) as Array<{ widgetId: string; reason: string; priority: 'high' | 'medium' | 'low' }>;
  }
}
