import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { hashPassword } from '../utils/auth';
import { OperationLog } from '../entities/OperationLog';

export async function seedDatabase() {
  const userRepo = AppDataSource.getRepository(User);
  const existingUsers = await userRepo.count();

  if (existingUsers > 0) {
    console.log('[Seed] 数据库已存在用户数据，跳过初始化');
    return;
  }

  console.log('[Seed] 开始初始化数据...');

  const users: Partial<User>[] = [
    {
      username: 'admin',
      password: await hashPassword('admin123'),
      name: '系统管理员',
      department: '行政部',
      role: UserRole.ADMIN,
    },
    {
      username: 'zhangsan',
      password: await hashPassword('123456'),
      name: '张三',
      department: '销售部',
      role: UserRole.EMPLOYEE,
    },
    {
      username: 'lisi',
      password: await hashPassword('123456'),
      name: '李四',
      department: '销售部',
      role: UserRole.EMPLOYEE,
    },
    {
      username: 'wangwu',
      password: await hashPassword('123456'),
      name: '王五',
      department: '销售部',
      role: UserRole.APPROVER,
    },
    {
      username: 'zhaoliu',
      password: await hashPassword('123456'),
      name: '赵六',
      department: '法务部',
      role: UserRole.LEGAL,
    },
    {
      username: 'guard1',
      password: await hashPassword('123456'),
      name: '门卫老陈',
      department: '行政部',
      role: UserRole.GUARD,
    },
    {
      username: 'xingzheng',
      password: await hashPassword('123456'),
      name: '行政小刘',
      department: '行政部',
      role: UserRole.ADMIN,
    },
  ];

  await userRepo.save(users);
  console.log(`[Seed] 已创建 ${users.length} 个用户`);

  const opLogRepo = AppDataSource.getRepository(OperationLog);
  await opLogRepo.save({
    operatorName: '系统',
    action: 'SYSTEM_INIT',
    detail: '初始化数据库种子数据',
  });

  console.log('[Seed] 数据初始化完成');
  console.log('[Seed] 默认账号:');
  console.log('  行政管理员: admin / admin123');
  console.log('  销售员工: zhangsan / 123456');
  console.log('  审批人: wangwu / 123456');
  console.log('  法务: zhaoliu / 123456');
  console.log('  门卫: guard1 / 123456');
}
