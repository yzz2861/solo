import { Repository } from 'typeorm';
import { Visitor } from '../entities/Visitor';
import { AppDataSource } from '../config/database';

export class VisitorRepository {
  private repo: Repository<Visitor>;

  constructor() {
    this.repo = AppDataSource.getRepository(Visitor);
  }

  async findById(id: string): Promise<Visitor | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByPhone(phone: string): Promise<Visitor | null> {
    return this.repo.findOne({ where: { phone } });
  }

  async search(keyword: string): Promise<Visitor[]> {
    return this.repo
      .createQueryBuilder('v')
      .where('v.name LIKE :kw OR v.phone LIKE :kw OR v.company LIKE :kw', {
        kw: `%${keyword}%`,
      })
      .orderBy('v.createdAt', 'DESC')
      .limit(50)
      .getMany();
  }

  async findOrCreate(data: {
    name: string;
    phone: string;
    company?: string;
    idCard?: string;
  }): Promise<Visitor> {
    let visitor = await this.findByPhone(data.phone);
    if (visitor) {
      let needUpdate = false;
      if (data.name && visitor.name !== data.name) {
        visitor.name = data.name;
        needUpdate = true;
      }
      if (data.company && visitor.company !== data.company) {
        visitor.company = data.company;
        needUpdate = true;
      }
      if (data.idCard && !visitor.idCard) {
        visitor.idCard = data.idCard;
        needUpdate = true;
      }
      if (needUpdate) {
        visitor = await this.repo.save(visitor);
      }
      return visitor;
    }
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<Visitor>): Promise<Visitor | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }
}
