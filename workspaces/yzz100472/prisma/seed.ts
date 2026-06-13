import { PrismaClient, UserRole, IDCardType, VisitStatus, AccessStatus, AccessDirection, AccessLogType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始播种数据...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  const tenant1 = await prisma.tenant.upsert({
    where: { id: 'tenant-001' },
    update: {},
    create: {
      id: 'tenant-001',
      name: '科技创新有限公司',
      contact: '张经理',
      phone: '13800138001',
      email: 'contact@tech-innovation.com',
      address: 'A座 15-18层',
    },
  });

  const tenant2 = await prisma.tenant.upsert({
    where: { id: 'tenant-002' },
    update: {},
    create: {
      id: 'tenant-002',
      name: '云端设计工作室',
      contact: '李主管',
      phone: '13900139002',
      email: 'hello@clouddesign.com',
      address: 'B座 5-6层',
    },
  });

  const tenant3 = await prisma.tenant.upsert({
    where: { id: 'tenant-003' },
    update: {},
    create: {
      id: 'tenant-003',
      name: '启航教育科技',
      contact: '王老师',
      phone: '13700137003',
      email: 'info@qihang-edu.com',
      address: 'C座 3-4层',
    },
  });

  console.log('租户数据创建完成');

  const adminOps = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      role: UserRole.OPERATIONS,
      phone: '13000000000',
      email: 'admin@example.com',
    },
  });

  const reception1 = await prisma.user.upsert({
    where: { username: 'reception' },
    update: {},
    create: {
      username: 'reception',
      password: hashedPassword,
      name: '前台小陈',
      role: UserRole.RECEPTION,
      phone: '13000000001',
      email: 'reception@example.com',
    },
  });

  const security1 = await prisma.user.upsert({
    where: { username: 'security' },
    update: {},
    create: {
      username: 'security',
      password: hashedPassword,
      name: '安保老刘',
      role: UserRole.SECURITY,
      phone: '13000000002',
      email: 'security@example.com',
    },
  });

  const tenantAdmin1 = await prisma.user.upsert({
    where: { username: 'tenant_admin_1' },
    update: {},
    create: {
      username: 'tenant_admin_1',
      password: hashedPassword,
      name: '科技公司张管理',
      role: UserRole.TENANT_ADMIN,
      phone: '13800138001',
      email: 'admin@tech-innovation.com',
      tenantId: tenant1.id,
    },
  });

  const tenantAdmin2 = await prisma.user.upsert({
    where: { username: 'tenant_admin_2' },
    update: {},
    create: {
      username: 'tenant_admin_2',
      password: hashedPassword,
      name: '云端设计李管理',
      role: UserRole.TENANT_ADMIN,
      phone: '13900139002',
      email: 'admin@clouddesign.com',
      tenantId: tenant2.id,
    },
  });

  console.log('用户数据创建完成');

  const room1 = await prisma.meetingRoom.upsert({
    where: { id: 'room-001' },
    update: {},
    create: {
      id: 'room-001',
      name: '星空会议室',
      floor: '3层',
      capacity: 8,
      status: 'ACTIVE',
    },
  });

  const room2 = await prisma.meetingRoom.upsert({
    where: { id: 'room-002' },
    update: {},
    create: {
      id: 'room-002',
      name: '阳光会议室',
      floor: '5层',
      capacity: 12,
      status: 'ACTIVE',
    },
  });

  const room3 = await prisma.meetingRoom.upsert({
    where: { id: 'room-003' },
    update: {},
    create: {
      id: 'room-003',
      name: '海洋会议室',
      floor: '8层',
      capacity: 20,
      status: 'ACTIVE',
    },
  });

  const room4 = await prisma.meetingRoom.upsert({
    where: { id: 'room-004' },
    update: {},
    create: {
      id: 'room-004',
      name: '竹林小会议室',
      floor: '2层',
      capacity: 4,
      status: 'ACTIVE',
    },
  });

  console.log('会议室数据创建完成');

  const visitor1 = await prisma.visitor.upsert({
    where: {
      tenantId_idCardNumber: {
        tenantId: tenant1.id,
        idCardNumber: '110101199001011234',
      },
    },
    update: {},
    create: {
      name: '李明',
      idCardType: IDCardType.ID_CARD,
      idCardNumber: '110101199001011234',
      phone: '13600136001',
      company: '北京供应商公司',
      tenantId: tenant1.id,
    },
  });

  const visitor2 = await prisma.visitor.upsert({
    where: {
      tenantId_idCardNumber: {
        tenantId: tenant1.id,
        idCardNumber: '310101199205056789',
      },
    },
    update: {},
    create: {
      name: '王芳',
      idCardType: IDCardType.ID_CARD,
      idCardNumber: '310101199205056789',
      phone: '13600136002',
      company: '上海合作伙伴',
      tenantId: tenant1.id,
    },
  });

  const visitor3 = await prisma.visitor.upsert({
    where: {
      tenantId_idCardNumber: {
        tenantId: tenant2.id,
        idCardNumber: '440101198808081234',
      },
    },
    update: {},
    create: {
      name: '张伟',
      idCardType: IDCardType.ID_CARD,
      idCardNumber: '440101198808081234',
      phone: '13700137003',
      company: '广州客户',
      tenantId: tenant2.id,
    },
  });

  const visitor4 = await prisma.visitor.upsert({
    where: {
      tenantId_idCardNumber: {
        tenantId: tenant3.id,
        idCardNumber: '510101199503034321',
      },
    },
    update: {},
    create: {
      name: '刘洋',
      idCardType: IDCardType.ID_CARD,
      idCardNumber: '510101199503034321',
      phone: '13800138004',
      company: '成都培训机构',
      tenantId: tenant3.id,
    },
  });

  console.log('访客数据创建完成');

  const today = dayjs();
  const yesterday = dayjs().subtract(1, 'day');
  const tomorrow = dayjs().add(1, 'day');

  const visit1 = await prisma.visitRecord.create({
    data: {
      visitorId: visitor1.id,
      tenantId: tenant1.id,
      visitorName: '李明',
      visitorPhone: '13600136001',
      idCardType: IDCardType.ID_CARD,
      idCardNumber: '110101199001011234',
      purpose: '商务洽谈，讨论合作项目细节',
      startTime: today.hour(9).minute(0).second(0).toDate(),
      endTime: today.hour(12).minute(0).second(0).toDate(),
      status: VisitStatus.APPROVED,
      meetingRoomId: room1.id,
      meetingName: 'Q3项目合作洽谈',
      actualEntryAt: today.hour(9).minute(5).second(30).toDate(),
      approvedBy: adminOps.id,
      approvedAt: today.hour(8).minute(30).second(0).toDate(),
      createdBy: tenantAdmin1.id,
    },
  });

  const visit2 = await prisma.visitRecord.create({
    data: {
      visitorId: visitor1.id,
      tenantId: tenant1.id,
      visitorName: '李明',
      visitorPhone: '13600136001',
      idCardType: IDCardType.ID_CARD,
      idCardNumber: '110101199001011234',
      purpose: '下午继续讨论技术方案',
      startTime: today.hour(14).minute(0).second(0).toDate(),
      endTime: today.hour(18).minute(0).second(0).toDate(),
      status: VisitStatus.APPROVED,
      meetingRoomId: room2.id,
      meetingName: '技术方案评审会',
      approvedBy: adminOps.id,
      approvedAt: today.hour(8).minute(30).second(0).toDate(),
      createdBy: tenantAdmin1.id,
    },
  });

  const visit3 = await prisma.visitRecord.create({
    data: {
      visitorId: visitor2.id,
      tenantId: tenant1.id,
      visitorName: '王芳',
      visitorPhone: '13600136002',
      idCardType: IDCardType.ID_CARD,
      idCardNumber: '310101199205056789',
      purpose: '合同签订',
      startTime: today.hour(10).minute(30).second(0).toDate(),
      endTime: today.hour(15).minute(0).second(0).toDate(),
      status: VisitStatus.PENDING,
      meetingRoomId: room4.id,
      meetingName: '合同签约',
      createdBy: tenantAdmin1.id,
    },
  });

  const visit4 = await prisma.visitRecord.create({
    data: {
      visitorId: visitor3.id,
      tenantId: tenant2.id,
      visitorName: '张伟',
      visitorPhone: '13700137003',
      idCardType: IDCardType.ID_CARD,
      idCardNumber: '440101198808081234',
      purpose: '设计方案交流',
      startTime: today.hour(11).minute(0).second(0).toDate(),
      endTime: today.hour(17).minute(0).second(0).toDate(),
      status: VisitStatus.APPROVED,
      meetingRoomId: room3.id,
      meetingName: '品牌设计讨论',
      actualEntryAt: today.hour(10).minute(55).second(0).toDate(),
      approvedBy: reception1.id,
      approvedAt: today.hour(10).minute(0).second(0).toDate(),
      createdBy: tenantAdmin2.id,
    },
  });

  const visit5 = await prisma.visitRecord.create({
    data: {
      visitorId: visitor4.id,
      tenantId: tenant3.id,
      visitorName: '刘洋',
      visitorPhone: '13800138004',
      idCardType: IDCardType.ID_CARD,
      idCardNumber: '510101199503034321',
      purpose: '课程合作洽谈',
      startTime: yesterday.hour(14).minute(0).second(0).toDate(),
      endTime: yesterday.hour(17).minute(0).second(0).toDate(),
      status: VisitStatus.APPROVED,
      meetingRoomId: room1.id,
      meetingName: '课程合作',
      actualEntryAt: yesterday.hour(13).minute(55).second(0).toDate(),
      actualExitAt: yesterday.hour(17).minute(15).second(0).toDate(),
      approvedBy: reception1.id,
      approvedAt: yesterday.hour(13).minute(30).second(0).toDate(),
      createdBy: adminOps.id,
    },
  });

  const visit6 = await prisma.visitRecord.create({
    data: {
      visitorId: visitor2.id,
      tenantId: tenant1.id,
      visitorName: '王芳',
      visitorPhone: '13600136002',
      idCardType: IDCardType.ID_CARD,
      idCardNumber: '310101199205056789',
      purpose: '明天的项目启动会',
      startTime: tomorrow.hour(9).minute(0).second(0).toDate(),
      endTime: tomorrow.hour(18).minute(0).second(0).toDate(),
      status: VisitStatus.PENDING,
      meetingRoomId: room2.id,
      meetingName: '项目启动会',
      createdBy: tenantAdmin1.id,
    },
  });

  console.log('到访记录创建完成');

  const accessPerm1 = await prisma.accessPermission.create({
    data: {
      visitRecordId: visit1.id,
      tenantId: tenant1.id,
      visitorName: '李明',
      cardNumber: 'V001',
      accessDoors: '主入口,3层门禁,星空会议室',
      startTime: visit1.startTime,
      endTime: visit1.endTime,
      status: AccessStatus.ACTIVE,
    },
  });

  const accessPerm2 = await prisma.accessPermission.create({
    data: {
      visitRecordId: visit2.id,
      tenantId: tenant1.id,
      visitorName: '李明',
      cardNumber: 'V001',
      accessDoors: '主入口,5层门禁,阳光会议室',
      startTime: visit2.startTime,
      endTime: visit2.endTime,
      status: AccessStatus.ACTIVE,
    },
  });

  const accessPerm3 = await prisma.accessPermission.create({
    data: {
      visitRecordId: visit4.id,
      tenantId: tenant2.id,
      visitorName: '张伟',
      cardNumber: 'V002',
      accessDoors: '主入口,8层门禁,海洋会议室',
      startTime: visit4.startTime,
      endTime: visit4.endTime,
      status: AccessStatus.ACTIVE,
    },
  });

  const accessPerm4 = await prisma.accessPermission.create({
    data: {
      visitRecordId: visit5.id,
      tenantId: tenant3.id,
      visitorName: '刘洋',
      cardNumber: 'V003',
      accessDoors: '主入口,3层门禁,星空会议室',
      startTime: visit5.startTime,
      endTime: visit5.endTime,
      status: AccessStatus.EXPIRED,
      revokedAt: visit5.endTime,
      revokedReason: '访问时段已结束，自动撤权',
    },
  });

  console.log('门禁权限创建完成');

  await prisma.accessLog.createMany({
    data: [
      {
        accessPermissionId: accessPerm1.id,
        visitRecordId: visit1.id,
        doorName: '主入口',
        cardNumber: 'V001',
        direction: AccessDirection.IN,
        accessTime: today.hour(9).minute(5).second(30).toDate(),
        logType: AccessLogType.NORMAL,
        visitorName: '李明',
        tenantName: tenant1.name,
      },
      {
        accessPermissionId: accessPerm1.id,
        visitRecordId: visit1.id,
        doorName: '3层门禁',
        cardNumber: 'V001',
        direction: AccessDirection.IN,
        accessTime: today.hour(9).minute(8).second(15).toDate(),
        logType: AccessLogType.NORMAL,
        visitorName: '李明',
        tenantName: tenant1.name,
      },
      {
        accessPermissionId: accessPerm3.id,
        visitRecordId: visit4.id,
        doorName: '主入口',
        cardNumber: 'V002',
        direction: AccessDirection.IN,
        accessTime: today.hour(10).minute(55).second(0).toDate(),
        logType: AccessLogType.NORMAL,
        visitorName: '张伟',
        tenantName: tenant2.name,
      },
      {
        accessPermissionId: accessPerm4.id,
        visitRecordId: visit5.id,
        doorName: '主入口',
        cardNumber: 'V003',
        direction: AccessDirection.IN,
        accessTime: yesterday.hour(13).minute(55).second(0).toDate(),
        logType: AccessLogType.NORMAL,
        visitorName: '刘洋',
        tenantName: tenant3.name,
      },
      {
        accessPermissionId: accessPerm4.id,
        visitRecordId: visit5.id,
        doorName: '主入口',
        cardNumber: 'V003',
        direction: AccessDirection.OUT,
        accessTime: yesterday.hour(17).minute(15).second(0).toDate(),
        logType: AccessLogType.NORMAL,
        visitorName: '刘洋',
        tenantName: tenant3.name,
      },
      {
        doorName: 'B座侧门',
        cardNumber: 'UNKNOWN',
        direction: AccessDirection.IN,
        accessTime: today.hour(8).minute(0).second(0).toDate(),
        logType: AccessLogType.ABNORMAL,
        abnormalReason: '未找到对应门禁权限',
      },
      {
        accessPermissionId: accessPerm1.id,
        visitRecordId: visit1.id,
        doorName: '8层门禁',
        cardNumber: 'V001',
        direction: AccessDirection.IN,
        accessTime: today.hour(9).minute(12).second(0).toDate(),
        logType: AccessLogType.ABNORMAL,
        abnormalReason: '不在授权区域内',
        visitorName: '李明',
        tenantName: tenant1.name,
      },
    ],
  });

  console.log('门禁记录创建完成');

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           种子数据播种完成！                               ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  测试账号 (密码均为 123456):                              ║');
  console.log('║  - 运营管理员: admin                                      ║');
  console.log('║  - 前台: reception                                        ║');
  console.log('║  - 安保: security                                         ║');
  console.log('║  - 租户管理员1: tenant_admin_1 (科技创新)                 ║');
  console.log('║  - 租户管理员2: tenant_admin_2 (云端设计)                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
