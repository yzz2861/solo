import type { RawComplaintRow } from './dataCleaner';

export type MockComplaintRow = RawComplaintRow;

const COMMUNITIES = ['阳光花园', '翠湖天地', '绿城水岸', '金色家园'];
const BUILDINGS = ['1号楼', '2号楼', '3号楼', '5号楼', '6号楼', '8号楼', '9号楼', '10号楼'];
const STAFFS = ['张管家', '李管家', '王管家', '赵管家', '陈管家'];
const OWNERS = [
  { name: '王先生', room: '101', phone: '13800138001' },
  { name: '李女士', room: '202', phone: '13800138002' },
  { name: '张先生', room: '305', phone: '13800138003' },
  { name: '刘女士', room: '408', phone: '13800138004' },
  { name: '陈先生', room: '502', phone: '13800138005' },
  { name: '杨女士', room: '601', phone: '13800138006' },
  { name: '黄先生', room: '703', phone: '13800138007' },
  { name: '周女士', room: '805', phone: '13800138008' },
  { name: '吴先生', room: '902', phone: '13800138009' },
  { name: '郑女士', room: '1001', phone: '13800138010' },
  { name: '孙先生', room: '1103', phone: '13800138011' },
  { name: '马女士', room: '1205', phone: '13800138012' },
  { name: '朱先生', room: '1308', phone: '13800138013' },
  { name: '胡女士', room: '1402', phone: '13800138014' },
  { name: '林先生', room: '1501', phone: '13800138015' },
];

const PROBLEM_TYPES = [
  '电梯噪音太大', '电梯坏了', '电梯困梯', '梯控刷卡没反应',
  '卫生间漏水', '水管爆了', '下水道堵塞', '厨房渗水',
  '走廊灯坏了', '家里停电', '总闸跳闸', '楼道照明不亮',
  '楼上装修噪音', '邻居狗叫扰民', '深夜唱歌太吵',
  '楼道垃圾没人清', '垃圾桶异味', '保洁没打扫',
  '门禁卡刷不开', '单元门锁坏了', '保安不在岗',
  '车位被占了', '道闸抬不起来', '车库收费有问题',
  '草坪杂草多', '树木生虫了', '绿化带没人修剪',
];

const SOURCES = ['电话', '业主群', '工单系统', '电话', '业主群', '工单系统', '上门'];
const STATUSES = ['已关闭', '已关闭', '已关闭', '处理中', '已超期'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function randomDate(baseMonth: number, daySpan: number, hourSpan: number): string {
  const day = Math.floor(Math.random() * daySpan) + 1;
  const hour = Math.floor(Math.random() * hourSpan);
  const minute = Math.floor(Math.random() * 60);
  return `2026-${pad(baseMonth)}-${pad(day)} ${pad(hour)}:${pad(minute)}:00`;
}

function addHours(timeStr: string, hours: number): string {
  const d = new Date(timeStr.replace(' ', 'T'));
  d.setHours(d.getHours() + hours);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export function generateMockData(count = 120): MockComplaintRow[] {
  const rows: MockComplaintRow[] = [];
  
  for (let i = 0; i < count; i++) {
    const owner = OWNERS[i % OWNERS.length];
    const community = COMMUNITIES[i % COMMUNITIES.length];
    const building = BUILDINGS[i % BUILDINGS.length];
    const staff = STAFFS[i % STAFFS.length];
    const problem = PROBLEM_TYPES[i % PROBLEM_TYPES.length];
    const source = SOURCES[i % SOURCES.length];
    const status = STATUSES[i % STATUSES.length];
    
    const receiveTime = randomDate(5, 30, 24);
    const responseDelay = Math.floor(Math.random() * 8) + 0.2;
    const responseTime = addHours(receiveTime, responseDelay);
    
    let closeTime = '';
    let closeDelay = 0;
    if (status === '已关闭' || status === '已超期') {
      closeDelay = status === '已超期' 
        ? Math.floor(Math.random() * 100) + 80 
        : Math.floor(Math.random() * 60) + 2;
      closeTime = addHours(receiveTime, closeDelay);
    }

    const row: MockComplaintRow = {
      orderNo: `WO2026${String(5000 + i).padStart(6, '0')}`,
      ownerName: owner.name,
      phone: owner.phone,
      roomNumber: `${building.replace('号楼', '')}-${owner.room}`,
      community,
      building,
      staffName: staff,
      problemType: problem,
      source,
      receiveTime,
      responseTime,
      closeTime,
      status,
      description: `业主反馈${problem}，请尽快处理。`,
      overdueReason: closeDelay > 72 ? '配件待采购、需协调第三方施工单位' : '',
    };

    if (i === 5) {
      row.receiveTime = '';
      row.responseTime = '';
      row.closeTime = '';
    }
    if (i === 10) {
      const temp = row.closeTime;
      row.closeTime = row.receiveTime;
      row.receiveTime = temp;
    }
    if (i === 3) {
      row.ownerName = '王先生';
      row.phone = '13900139003';
      row.roomNumber = '3-305';
    }
    if (i === 15) {
      row.problemType = '电梯异响很大吵得睡不着';
    }

    rows.push(row);
  }

  return rows;
}
