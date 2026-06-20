import { initializeDatabase, dbHelper } from './database';
import {
  AuthorizationService, PickupService, MailService, GroupCheckService,
  ExceptionService, RevokeService
} from './services';
import {
  StaffRepository, ReportBatchRepository, CompanyRepository, PatientRepository
} from './repositories';
import { PickupMethod, AuthorizedType, MailStatus, StaffRole, ReportStatus } from './types';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.log(`  ✗ ${message}`);
  }
}

function assertThrows(fn: () => any, msgContains: string, testName: string) {
  try {
    fn();
    failed++;
    failures.push(`${testName} - 应该抛出异常但未抛出`);
    console.log(`  ✗ ${testName} - 应该抛出异常但未抛出`);
  } catch (e: any) {
    if (e.message && e.message.includes(msgContains)) {
      passed++;
      console.log(`  ✓ ${testName}`);
    } else {
      failed++;
      failures.push(`${testName} - 错误信息不包含"${msgContains}"，实际: ${e.message}`);
      console.log(`  ✗ ${testName} - 错误信息不包含"${msgContains}"，实际: ${e.message}`);
    }
  }
}

async function runTests() {
  await initializeDatabase();
  console.log('\n========== 开始核心流程测试 ==========\n');

  const staff = StaffRepository.findByEmployeeNo('R001')!;
  const staffCs = StaffRepository.findByEmployeeNo('C001')!;
  const staffSuper = StaffRepository.findByEmployeeNo('S001')!;
  console.log(`使用员工: 前台 ${staff.name}(ID:${staff.id}), 客服 ${staffCs.name}(ID:${staffCs.id}), 主管 ${staffSuper.name}(ID:${staffSuper.id})`);

  const patient1 = PatientRepository.findByIdCard('110101199001011234')!;
  const patient2 = PatientRepository.findByIdCard('110101199202022345')!;
  const company = CompanyRepository.findByName('腾讯科技有限公司')!;
  const reports = ReportBatchRepository.findReadyForPickup({ page: 1, page_size: 20 });
  const personalReport1 = reports.list.find(r => r.patient_id === patient1.id)!;
  const personalReport2 = reports.list.find(r => r.patient_id === patient2.id)!;
  const groupReports = reports.list.filter(r => r.is_group);

  console.log(`\n找到个人报告: ${personalReport1.batch_no}, ${personalReport2.batch_no}`);
  console.log(`找到团检报告 ${groupReports.length} 份, 公司: ${company.name}\n`);

  // ============ 测试1: 家属代领授权 ============
  console.log('【测试1】家属代领授权流程');
  const auth1 = AuthorizationService.create({
    batch_no: personalReport1.batch_no,
    pickup_method: PickupMethod.AUTHORIZED,
    authorized_type: AuthorizedType.FAMILY,
    authorized_person_name: '赵大哥',
    authorized_person_id_card: '110101198501010001',
    authorized_person_phone: '13900000002',
    authorization_material: '身份证照片+授权委托书',
    created_by: staff.id
  });
  assert(auth1.id > 0, '创建家属代领授权成功');
  assert(auth1.status === 'active', '授权状态为active');
  assert(auth1.authorized_person_name === '赵大哥', '代领人姓名正确');

  // ============ 测试2: 未授权拦截 ============
  console.log('\n【测试2】未授权不能代领（自动记录异常）');
  assertThrows(() => {
    PickupService.pickup({
      batch_no: personalReport2.batch_no,
      pickup_method: PickupMethod.AUTHORIZED,
      pickup_person_name: '陌生人',
      pickup_person_id_card: '110101199999999999',
      picked_up_by: staff.id
    });
  }, '未授权不能代领', '无授权代领应被拦截');

  const exceptions = ExceptionService.list({ page: 1, page_size: 10 });
  assert(exceptions.list.length >= 1, '异常拦截记录已自动写入');

  // ============ 测试3: 已授权但代领人身份证不符 ============
  console.log('\n【测试3】代领人身份证不匹配（自动记录异常）');
  assertThrows(() => {
    PickupService.pickup({
      batch_no: personalReport1.batch_no,
      pickup_method: PickupMethod.AUTHORIZED,
      pickup_person_name: '冒充者',
      pickup_person_id_card: '110101199999999999',
      picked_up_by: staff.id
    });
  }, '实际代领人与授权代领人不符', '代领人身份证不对应被拦截');

  // ============ 测试4: 家属代领成功 ============
  console.log('\n【测试4】家属代领成功');
  const pickup1 = PickupService.pickup({
    batch_no: personalReport1.batch_no,
    pickup_method: PickupMethod.AUTHORIZED,
    pickup_person_name: '赵大哥',
    pickup_person_id_card: '110101198501010001',
    authorization_id: auth1.id,
    picked_up_by: staff.id
  });
  assert(pickup1.pickup_method === PickupMethod.AUTHORIZED, '领取方式为代领');
  assert(pickup1.pickup_person_name === '赵大哥', '领取人正确');
  const usedAuth = AuthorizationService.getById(auth1.id);
  assert(usedAuth.status === 'used', '授权状态变为used');

  // ============ 测试5: 本人领取身份证不匹配 ============
  console.log('\n【测试5】本人领取身份证不匹配');
  assertThrows(() => {
    PickupService.pickup({
      batch_no: personalReport2.batch_no,
      pickup_method: PickupMethod.SELF,
      pickup_person_name: patient2.name,
      pickup_person_id_card: '110101999999999999',
      picked_up_by: staff.id
    });
  }, '本人领取身份证号不匹配', '本人领取身份证不对应被拒绝');

  // ============ 测试6: 本人领取成功 ============
  console.log('\n【测试6】本人领取成功');
  const pickup2 = PickupService.pickup({
    batch_no: personalReport2.batch_no,
    pickup_method: PickupMethod.SELF,
    pickup_person_name: patient2.name,
    pickup_person_id_card: patient2.id_card_no,
    picked_up_by: staff.id
  });
  assert(pickup2.pickup_method === PickupMethod.SELF, '领取方式为本人领取');

  // ============ 测试7: 已领取报告不能再创建授权 ============
  console.log('\n【测试7】已领取报告不能再创建授权');
  assertThrows(() => {
    AuthorizationService.create({
      batch_no: personalReport1.batch_no,
      pickup_method: PickupMethod.AUTHORIZED,
      authorized_type: AuthorizedType.FAMILY,
      authorized_person_name: '另一人',
      authorized_person_id_card: '110101198801010001',
      created_by: staff.id
    });
  }, '报告已被领取', '已领取报告不能创建授权');

  // ============ 测试8: 公司团检邮寄 ============
  console.log('\n【测试8】团检报告邮寄登记');
  const groupReport1 = groupReports[0];
  const mail = MailService.create({
    batch_no: groupReport1.batch_no,
    receiver_name: 'HR刘经理',
    receiver_phone: '13900000001',
    receiver_address: '深圳市南山区科技园腾讯大厦',
    courier_company: '顺丰速运',
    tracking_no: 'SF' + Date.now(),
    mailed_by: staffCs.id
  });
  assert(mail.status === MailStatus.SHIPPED, '邮寄状态为已发出');
  assert(mail.tracking_no.startsWith('SF'), '运单号正确');

  // ============ 测试9: 已邮寄报告不能再现场领取 ============
  console.log('\n【测试9】已邮寄报告不能再现场领取');
  assertThrows(() => {
    PickupService.pickup({
      batch_no: groupReport1.batch_no,
      pickup_method: PickupMethod.SELF,
      pickup_person_name: groupReport1.patient_name,
      pickup_person_id_card: groupReport1.patient_id_card_no,
      picked_up_by: staff.id
    });
  }, '报告已邮寄，不能再现场领取', '已邮寄的报告不能再现场领取');

  // ============ 测试10: 邮寄状态更新 ============
  console.log('\n【测试10】客服更新邮寄状态（已签收）');
  const deliveredAt = new Date().toISOString();
  const updatedMail = MailService.updateStatus(mail.id, MailStatus.DELIVERED, deliveredAt);
  assert(updatedMail.status === MailStatus.DELIVERED, '邮寄状态更新为已签收');
  assert(updatedMail.delivered_at === deliveredAt, '签收时间已记录');

  // ============ 测试11: 创建公司代领授权 ============
  console.log('\n【测试11】公司代领授权');
  const groupReport2 = groupReports[1];
  const companyAuth = AuthorizationService.create({
    batch_no: groupReport2.batch_no,
    pickup_method: PickupMethod.AUTHORIZED,
    authorized_type: AuthorizedType.COMPANY,
    authorized_person_name: 'HR刘经理',
    authorized_person_id_card: '110101198006068888',
    authorized_person_phone: '13900000001',
    authorization_material: '公司介绍信原件+经办人身份证',
    created_by: staff.id
  });
  assert(companyAuth.authorized_type === AuthorizedType.COMPANY, '授权类型为公司代领');

  // ============ 测试12: 撤销授权 ============
  console.log('\n【测试12】撤销授权 - 记录时间和经办人');
  const groupReport3 = groupReports[2];
  const tempAuth = AuthorizationService.create({
    batch_no: groupReport3.batch_no,
    pickup_method: PickupMethod.AUTHORIZED,
    authorized_type: AuthorizedType.COMPANY,
    authorized_person_name: '错误的人',
    authorized_person_id_card: '110101199909090909',
    created_by: staff.id
  });
  const revoke = AuthorizationService.revoke({
    authorization_id: tempAuth.id,
    reason: '代领人信息填写错误，更正为HR刘经理',
    revoked_by: staffSuper.id
  });
  assert(revoke.revoked_by_name === staffSuper.name, '撤销经办人正确');
  assert(revoke.reason.includes('填写错误'), '撤销原因正确');
  assert(!!revoke.revoked_at, '撤销时间已记录');
  const revokedAuth = AuthorizationService.getById(tempAuth.id);
  assert(revokedAuth.status === 'revoked', '授权状态已变为revoked');

  const revokeRecords = RevokeService.list({ page: 1, page_size: 10 });
  assert(revokeRecords.list.length >= 1, '撤销记录可查询');

  // ============ 测试13: 非团检不能使用公司代领 ============
  console.log('\n【测试13】非团检报告不能用公司代领');
  const tempPatient = PatientRepository.create({
    name: '临时测试人',
    id_card_no: '110101200012129999',
    phone: '13999999999'
  });
  const tempPersonalReport = ReportBatchRepository.create({
    batch_no: 'RPT' + Date.now() + 'TEMP',
    patient_id: tempPatient.id,
    patient_name: tempPatient.name,
    patient_id_card_no: tempPatient.id_card_no,
    is_group: false,
    company_id: null,
    company_name: null,
    status: 'ready' as ReportStatus,
    report_ready_at: new Date().toISOString()
  });
  assertThrows(() => {
    AuthorizationService.create({
      batch_no: tempPersonalReport.batch_no,
      pickup_method: PickupMethod.AUTHORIZED,
      authorized_type: AuthorizedType.COMPANY,
      authorized_person_name: '某公司HR',
      authorized_person_id_card: '110101198808080808',
      created_by: staff.id
    });
  }, '非团检报告不能使用公司代领', '非团检报告不能使用公司代领');

  // ============ 测试14: 团检批量核验 ============
  console.log('\n【测试14】团检批量查看 - 哪些允许公司代领、哪些必须本人确认');
  const groupCheck = GroupCheckService.checkCompanyPickupEligibility(company.id, { page: 1, page_size: 50 });
  assert(groupCheck.list.length >= 3, `查询到 ${groupCheck.list.length} 份团检报告`);
  console.log(`    汇总: 总计=${groupCheck.summary.total}, 可公司代领=${groupCheck.summary.can_company_pickup}, 需本人确认=${groupCheck.summary.must_self_confirm}, 已领取=${groupCheck.summary.already_picked}, 已邮寄=${groupCheck.summary.already_mailed}`);

  const hasEligible = groupCheck.list.some(x => x.can_company_pickup);
  assert(hasEligible, '存在允许公司代领的报告');
  const hasNeedConfirm = groupCheck.list.some(x => x.must_self_confirm || x.reason.includes('已邮寄') || x.reason.includes('已被领取'));
  assert(hasNeedConfirm, '存在需本人确认或已处理的报告');

  groupCheck.list.forEach((item, i) => {
    console.log(`    [${i + 1}] ${item.batch.patient_name} - 可公司代领:${item.can_company_pickup} 需本人确认:${item.must_self_confirm} - ${item.reason}`);
  });

  // ============ 测试15: 主管导出 ============
  console.log('\n【测试15】主管综合导出（代领/撤销/异常）');
  const authList = AuthorizationService.list({ page: 1, page_size: 100 });
  assert(authList.list.length >= 3, `可导出授权记录 ${authList.list.length} 条`);
  const allExceptions = ExceptionService.list({ page: 1, page_size: 100 });
  assert(allExceptions.list.length >= 2, `可导出异常拦截记录 ${allExceptions.list.length} 条`);
  const allRevokes = RevokeService.list({ page: 1, page_size: 100 });
  assert(allRevokes.list.length >= 1, `可导出撤销记录 ${allRevokes.list.length} 条`);

  // ============ 测试16: 前台今日领取查询 ============
  console.log('\n【测试16】前台查今日领取记录');
  const today = new Date().toISOString().slice(0, 10);
  const todayPickups = PickupService.getTodayPickups(today, { page: 1, page_size: 20 });
  assert(todayPickups.list.length >= 2, `今日领取记录 ${todayPickups.list.length} 条`);

  // ============ 测试17: 客服查邮寄进度 ============
  console.log('\n【测试17】客服查询邮寄进度');
  const mailList = MailService.list({ page: 1, page_size: 20 });
  assert(mailList.list.length >= 1, `可查询邮寄记录 ${mailList.list.length} 条`);
  const mailByTracking = MailService.getByTrackingNo(mail.tracking_no);
  assert(mailByTracking.id === mail.id, '通过运单号可查询到邮寄记录');

  dbHelper.save();

  console.log('\n========== 测试结果汇总 ==========');
  console.log(`通过: ${passed}, 失败: ${failed}`);
  if (failures.length > 0) {
    console.log('\n失败用例:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('测试执行出错:', e);
  process.exit(1);
});
