import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hp(pwd: string) {
  return bcrypt.hash(pwd, 10);
}

async function main() {
  console.log('🌱 开始植入种子数据...');

  await prisma.auditLog.deleteMany();
  await prisma.boardingRecord.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.parentStudent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.busStop.deleteMany();
  await prisma.busRoute.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  const pwd = await hp('123456');

  const admin = await prisma.user.create({
    data: { email: 'admin@school.edu', password: pwd, name: '王督导', role: 'ADMIN' },
  });

  const class1 = await prisma.class.create({ data: { name: '三年级(1)班', grade: 3 } });
  const class2 = await prisma.class.create({ data: { name: '三年级(2)班', grade: 3 } });

  const teacher1 = await prisma.user.create({
    data: { email: 'teacher1@school.edu', password: pwd, name: '李老师', role: 'TEACHER', classId: class1.id },
  });
  const teacher2 = await prisma.user.create({
    data: { email: 'teacher2@school.edu', password: pwd, name: '赵老师', role: 'TEACHER', classId: class2.id },
  });

  const route1 = await prisma.busRoute.create({
    data: { name: '1号线-城东线', plateNo: '沪A-12345', capacity: 30 },
  });
  const route2 = await prisma.busRoute.create({
    data: { name: '2号线-城南线', plateNo: '沪A-67890', capacity: 28 },
  });

  const driver1 = await prisma.user.create({
    data: { email: 'driver1@school.edu', password: pwd, name: '张师傅', role: 'DRIVER', routeId: route1.id },
  });
  const conductor1 = await prisma.user.create({
    data: { email: 'conductor1@school.edu', password: pwd, name: '刘老师', role: 'CONDUCTOR', routeId: route1.id },
  });
  const driver2 = await prisma.user.create({
    data: { email: 'driver2@school.edu', password: pwd, name: '陈师傅', role: 'DRIVER', routeId: route2.id },
  });
  const conductor2 = await prisma.user.create({
    data: { email: 'conductor2@school.edu', password: pwd, name: '周老师', role: 'CONDUCTOR', routeId: route2.id },
  });

  const stop1r1 = await prisma.busStop.create({
    data: { name: '东门小区站', address: '城东东门小区门口', routeId: route1.id, sequence: 1 },
  });
  const stop2r1 = await prisma.busStop.create({
    data: { name: '外婆家站', address: '城东区花园路88号', routeId: route1.id, sequence: 2 },
  });
  const stop3r1 = await prisma.busStop.create({
    data: { name: '少年宫站', address: '城东区少年宫广场', routeId: route1.id, sequence: 3 },
  });
  const stop1r2 = await prisma.busStop.create({
    data: { name: '南门花园站', address: '城南南门花园', routeId: route2.id, sequence: 1 },
  });
  const stop2r2 = await prisma.busStop.create({
    data: { name: '体育馆站', address: '城南体育馆北门', routeId: route2.id, sequence: 2 },
  });
  const stop3r2 = await prisma.busStop.create({
    data: { name: '奶奶家站', address: '城南区幸福路12号', routeId: route2.id, sequence: 3 },
  });

  const parent1 = await prisma.user.create({
    data: { email: 'parent1@qq.com', password: pwd, name: '小明爸爸', role: 'PARENT' },
  });
  const parent2 = await prisma.user.create({
    data: { email: 'parent2@qq.com', password: pwd, name: '小红妈妈', role: 'PARENT' },
  });
  const parent3 = await prisma.user.create({
    data: { email: 'parent3@qq.com', password: pwd, name: '小刚爸爸', role: 'PARENT' },
  });

  const s1 = await prisma.student.create({
    data: {
      name: '王小名', studentNo: 'S2023001',
      classId: class1.id, defaultRouteId: route1.id, defaultStopId: stop1r1.id,
    },
  });
  const s2 = await prisma.student.create({
    data: {
      name: '李小红', studentNo: 'S2023002',
      classId: class1.id, defaultRouteId: route1.id, defaultStopId: stop3r1.id,
    },
  });
  const s3 = await prisma.student.create({
    data: {
      name: '张大刚', studentNo: 'S2023003',
      classId: class1.id, defaultRouteId: route1.id, defaultStopId: stop1r1.id,
    },
  });
  const s4 = await prisma.student.create({
    data: {
      name: '赵小美', studentNo: 'S2023004',
      classId: class2.id, defaultRouteId: route2.id, defaultStopId: stop1r2.id,
    },
  });
  const s5 = await prisma.student.create({
    data: {
      name: '孙小强', studentNo: 'S2023005',
      classId: class2.id, defaultRouteId: route2.id, defaultStopId: stop2r2.id,
    },
  });

  await prisma.parentStudent.createMany({
    data: [
      { parentId: parent1.id, studentId: s1.id },
      { parentId: parent2.id, studentId: s2.id },
      { parentId: parent3.id, studentId: s3.id },
      { parentId: parent1.id, studentId: s4.id },
    ],
  });

  console.log('✅ 种子数据植入完成！');
  console.log('');
  console.log('测试账号（密码均为 123456）：');
  console.log('  校务处   admin@school.edu    王督导');
  console.log('  班主任   teacher1@school.edu 李老师（三年级1班）');
  console.log('  班主任   teacher2@school.edu 赵老师（三年级2班）');
  console.log('  司机     driver1@school.edu  张师傅（1号线）');
  console.log('  跟车老师 conductor1@school.edu 刘老师（1号线）');
  console.log('  司机     driver2@school.edu  陈师傅（2号线）');
  console.log('  跟车老师 conductor2@school.edu 周老师（2号线）');
  console.log('  家长     parent1@qq.com      小明爸爸（王小名、赵小美）');
  console.log('  家长     parent2@qq.com      小红妈妈（李小红）');
  console.log('  家长     parent3@qq.com      小刚爸爸（张大刚）');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
