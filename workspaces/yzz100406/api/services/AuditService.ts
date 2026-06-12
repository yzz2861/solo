import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../data-source.js';
import { AuditLog } from '../entities/AuditLog.js';
import { User } from '../../shared/types.js';

export class AuditService {
  private auditRepository: Repository<AuditLog>;

  constructor() {
    this.auditRepository = AppDataSource.getRepository(AuditLog);
  }

  async logChange(
    accidentId: string,
    user: User,
    operation: string,
    fieldName?: string,
    oldValue?: string,
    newValue?: string
  ): Promise<AuditLog> {
    const auditLog = this.auditRepository.create({
      id: uuidv4(),
      accidentId,
      operatorId: user.id,
      operatorName: user.name,
      operation,
      fieldName,
      oldValue,
      newValue,
      timestamp: new Date()
    });

    return await this.auditRepository.save(auditLog);
  }

  async logUpdate<T extends object>(
    accidentId: string,
    user: User,
    oldEntity: T,
    newEntity: Partial<T>,
    fieldLabels: Record<string, string>
  ): Promise<void> {
    for (const key of Object.keys(newEntity)) {
      const oldVal = oldEntity[key as keyof T];
      const newVal = newEntity[key as keyof T];
      
      if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
        const oldStr = oldVal === null ? '空' : String(oldVal);
        const newStr = newVal === null ? '空' : String(newVal);
        
        await this.logChange(
          accidentId,
          user,
          'update',
          fieldLabels[key] || key,
          oldStr,
          newStr
        );
      }
    }
  }

  async getAuditLogs(accidentId: string): Promise<AuditLog[]> {
    return await this.auditRepository.find({
      where: { accidentId },
      order: { timestamp: 'DESC' }
    });
  }

  async getTimelineComparison(accidentId: string): Promise<{
    photoEvents: AuditLog[];
    feeEvents: AuditLog[];
    statusEvents: AuditLog[];
  }> {
    const logs = await this.getAuditLogs(accidentId);
    
    return {
      photoEvents: logs.filter(l => l.operation === 'photo_upload'),
      feeEvents: logs.filter(l => 
        l.fieldName && ['定损金额', '扣款金额', '保险估价', '押金金额'].includes(l.fieldName)
      ),
      statusEvents: logs.filter(l => l.fieldName === '状态')
    };
  }
}
