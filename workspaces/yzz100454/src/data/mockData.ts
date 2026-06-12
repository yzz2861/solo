import dayjs from 'dayjs';
import type {
  PublicToilet,
  InspectionRecord,
  CleaningRecord,
  PassengerFlow,
  Complaint,
  Alias,
  WeatherRecord,
  Activity,
} from '../types';

const BASE_LAT = 39.9042;
const BASE_LNG = 116.4074;

const toiletNames = [
  '天安门东公厕', '天安门西公厕', '王府井公厕', '西单公厕',
  '东单公厕', '建国门公厕', '朝阳门公厕', '东直门公厕',
  '西直门公厕', '复兴门公厕', '前门公厕', '崇文门公厕',
  '宣武门公厕', '和平里公厕', '三里屯公厕', '国贸公厕',
  '中关村公厕', '五道口公厕', '学院路公厕', '知春路公厕',
  '万寿路公厕', '公主坟公厕', '六里桥公厕', '丽泽桥公厕',
  '草桥公厕', '木樨园公厕', '永定门公厕', '左安门公厕',
  '右安门公厕', '广安门公厕', '西便门公厕', '东便门公厕',
  '奥体中心公厕', '亚运村公厕', '望京公厕', '酒仙桥公厕',
  '团结湖公厕', '呼家楼公厕', '金台路公厕', '大望路公厕',
  '双井公厕', '劲松公厕', '潘家园公厕', '方庄公厕',
  '蒲黄榆公厕', '刘家窑公厕', '宋家庄公厕', '石榴庄公厕',
];

const inspectors = ['张建国', '李卫东', '王志强', '赵明辉', '刘建军'];
const cleaners = ['陈秀英', '王桂兰', '李秀英', '张淑芬', '刘桂英', '赵美华', '孙秀珍', '周凤兰'];
const complaintTypes: Complaint['type'][] = ['异味', '脏乱', '设施损坏', '其他'];
const weatherTypes: WeatherRecord['weatherType'][] = ['晴', '多云', '阴', '小雨', '中雨'];

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateToilets(): PublicToilet[] {
  return toiletNames.map((name, index) => {
    const angle = (index / toiletNames.length) * Math.PI * 2;
    const radius = 0.02 + (index % 5) * 0.01;
    const lat = BASE_LAT + Math.sin(angle) * radius + (Math.random() - 0.5) * 0.01;
    const lng = BASE_LNG + Math.cos(angle) * radius + (Math.random() - 0.5) * 0.01;
    
    const levels: PublicToilet['level'][] = ['一类', '二类', '三类'];
    
    return {
      id: `toilet_${String(index + 1).padStart(3, '0')}`,
      name,
      address: `${name}地址${index + 1}号`,
      latitude: lat,
      longitude: lng,
      level: levels[index % 3],
      isOnline: Math.random() > 0.1,
      lastReportTime: dayjs().subtract(randomInt(0, 48), 'hour').format('YYYY-MM-DD HH:mm:ss'),
      createdAt: dayjs().subtract(randomInt(100, 500), 'day').format('YYYY-MM-DD'),
    };
  });
}

export function generateInspections(toilets: PublicToilet[], days: number = 7): InspectionRecord[] {
  const records: InspectionRecord[] = [];
  const startDate = dayjs().subtract(days, 'day');
  
  for (let d = 0; d < days; d++) {
    const date = startDate.add(d, 'day');
    const isWeekend = date.day() === 0 || date.day() === 6;
    const inspectionsPerDay = isWeekend ? 2 : 3;
    
    toilets.forEach((toilet, tIndex) => {
      const count = randomInt(Math.max(0, inspectionsPerDay - 1), inspectionsPerDay + 1);
      for (let i = 0; i < count; i++) {
        const hour = randomInt(6, 20);
        const minute = randomInt(0, 59);
        const status = Math.random() > 0.15 ? '正常' : Math.random() > 0.5 ? '异常' : '待整改';
        
        records.push({
          id: `inspect_${generateId()}`,
          toiletId: toilet.id,
          inspectTime: date.hour(hour).minute(minute).format('YYYY-MM-DD HH:mm:ss'),
          inspector: inspectors[tIndex % inspectors.length],
          status,
          remark: status === '正常' ? undefined : '需加强保洁频次',
        });
      }
    });
  }
  
  return records.sort((a, b) => b.inspectTime.localeCompare(a.inspectTime));
}

