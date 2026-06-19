import { Repository, Between, In } from 'typeorm';
import {
  WifiApplication,
  ApplicationStatus,
} from '../entities/WifiApplication';
import { AppDataSource } from '../config/database';
import dayjs = require('dayjs');

export interface ApplicationQuery {
  status?: ApplicationStatus | ApplicationStatus[];
  tenantId?: string;
  visitorPhone?: string;
  dateFrom?: Date;
  dateTo?: Date;
  createdBy?: string;
  reviewedBy?: string;
  page?: number;
  pageSize?: number;
}

export class WifiApplicationRepository {
  private repo: Repository<WifiApplication>;

  constructor() {
    this.repo = AppDataSource.getRepository(WifiApplication);
  }

  async findById(id: string): Promise<WifiApplication | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findActiveByPhone(phone: string): Promise<WifiApplication | null> {
    const activeStatuses: ApplicationStatus[] = ['approved', 'active', 'pending'];
    return this.repo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.visitor', 'v')
      .where('v.phone = :phone', { phone })
      .andWhere('app.status IN (:...statuses)', { statuses: activeStatuses })
      .andWhere('app.endTime > :now', { now: new Date() })
      .orderBy('app.createdAt', 'DESC')
      .getOne();
  }

  async findActiveApplications(endTimeBefore?: Date): Promise<WifiApplication[]> {
    const qb = this.repo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.visitor', 'v')
      .leftJoinAndSelect('app.tenant', 't')
      .where('app.status IN (:...statuses)', {
        statuses: ['approved', 'active'] as ApplicationStatus[],
      });
    if (endTimeBefore) {
      qb.andWhere('app.endTime <= :endTimeBefore', { endTimeBefore });
    }
    return qb.getMany();
  }

  async findPendingForToday(): Promise<WifiApplication[]> {
    const startOfDay = dayjs().startOf('day').toDate();
    const endOfDay = dayjs().endOf('day').toDate();
    return this.repo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.visitor', 'v')
      .leftJoinAndSelect('app.tenant', 't')
      .where('app.status = :status', { status: 'pending' })
      .andWhere('app.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .orderBy('app.createdAt', 'ASC')
      .getMany();
  }

  async findExpiringSoon(hours: number = 2): Promise<WifiApplication[]> {
    const now = new Date();
    const threshold = dayjs().add(hours, 'hour').toDate();
    return this.repo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.visitor', 'v')
      .leftJoinAndSelect('app.tenant', 't')
      .where('app.status IN (:...statuses)', {
        statuses: ['approved', 'active'] as ApplicationStatus[],
      })
      .andWhere('app.endTime > :now', { now })
      .andWhere('app.endTime <= :threshold', { threshold })
      .orderBy('app.endTime', 'ASC')
      .getMany();
  }

  async findNotLeftByTenant(tenantId?: string): Promise<WifiApplication[]> {
    const qb = this.repo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.visitor', 'v')
      .leftJoinAndSelect('app.tenant', 't')
      .where('app.status IN (:...statuses)', {
        statuses: ['approved', 'active'] as ApplicationStatus[],
      })
      .andWhere('app.endTime < :now', { now: new Date() });
    if (tenantId) {
      qb.andWhere('app.tenantId = :tenantId', { tenantId });
    }
    return qb.orderBy('app.endTime', 'ASC').getMany();
  }

  async findByTenant(tenantId: string, status?: ApplicationStatus[]): Promise<WifiApplication[]> {
    const qb = this.repo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.visitor', 'v')
      .leftJoinAndSelect('app.tenant', 't')
      .where('app.tenantId = :tenantId', { tenantId });
    if (status && status.length > 0) {
      qb.andWhere('app.status IN (:...statuses)', { statuses: status });
    }
    return qb.orderBy('app.createdAt', 'DESC').getMany();
  }

  async query(options: ApplicationQuery): Promise<{ list: WifiApplication[]; total: number }> {
    const {
      status,
      tenantId,
      visitorPhone,
      dateFrom,
      dateTo,
      createdBy,
      reviewedBy,
      page = 1,
      pageSize = 20,
    } = options;

    const qb = this.repo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.visitor', 'v')
      .leftJoinAndSelect('app.tenant', 't');

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      qb.andWhere('app.status IN (:...statuses)', { statuses });
    }
    if (tenantId) {
      qb.andWhere('app.tenantId = :tenantId', { tenantId });
    }
    if (visitorPhone) {
      qb.andWhere('v.phone LIKE :phone', { phone: `%${visitorPhone}%` });
    }
    if (dateFrom && dateTo) {
      qb.andWhere('app.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });
    } else if (dateFrom) {
      qb.andWhere('app.createdAt >= :dateFrom', { dateFrom });
    } else if (dateTo) {
      qb.andWhere('app.createdAt <= :dateTo', { dateTo });
    }
    if (createdBy) {
      qb.andWhere('app.createdBy = :createdBy', { createdBy });
    }
    if (reviewedBy) {
      qb.andWhere('app.reviewedBy = :reviewedBy', { reviewedBy });
    }

    qb.orderBy('app.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total };
  }

  async create(data: Partial<WifiApplication>): Promise<WifiApplication> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<WifiApplication>): Promise<WifiApplication | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async countByStatusInRange(
    statuses: ApplicationStatus[],
    dateFrom: Date,
    dateTo: Date,
    tenantId?: string
  ): Promise<number> {
    const qb = this.repo
      .createQueryBuilder('app')
      .where('app.status IN (:...statuses)', { statuses })
      .andWhere('app.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });
    if (tenantId) {
      qb.andWhere('app.tenantId = :tenantId', { tenantId });
    }
    return qb.getCount();
  }

  async getStatsByDateRange(
    dateFrom: Date,
    dateTo: Date,
    tenantId?: string
  ): Promise<{
    total: number;
    approved: number;
    rejected: number;
    expired: number;
    revoked: number;
    overtime: number;
  }> {
    const buildQb = (statuses: ApplicationStatus[]) => {
      const qb = this.repo
        .createQueryBuilder('app')
        .where('app.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });
      if (statuses.length > 0) {
        qb.andWhere('app.status IN (:...statuses)', { statuses });
      }
      if (tenantId) {
        qb.andWhere('app.tenantId = :tenantId', { tenantId });
      }
      return qb;
    };

    const totalQb = buildQb([]);
    const approvedQb = buildQb(['approved', 'active', 'expired', 'revoked_manual', 'revoked_auto', 'left_early']);
    const rejectedQb = buildQb(['rejected']);
    const expiredQb = buildQb(['expired']);
    const revokedQb = buildQb(['revoked_manual', 'revoked_auto', 'left_early']);
    const overtimeQb = this.repo
      .createQueryBuilder('app')
      .where('app.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .andWhere('app.status IN (:...statuses)', {
        statuses: ['approved', 'active', 'expired', 'revoked_manual', 'revoked_auto', 'left_early'],
      })
      .andWhere('app.revokedAt > app.endTime OR (app.status = :active AND app.endTime < :now)', {
        active: 'active',
        now: new Date(),
      });
    if (tenantId) {
      overtimeQb.andWhere('app.tenantId = :tenantId', { tenantId });
    }

    const [total, approved, rejected, expired, revoked, overtime] = await Promise.all([
      totalQb.getCount(),
      approvedQb.getCount(),
      rejectedQb.getCount(),
      expiredQb.getCount(),
      revokedQb.getCount(),
      overtimeQb.getCount(),
    ]);

    return { total, approved, rejected, expired, revoked, overtime };
  }
}
