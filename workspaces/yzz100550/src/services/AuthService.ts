import { UserRepository } from '../repositories/UserRepository';
import { signToken, JwtPayload } from '../utils/jwt';
import { BusinessError } from '../utils/response';
import { User, UserRole } from '../entities/User';

export class AuthService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  async login(username: string): Promise<{ token: string; user: JwtPayload }> {
    const user = await this.userRepo.findByUsername(username);
    if (!user) {
      throw new BusinessError('用户不存在', 401);
    }
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId || undefined,
    };
    const token = signToken(payload);
    return { token, user: payload };
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userRepo.findById(id);
  }

  async listUsers(role?: UserRole): Promise<User[]> {
    return this.userRepo.findAll(role);
  }

  async createUser(data: {
    username: string;
    name: string;
    role: UserRole;
    tenantId?: string;
  }): Promise<User> {
    const existing = await this.userRepo.findByUsername(data.username);
    if (existing) {
      throw new BusinessError('用户名已存在', 409);
    }
    return this.userRepo.create(data);
  }
}