export function generateCleaningRecords(toilets: PublicToilet[], days: number = 7): CleaningRecord[] {
  const records: CleaningRecord[] = [];
  const startDate = dayjs().subtract(days, 'day');
  
  for (let d = 0; d < days; d++) {
    const date = startDate.add(d, 'day');
    const isWeekend = date.day() === 0 || date.day() === 6;
    const cleaningsPerDay = isWeekend ? 6 : 8;
    
    toilets.forEach((toilet, tIndex) => {
      const isHighFlow = tIndex < 10;
      const baseCount = isHighFlow ? cleaningsPerDay : Math.floor(cleaningsPerDay * 0.7);
      const count = randomInt(Math.max(2, baseCount - 2), baseCount + 2);
      
      const hasMissing = Math.random() > 0.85;
      const actualCount = hasMissing && d > 3 ? Math.max(1, count - 3) : count;
      
      for (let i = 0; i < actualCount; i++) {
        const hour = 6 + Math.floor((i / actualCount) * 14) + randomInt(0, 1);
        const minute = randomInt(0, 59);
        const types: CleaningRecord['checkType'][] = ['普扫', '循环保洁', '深度保洁'];
        
        records.push({
          id: `clean_${generateId()}`,
          toiletId: toilet.id,
          checkinTime: date.hour(Math.min(22, hour)).minute(minute).format('YYYY-MM-DD HH:mm:ss'),
          cleaner: cleaners[tIndex % cleaners.length],
          checkType: i === 0 ? '普扫' : randomPick(types),
        });
      }
    });
  }
  
  return records.sort((a, b) => b.checkinTime.localeCompare(a.checkinTime));
}

export function generatePassengerFlow(toilets: PublicToilet[], days: number = 7): PassengerFlow[] {
  const records: PassengerFlow[] = [];
  const startDate = dayjs().subtract(days, 'day');
  
  for (let d = 0; d < days; d++) {
    const date = startDate.add(d, 'day');
    const isWeekend = date.day() === 0 || date.day() === 6;
    
    toilets.forEach((toilet, tIndex) => {
      const baseFlow = 50 + (49 - (tIndex % 50)) * 10;
      const weekendMultiplier = isWeekend ? 1.3 : 1;
      
      for (let hour = 6; hour <= 22; hour++) {
        let timeMultiplier = 0.3;
        if (hour >= 8 && hour <= 10) timeMultiplier = 1.0;
        else if (hour >= 11 && hour <= 13) timeMultiplier = 1.2;
        else if (hour >= 14 && hour <= 16) timeMultiplier = 0.9;
        else if (hour >= 17 && hour <= 19) timeMultiplier = 1.1;
        else if (hour >= 20 && hour <= 22) timeMultiplier = 0.5;
        
        const count = Math.floor(baseFlow * weekendMultiplier * timeMultiplier * (0.8 + Math.random() * 0.4));
        
        if (count > 0) {
          records.push({
            id: `flow_${generateId()}`,
            toiletId: toilet.id,
            flowDate: date.format('YYYY-MM-DD'),
            hour,
            count,
            source: Math.random() > 0.1 ? '客流计' : '估算',
          });
        }
      }
    });
  }
  
  return records;
}

