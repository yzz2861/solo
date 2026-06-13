import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { getDataSource } from '../data-source.js';
import { User } from '../entities/User.js';
import { UserRole, User as UserType, LoginRequest, LoginResponse } from '../../shared/types.js';
import { generateToken } from '../middleware/auth.js';

export class AuthService {
  private getUserRepository(): Repository<User> {
    return getDataSource().getRepository(User);
  }

  async login(request: LoginRequest): Promise<LoginResponse> {
    const repo = this.getUserRepository();
    const user = await repo.findOne({
      where: { username: request.username }
    });

    if (!user) {
      throw new Error('用户名或密码错误');
    }

    const isValid = await bcrypt.compare(request.password, user.passwordHash);
    if (!isValid) {
      throw new Error('用户名或密码错误');
    }

    const userData: UserType = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as UserRole,
      storeId: user.storeId
    };

    const token = generateToken(userData);

    return { token, user: userData };
  }

  async initDefaultUsers(): Promise<void> {
    const repo = this.getUserRepository();
    const staffCount = await repo.count({
      where: { username: 'staff1' }
    });

    if (staffCount === 0) {
      const passwordHash = await bcrypt.hash('staff123', 10);
      const staff = repo.create({
        id: 'staff-001',
        username: 'staff1',
        passwordHash,
        name: '张三',
        role: UserRole.STAFF,
        storeId: 'store-001'
      });
      await repo.save(staff);
      console.log('默认店员账号已创建: staff1 / staff123');
    }

    const managerCount = await repo.count({
      where: { username: 'manager1' }
    });

    if (managerCount === 0) {
      const passwordHash = await bcrypt.hash('manager123', 10);
      const manager = repo.create({
        id: 'manager-001',
        username: 'manager1',
        passwordHash,
        name: '李经理',
        role: UserRole.MANAGER,
        storeId: 'store-001'
      });
      await repo.save(manager);
      console.log('默认经理账号已创建: manager1 / manager123');
    }
  }
}
