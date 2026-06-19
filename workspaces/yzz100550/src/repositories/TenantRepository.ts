import { Repository } from 'typeorm';
import { Tenant } from '../entities/Tenant';
import { AppDataSource } from '../config/database';

export class TenantRepository {
  private repo: Repository<Tenant>;

  constructor() {
    this.repo = AppDataSource.getRepository(Tenant);
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { id, isActive: true } });
  }

  async findByCode(code: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { code, isActive: true } });
  }

  async findAll(): Promise<Tenant[]> {
    return this.repo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async search(keyword: string): Promise<Tenant[]> {
    return this.repo
      .createQueryBuilder('t')
      .where('t.isActive = :active', { active: true })
      .andWhere('(t.name LIKE :kw OR t.code LIKE :kw OR t.department LIKE :kw)', {
        kw: `%${keyword}%`,
      })
      .orderBy('t.name', 'ASC')
      .getMany();
  }

  async create(tenant: Partial<Tenant>): Promise<Tenant> {
    const entity = this.repo.create(tenant);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async deactivate(id: string): Promise<boolean> {
    const result = await this.repo.update(id, { isActive: false });
    return (result.affected || 0) > 0;
  }
}