export function generateComplaints(toilets: PublicToilet[], days: number = 7): Complaint[] {
  const records: Complaint[] = [];
  const startDate = dayjs().subtract(days, 'day');
  
  const highComplaintIndices = [2, 7, 12, 18, 23, 29, 34, 39];
  
  for (let d = 0; d < days; d++) {
    const date = startDate.add(d, 'day');
    
    toilets.forEach((toilet, tIndex) => {
      const isHighComplaint = highComplaintIndices.includes(tIndex);
      const baseComplaints = isHighComplaint ? randomInt(1, 3) : Math.random() > 0.7 ? 1 : 0;
      
      for (let i = 0; i < baseComplaints; i++) {
        const hour = randomInt(7, 21);
        const minute = randomInt(0, 59);
        const isDuplicate = Math.random() > 0.85;
        const status = Math.random() > 0.3 ? '已解决' : Math.random() > 0.5 ? '处理中' : '待处理';
        
        records.push({
          id: `complaint_${generateId()}`,
          toiletId: toilet.id,
          complaintTime: date.hour(hour).minute(minute).format('YYYY-MM-DD HH:mm:ss'),
          type: randomPick(complaintTypes),
          description: `群众反映${randomPick(complaintTypes)}问题，需要及时处理`,
          status,
          isDuplicate,
        });
      }
    });
  }
  
  return records.sort((a, b) => b.complaintTime.localeCompare(a.complaintTime));
}

export function generateAliases(toilets: PublicToilet[]): Alias[] {
  const aliases: Alias[] = [];
  
  toilets.forEach((toilet) => {
    const shortName = toilet.name.replace('公厕', '');
    aliases.push({
      id: `alias_${generateId()}`,
      toiletId: toilet.id,
      aliasName: shortName,
      source: '历史数据',
    });
    
    if (Math.random() > 0.7) {
      aliases.push({
        id: `alias_${generateId()}`,
        toiletId: toilet.id,
        aliasName: `${toilet.name}（${toilet.level}）`,
        source: '巡检系统',
      });
    }
  });
  
  return aliases;
}

export function generateWeather(days: number = 30): WeatherRecord[] {
  const records: WeatherRecord[] = [];
  const startDate = dayjs().subtract(days, 'day');
  
  for (let d = 0; d < days; d++) {
    const date = startDate.add(d, 'day');
    const weatherType = randomPick(weatherTypes);
    const baseTemp = 15 + Math.sin(d / 5) * 10;
    
    records.push({
      date: date.format('YYYY-MM-DD'),
      weatherType,
      temperature: Math.round((baseTemp + (Math.random() - 0.5) * 6) * 10) / 10,
      windLevel: `${randomInt(1, 4)}级`,
    });
  }
  
  return records;
}

export function generateActivities(days: number = 30): Activity[] {
  const activities: Activity[] = [];
  const startDate = dayjs().subtract(days, 'day');
  
  const activityNames = [
    '五一劳动节活动', '国庆庆典', '春节庙会', '元宵灯会',
    '马拉松比赛', '文化节活动', '商品交易会', '美食节',
    '音乐节', '体育赛事', '展览会', '招商大会',
  ];
  
  for (let i = 0; i < 8; i++) {
    const dayOffset = randomInt(0, days - 1);
    const date = startDate.add(dayOffset, 'day');
    const scale: Activity['scale'] = i < 3 ? '大型' : i < 6 ? '中型' : '小型';
    
    activities.push({
      id: `activity_${generateId()}`,
      activityDate: date.format('YYYY-MM-DD'),
      name: activityNames[i % activityNames.length],
      location: randomPick(toiletNames.slice(0, 10)),
      scale,
    });
  }
  
  return activities.sort((a, b) => b.activityDate.localeCompare(a.activityDate));
}

export interface MockData {
  toilets: PublicToilet[];
  inspections: InspectionRecord[];
  cleaningRecords: CleaningRecord[];
  passengerFlows: PassengerFlow[];
  complaints: Complaint[];
  aliases: Alias[];
  weather: WeatherRecord[];
  activities: Activity[];
}

export function generateAllMockData(days: number = 7): MockData {
  const toilets = generateToilets();
  return {
    toilets,
    inspections: generateInspections(toilets, days),
    cleaningRecords: generateCleaningRecords(toilets, days),
    passengerFlows: generatePassengerFlow(toilets, days),
    complaints: generateComplaints(toilets, days),
    aliases: generateAliases(toilets),
    weather: generateWeather(days),
    activities: generateActivities(days),
  };
}
