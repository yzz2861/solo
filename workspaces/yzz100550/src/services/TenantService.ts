import { TenantRepository } from '../repositories/TenantRepository';
import { OperationLogRepository } from '../repositories/OperationLogRepository';
import { BusinessError } from '../utils/response';
import { Tenant } from '../entities/Tenant';

export class TenantService {
  private tenantRepo: TenantRepository;
  private logRepo: OperationLogRepository;

  constructor() {
    this.tenantRepo = new TenantRepository();
    this.logRepo = new OperationLogRepository();
  }

  async getById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findById(id);
    if (!tenant) {
      throw new BusinessError('租户不存在', 404);
    }
    return tenant;
  }

  async list(): Promise<Tenant[]> {
    return this.tenantRepo.findAll();
  }

  async search(keyword: string): Promise<Tenant[]> {
    return this.tenantRepo.search(keyword);
  }

  async create(
    data: { code: string; name: string; department?: string; contactPerson?: string; contactPhone?: string },
    operatorId?: string,
    operatorName?: string
  ): Promise<Tenant> {
    const existing = await this.tenantRepo.findByCode(data.code);
    if (existing) {
      throw new BusinessError('租户编码已存在', 409);
    }
    const tenant = await this.tenantRepo.create(data);
    await this.logRepo.create({
      operationType: 'tenant_create',
      targetId: tenant.id,
      operatorId,
      operatorName,
      detail: `创建租户: ${tenant.name} (${tenant.code})`,
      afterData: tenant,
    });
    return tenant;
  }

  async update(
    id: string,
    data: Partial<Pick<Tenant, 'name' | 'department' | 'contactPerson' | 'contactPhone'>>,
    operatorId?: string,
    operatorName?: string
  ): Promise<Tenant> {
    const old = await this.getById(id);
    const updated = await this.tenantRepo.update(id, data);
    if (!updated) {
      throw new BusinessError('更新失败', 500);
    }
    await this.logRepo.create({
      operationType: 'tenant_update',
      targetId: id,
      operatorId,
      operatorName,
      detail: `更新租户信息: ${old.name}`,
      beforeData: old,
      afterData: updated,
    });
    return updated;
  }

  async deactivate(id: string): Promise<boolean> {
    await this.getById(id);
    return this.tenantRepo.deactivate(id);
  }
}
