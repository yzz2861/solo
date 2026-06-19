import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/User';
import { AppDataSource } from '../config/database';

export class UserRepository {
  private repo: Repository<User>;

  constructor() {
    this.repo = AppDataSource.getRepository(User);
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id, isActive: true } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repo.findOne({ where: { username, isActive: true } });
  }

  async findAll(role?: UserRole): Promise<User[]> {
    const where: any = { isActive: true };
    if (role) where.role = role;
    return this.repo.find({ where });
  }

  async findByTenantId(tenantId: string): Promise<User[]> {
    return this.repo.find({ where: { tenantId, isActive: true } });
  }

  async create(user: Partial<User>): Promise<User> {
    const entity = this.repo.create(user);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }
}
