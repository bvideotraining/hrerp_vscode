// Audit logging service for tracking database changes
// Logs to console for now; can be routed through backend API later
'use client';

export type AuditAction = 
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT';

export interface AuditLog {
  id?: string;
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  changes?: Record<string, any>;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

class AuditLoggingService {
  async logAction(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<string> {
    try {
      console.log('[AUDIT]', log.action, log.entity, log.entityId, log.status);
      return '';
    } catch (error) {
      console.error('Error logging action:', error);
      return '';
    }
  }

  /**
   * Log employee creation
   */
  async logEmployeeCreate(userId: string, employeeId: string, employeeData: any): Promise<void> {
    await this.logAction({
      userId,
      action: 'CREATE',
      entity: 'EMPLOYEE',
      entityId: employeeId,
      changes: employeeData,
      status: 'SUCCESS',
    });
  }

  /**
   * Log employee update
   */
  async logEmployeeUpdate(userId: string, employeeId: string, changes: any): Promise<void> {
    await this.logAction({
      userId,
      action: 'UPDATE',
      entity: 'EMPLOYEE',
      entityId: employeeId,
      changes,
      status: 'SUCCESS',
    });
  }

  /**
   * Log employee deletion
   */
  async logEmployeeDelete(userId: string, employeeId: string): Promise<void> {
    await this.logAction({
      userId,
      action: 'DELETE',
      entity: 'EMPLOYEE',
      entityId: employeeId,
      status: 'SUCCESS',
    });
  }

  /**
   * Log login
   */
  async logLogin(userId: string): Promise<void> {
    await this.logAction({
      userId,
      action: 'LOGIN',
      entity: 'USER',
      entityId: userId,
      status: 'SUCCESS',
    });
  }

  /**
   * Log logout
   */
  async logLogout(userId: string): Promise<void> {
    await this.logAction({
      userId,
      action: 'LOGOUT',
      entity: 'USER',
      entityId: userId,
      status: 'SUCCESS',
    });
  }

  /**
   * Log data export
   */
  async logExport(userId: string, entity: string, recordCount: number): Promise<void> {
    await this.logAction({
      userId,
      action: 'EXPORT',
      entity,
      entityId: 'BATCH_EXPORT',
      changes: { recordCount },
      status: 'SUCCESS',
    });
  }

  /**
   * Log failed action
   */
  async logFailure(userId: string, action: AuditAction, entity: string, error: Error): Promise<void> {
    await this.logAction({
      userId,
      action,
      entity,
      entityId: 'N/A',
      status: 'FAILED',
      errorMessage: error.message,
    });
  }
}

export const auditLoggingService = new AuditLoggingService();
export default auditLoggingService;
