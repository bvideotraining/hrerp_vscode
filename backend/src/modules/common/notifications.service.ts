import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { Timestamp } from 'firebase-admin/firestore';

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  moduleId?: string;
  event?: string;
  relatedId?: string; // e.g., leave request ID
  isRead?: boolean;
  createdAt?: Timestamp | Date;
}

/**
 * Service for creating system notifications.
 * Notifications are stored in Firestore and displayed in the bell icon.
 */
@Injectable()
export class NotificationsService {
  constructor(private firebaseService: FirebaseService) {}

  /**
   * Create a notification for a user
   */
  async createNotification(data: NotificationData): Promise<string> {
    const db = this.firebaseService.getFirestore();
    const ref = db.collection('notifications').doc();
    const notif = {
      userId: data.userId,
      title: data.title,
      message: data.message,
      moduleId: data.moduleId || '',
      event: data.event || '',
      relatedId: data.relatedId || '',
      isRead: false,
      createdAt: new Date(),
    };
    await ref.set(notif);
    return ref.id;
  }

  /**
   * Create notifications for multiple users
   */
  async createNotificationsForUsers(userIds: string[], data: Omit<NotificationData, 'userId'>): Promise<string[]> {
    const ids: string[] = [];
    for (const userId of userIds) {
      const id = await this.createNotification({ ...data, userId });
      ids.push(id);
    }
    return ids;
  }

  /**
   * Get user IDs for all users whose role name matches any of the given role name variants.
   * Roles in Firestore use UUID doc IDs + a `name` field (e.g. "Branch Approver").
   * This resolves role names → role doc IDs → systemUser IDs.
   */
  async getUserIdsWithRoleNames(roleNames: string[]): Promise<string[]> {
    const db = this.firebaseService.getFirestore();

    // 1. Find all matching role doc IDs by name
    const rolesSnap = await db.collection('roles').get();
    const normalizedTargets = new Set(roleNames.map((r) => r.toLowerCase().replace(/[\s-]+/g, '_')));
    const matchingRoleDocIds: string[] = [];
    rolesSnap.forEach((doc) => {
      const name: string = (doc.data().name || '').toLowerCase().replace(/[\s-]+/g, '_');
      if (normalizedTargets.has(name)) {
        matchingRoleDocIds.push(doc.id);
      }
    });

    if (matchingRoleDocIds.length === 0) return [];

    // 2. Find all systemUsers whose roleId is one of those doc IDs
    const usersSnap = await db.collection('systemUsers').get();
    const userIds: string[] = [];
    usersSnap.forEach((doc) => {
      const data = doc.data();
      if (matchingRoleDocIds.includes(data.roleId)) {
        if (data.isActive !== false) {
          userIds.push(data.id || doc.id);
        }
      }
    });

    return userIds;
  }

  /**
   * Get user IDs from a branch (for branch approvers)
   */
  async getUserIdsInBranch(branchId?: string): Promise<string[]> {
    if (!branchId) return [];
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection('systemUsers').where('branchId', '==', branchId).get();
    return snap.docs.map((doc) => doc.data().id || doc.id);
  }

  /**
   * Get employee's user ID from their employeeId
   */
  async getUserIdForEmployee(employeeId: string): Promise<string | null> {
    const db = this.firebaseService.getFirestore();
    // Try systemUsers first
    const sysSnap = await db.collection('systemUsers').where('employeeId', '==', employeeId).limit(1).get();
    if (!sysSnap.empty) {
      return sysSnap.docs[0].data().id || sysSnap.docs[0].id;
    }
    // Fallback: try users collection
    const userSnap = await db.collection('users').where('employeeId', '==', employeeId).limit(1).get();
    if (!userSnap.empty) {
      return userSnap.docs[0].data().id || userSnap.docs[0].id;
    }
    return null;
  }

  /**
   * Get employee name from employeeId
   */
  async getEmployeeName(employeeId: string): Promise<string> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('employees').doc(employeeId).get();
    if (doc.exists) {
      const data = doc.data() as any;
      // Employees use fullName field
      const full = (data.fullName || '').trim();
      if (full) return full;
      // Fallback: try firstName + lastName
      const parts = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
      if (parts) return parts;
    }
    return 'Unknown Employee';
  }
}
