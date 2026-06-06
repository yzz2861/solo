import { v4 as uuidv4 } from 'uuid';
import { HandoverState, StateEvent } from '../states';

export enum AuditLogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  REVIEW = 'review',
}

export enum AuditLogAction {
  SUBMIT = 'submit',
  APPROVE = 'approve',
  REJECT = 'reject',
  REVIEW = 'review',
  REVIEW_APPROVE = 'review_approve',
  REVIEW_REJECT = 'review_reject',
  CANCEL = 'cancel',
  RULE_CHECK = 'rule_check',
  MATERIAL_UPLOAD = 'material_upload',
  SYSTEM = 'system',
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  applicationId: string;
  action: AuditLogAction;
  level: AuditLogLevel;
  operatorId?: string;
  operatorName?: string;
  message: string;
  detail?: Record<string, unknown>;
  fromState?: HandoverState;
  toState?: HandoverState;
  event?: StateEvent;
}

export interface IAuditLogger {
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry;
  getLogs(applicationId: string): AuditLogEntry[];
  getAllLogs(): AuditLogEntry[];
}

export class AuditLogger implements IAuditLogger {
  private logs: AuditLogEntry[] = [];

  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const newEntry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.logs.push(newEntry);
    return newEntry;
  }

  getLogs(applicationId: string): AuditLogEntry[] {
    return this.logs.filter((log) => log.applicationId === applicationId);
  }

  getAllLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

export const auditLogger = new AuditLogger();
