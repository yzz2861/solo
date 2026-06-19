import { UserRepository } from '../repositories/UserRepository';
import { TenantRepository } from '../repositories/TenantRepository';
import { UserRole } from '../entities/User';

const DEFAULT_USERS: { username: string; name: string; role: UserRole; tenantCode?: string }[] = [
  { username: 'admin', name: '系统管理员', role: 'admin' },
  { username: 'reception', name: '前台小王', role: 'reception' },
  { username: 'night', name: '夜班保安老李', role: 'night_shift' },
];

const DEFAULT_TENANTS = [
  { code: 'T001', name: '科技研发部', department: '研发中心', contactPerson: '张经理', contactPhone: '13800000001' },
  { code: 'T002', name: '市场销售部', department: '营销中心', contactPerson: '李总监', contactPhone: '13800000002' },
  { code: 'T003', name: '人力资源部', department: '行政中心', contactPerson: '王经理', contactPhone: '13800000003' },
  { code: 'T004', name: '财务部', department: '财务中心', contactPerson: '赵主管', contactPhone: '13800000004' },
  { code: 'T005', name: '运营服务部', department: '运营中心', contactPerson: '刘经理', contactPhone: '13800000005' },
];

const TENANT_USERS = [
  { username: 'rd_admin', name: '研发部审批员', role: 'tenant_admin' as UserRole, tenantCode: 'T001' },
  { username: 'sales_admin', name: '市场部审批员', role: 'tenant_admin' as UserRole, tenantCode: 'T002' },
  { username: 'hr_admin', name: '人事部审批员', role: 'tenant_admin' as UserRole, tenantCode: 'T003' },
];

export async function seedInitialData(): Promise<void> {
  const tenantRepo = new TenantRepository();
  const userRepo = new UserRepository();

  for (const t of DEFAULT_TENANTS) {
    const existing = await tenantRepo.findByCode(t.code);
    if (!existing) {
      await tenantRepo.create(t);
      console.log(`[Seed] Created tenant: ${t.name} (${t.code})`);
    }
  }

  for (const u of DEFAULT_USERS) {
    const existing = await userRepo.findByUsername(u.username);
    if (!existing) {
      await userRepo.create({
        username: u.username,
        name: u.name,
        role: u.role,
      });
      console.log(`[Seed] Created user: ${u.name} (${u.username}/${u.role})`);
    }
  }

  for (const tu of TENANT_USERS) {
    const existing = await userRepo.findByUsername(tu.username);
    if (!existing) {
      const tenant = await tenantRepo.findByCode(tu.tenantCode!);
      if (tenant) {
        await userRepo.create({
          username: tu.username,
          name: tu.name,
          role: tu.role,
          tenantId: tenant.id,
        });
        console.log(`[Seed] Created tenant user: ${tu.name} (${tu.username})`);
      }
    }
  }
}
