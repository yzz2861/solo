import { initializeDatabase, dbHelper } from './database';
import {
  PatientRepository, CompanyRepository, StaffRepository, ReportBatchRepository
} from './repositories';
import { StaffRole, ReportStatus } from './types';
import fs from 'fs';
import path from 'path';
import { config } from './config';

function cleanDb() {
  const dbDir = path.dirname(config.dbPath);
  if (fs.existsSync(config.dbPath)) {
    fs.unlinkSync(config.dbPath);
  }
  const wal = config.dbPath + '-wal';
  const shm = config.dbPath + '-shm';
  if (fs.existsSync(wal)) fs.unlinkSync(wal);
  if (fs.existsSync(shm)) fs.unlinkSync(shm);
  console.log(`已清理旧数据库`);
}

async function seed() {
  cleanDb();
  await initializeDatabase();
  console.log('开始初始化种子数据...');

  const receptionist = StaffRepository.create({
    name: '张前台',
    role: StaffRole.RECEPTIONIST,
    employee_no: 'R001'
  });
  console.log(`[员工] 前台: ${receptionist.name} (ID: ${receptionist.id})`);

  const customerService = StaffRepository.create({
    name: '李客服',
    role: StaffRole.CUSTOMER_SERVICE,
    employee_no: 'C001'
  });
  console.log(`[员工] 客服: ${customerService.name} (ID: ${customerService.id})`);

  const supervisor = StaffRepository.create({
    name: '王主管',
    role: StaffRole.SUPERVISOR,
    employee_no: 'S001'
  });
  console.log(`[员工] 主管: ${supervisor.name} (ID: ${supervisor.id})`);

  const patient1 = PatientRepository.create({
    name: '赵小明',
    id_card_no: '110101199001011234',
    phone: '13800000001'
  });
  console.log(`[体检人] 个人: ${patient1.name} (ID: ${patient1.id})`);

  const patient2 = PatientRepository.create({
    name: '钱小红',
    id_card_no: '110101199202022345',
    phone: '13800000002'
  });
  console.log(`[体检人] 个人: ${patient2.name} (ID: ${patient2.id})`);

  const company = CompanyRepository.create({
    name: '腾讯科技有限公司',
    contact_person: 'HR刘经理',
    contact_phone: '13900000001'
  });
  console.log(`[公司] 团检单位: ${company.name} (ID: ${company.id})`);

  const groupPatient1 = PatientRepository.create({
    name: '孙大伟',
    id_card_no: '110101198803033456',
    phone: '13800000003'
  });
  const groupPatient2 = PatientRepository.create({
    name: '周小琳',
    id_card_no: '110101199104044567',
    phone: '13800000004'
  });
  const groupPatient3 = PatientRepository.create({
    name: '吴建军',
    id_card_no: '110101198705055678',
    phone: '13800000005'
  });
  console.log(`[体检人] 团检员工: ${groupPatient1.name}, ${groupPatient2.name}, ${groupPatient3.name}`);

  const report1 = ReportBatchRepository.create({
    batch_no: 'RPT' + Date.now() + '001',
    patient_id: patient1.id,
    patient_name: patient1.name,
    patient_id_card_no: patient1.id_card_no,
    is_group: false,
    company_id: null,
    company_name: null,
    status: ReportStatus.READY,
    report_ready_at: new Date().toISOString()
  });
  console.log(`[报告] ${patient1.name} - ${report1.batch_no}`);

  const report2 = ReportBatchRepository.create({
    batch_no: 'RPT' + Date.now() + '002',
    patient_id: patient2.id,
    patient_name: patient2.name,
    patient_id_card_no: patient2.id_card_no,
    is_group: false,
    company_id: null,
    company_name: null,
    status: ReportStatus.READY,
    report_ready_at: new Date().toISOString()
  });
  console.log(`[报告] ${patient2.name} - ${report2.batch_no}`);

  const groupReport1 = ReportBatchRepository.create({
    batch_no: 'RPT' + Date.now() + '101',
    patient_id: groupPatient1.id,
    patient_name: groupPatient1.name,
    patient_id_card_no: groupPatient1.id_card_no,
    is_group: true,
    company_id: company.id,
    company_name: company.name,
    status: ReportStatus.READY,
    report_ready_at: new Date().toISOString()
  });
  const groupReport2 = ReportBatchRepository.create({
    batch_no: 'RPT' + Date.now() + '102',
    patient_id: groupPatient2.id,
    patient_name: groupPatient2.name,
    patient_id_card_no: groupPatient2.id_card_no,
    is_group: true,
    company_id: company.id,
    company_name: company.name,
    status: ReportStatus.READY,
    report_ready_at: new Date().toISOString()
  });
  const groupReport3 = ReportBatchRepository.create({
    batch_no: 'RPT' + Date.now() + '103',
    patient_id: groupPatient3.id,
    patient_name: groupPatient3.name,
    patient_id_card_no: groupPatient3.id_card_no,
    is_group: true,
    company_id: company.id,
    company_name: company.name,
    status: ReportStatus.READY,
    report_ready_at: new Date().toISOString()
  });
  console.log(`[报告] 团检报告: ${groupReport1.batch_no}, ${groupReport2.batch_no}, ${groupReport3.batch_no}`);

  dbHelper.save();

  console.log('\n========== 种子数据初始化完成 ==========');
  console.log(`员工ID - 前台: ${receptionist.id}, 客服: ${customerService.id}, 主管: ${supervisor.id}`);
  console.log(`公司ID: ${company.id} (${company.name})`);
  console.log(`个人报告: ${report1.batch_no}, ${report2.batch_no}`);
  console.log(`团检报告: ${groupReport1.batch_no}, ${groupReport2.batch_no}, ${groupReport3.batch_no}`);
}

seed().catch(e => {
  console.error('种子数据初始化失败:', e);
  process.exit(1);
});
