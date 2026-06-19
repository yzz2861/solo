import { Repository } from 'typeorm';
import { OperationLog, OperationType } from '../entities/OperationLog';
import { AppDataSource } from '../config/database';

export class OperationLogRepository {
  private repo: Repository<OperationLog>;

  constructor() {
    this.repo = AppDataSource.getRepository(OperationLog);
  }

  async create(data: {
    operationType: OperationType;
    targetId?: string;
    operatorId?: string;
    operatorName?: string;
    detail?: string;
    beforeData?: unknown;
    afterData?: unknown;
  }): Promise<OperationLog> {
    const entity = this.repo.create({
      ...data,
      beforeData: data.beforeData !== undefined ? JSON.stringify(data.beforeData) : undefined,
      afterData: data.afterData !== undefined ? JSON.stringify(data.afterData) : undefined,
    });
    return this.repo.save(entity);
  }

  async findByTarget(targetId: string, limit: number = 50): Promise<OperationLog[]> {
    return this.repo.find({
      where: { targetId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByOperator(operatorId: string, limit: number = 50): Promise<OperationLog[]> {
    return this.repo.find({
      where: { operatorId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByDateRange(
    dateFrom: Date,
    dateTo: Date,
    operationType?: OperationType
  ): Promise<OperationLog[]> {
    const qb = this.repo
      .createQueryBuilder('log')
      .where('log.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });
    if (operationType) {
      qb.andWhere('log.operationType = :type', { type: operationType });
    }
    return qb.orderBy('log.createdAt', 'DESC').getMany();
  }
}
