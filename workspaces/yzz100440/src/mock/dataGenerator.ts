import type { 
  Elderly, 
  Medication, 
  Prescription, 
  PillboxRecord, 
  NurseRecord,
  TimeSlot 
} from '../../shared/types';
import { formatDate, getRecentDays } from '../utils/format';
import { TIME_SLOT_CONFIG, getTimeSlot } from '../utils/analysis';

const ELDERLY_NAMES = [
  '张桂芳', '李建国', '王秀兰', '刘振华', '陈淑珍',
  '杨明远', '赵美华', '黄志强', '周玉兰', '吴德昌',
  '徐丽华', '孙维民', '马素英', '朱宏达', '胡静仪'
];

const MEDICATIONS: Omit<Medication, 'id'>[] = [
  { name: '硝苯地平缓释片', genericName: 'Nifedipine', dosage: '30mg', frequency: 'qd', times: ['08:00'] },
  { name: '阿司匹林肠溶片', genericName: 'Aspirin', dosage: '100mg', frequency: 'qd', times: ['08:00'] },
  { name: '二甲双胍片', genericName: 'Metformin', dosage: '500mg', frequency: 'bid', times: ['08:00', '18:00'] },
  { name: '阿托伐他汀钙片', genericName: 'Atorvastatin', dosage: '20mg', frequency: 'qn', times: ['22:00'] },
  { name: '奥美拉唑肠溶胶囊', genericName: 'Omeprazole', dosage: '20mg', frequency: 'qd', times: ['08:00'] },
  { name: '氨氯地平片', genericName: 'Amlodipine', dosage: '5mg', frequency: 'qd', times: ['08:00'] },
  { name: '缬沙坦胶囊', genericName: 'Valsartan', dosage: '80mg', frequency: 'qd', times: ['08:00'] },
  { name: '美托洛尔缓释片', genericName: 'Metoprolol', dosage: '47.5mg', frequency: 'qd', times: ['08:00'] },
  { name: '格列美脲片', genericName: 'Glimepiride', dosage: '2mg', frequency: 'qd', times: ['08:00'] },
  { name: '辛伐他汀片', genericName: 'Simvastatin', dosage: '20mg', frequency: 'qn', times: ['22:00'] },
];

const NURSE_NAMES = ['王护理', '李护理', '张护理', '刘护理', '陈护理'];
const DOCTOR_NAMES = ['张医生', '李医生', '王医生'];

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}`;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTime(slot: TimeSlot, delayMinutes: number = 0): string {
  const config = TIME_SLOT_CONFIG[slot];
  const startMinutes = config.start * 60;
  const endMinutes = config.crossNight ? 26 * 60 : config.end * 60;
  
  let randomMinutes = randomInt(startMinutes, endMinutes - 1) + delayMinutes;
  if (randomMinutes >= 24 * 60) randomMinutes -= 24 * 60;
  
  const hours = Math.floor(randomMinutes / 60);
  const minutes = randomMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function generateElderly(count: number = 15): Elderly[] {
  return ELDERLY_NAMES.slice(0, count).map((name, index) => ({
    id: randomId('elderly'),
    name,
    roomNumber: `${Math.floor(index / 5) + 1}${(index % 5) + 1}`,
    floor: Math.floor(index / 5) + 1,
    age: randomInt(70, 92),
    gender: randomChoice(['male', 'female']),
    familyMembers: [randomId('family')],
  }));
}

export function generateMedications(): Medication[] {
  return MEDICATIONS.map(med => ({
    ...med,
    id: randomId('med'),
  }));
}

export function generatePrescriptions(
  elderlyList: Elderly[],
  medications: Medication[],
  days: number = 30
): Prescription[] {
  const prescriptions: Prescription[] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);

  elderlyList.forEach(elderly => {
    const medCount = randomInt(2, 5);
    const selectedMeds = [...medications].sort(() => Math.random() - 0.5).slice(0, medCount);

    selectedMeds.forEach(med => {
      const prescription: Prescription = {
        id: randomId('rx'),
        elderlyId: elderly.id,
        medicationId: med.id,
        startDate: formatDate(startDate),
        status: 'active',
        doctorName: randomChoice(DOCTOR_NAMES),
      };

      if (Math.random() < 0.2) {
        const changeDay = randomInt(Math.floor(days * 0.3), Math.floor(days * 0.7));
        const changeDate = new Date(startDate);
        changeDate.setDate(startDate.getDate() + changeDay);
        prescription.endDate = formatDate(changeDate);
        prescription.status = 'discontinued';
        prescription.changeTime = formatDate(changeDate);
        prescription.changeReason = randomChoice([
          '血压控制良好，暂停用药',
          '出现不良反应，调整用药',
          '治疗方案调整',
          '患者主诉不适',
        ]);
      }

      prescriptions.push(prescription);
    });
  });

  return prescriptions;
}

export function generatePillboxRecords(
  elderlyList: Elderly[],
  prescriptions: Prescription[],
  days: number = 30
): PillboxRecord[] {
  const records: PillboxRecord[] = [];
  const recentDays = getRecentDays(days);

  prescriptions.forEach(prescription => {
    if (prescription.status === 'discontinued' && prescription.endDate) {
      const endIdx = recentDays.indexOf(prescription.endDate);
      if (endIdx === -1) return;
    }

    const med = { id: prescription.medicationId, times: ['08:00', '12:00', '18:00', '22:00'] };
    const relevantTimes = med.times.filter(time => {
      const slot = getTimeSlot(time);
      return slot !== null;
    });

    recentDays.forEach(date => {
      if (prescription.endDate && date > prescription.endDate) return;
      if (date < prescription.startDate) return;

      relevantTimes.forEach(plannedTime => {
        const slot = getTimeSlot(plannedTime);
        if (!slot) return;

        const random = Math.random();
        const isOffline = Math.random() < 0.05;

        if (isOffline) {
          return;
        }

        if (random < 0.82) {
          const delayMinutes = random < 0.9 ? 0 : randomInt(31, 90);
          const actualTime = randomTime(slot, delayMinutes);
          
          records.push({
            id: randomId('pill'),
            elderlyId: prescription.elderlyId,
            medicationId: prescription.medicationId,
            timestamp: `${date} ${actualTime}:${randomInt(0, 59).toString().padStart(2, '0')}`,
            deviceId: `DEV_${prescription.elderlyId.slice(-4)}`,
            deviceStatus: Math.random() < 0.95 ? 'online' : 'low_battery',
            isSuccess: true,
          });

          if (Math.random() < 0.03) {
            records.push({
              id: randomId('pill'),
              elderlyId: prescription.elderlyId,
              medicationId: prescription.medicationId,
              timestamp: `${date} ${actualTime}:${randomInt(0, 59).toString().padStart(2, '0')}`,
              deviceId: `DEV_${prescription.elderlyId.slice(-4)}`,
              deviceStatus: 'online',
              isSuccess: true,
            });
          }
        }
      });
    });
  });

  return records;
}

export function generateNurseRecords(
  elderlyList: Elderly[],
  prescriptions: Prescription[],
  pillboxRecords: PillboxRecord[],
  days: number = 30
): NurseRecord[] {
  const records: NurseRecord[] = [];
  const recentDays = getRecentDays(days);

  prescriptions.forEach(prescription => {
    recentDays.forEach(date => {
      if (prescription.endDate && date > prescription.endDate) return;
      if (date < prescription.startDate) return;

      const slotRecords = pillboxRecords.filter(r => 
        r.elderlyId === prescription.elderlyId &&
        r.medicationId === prescription.medicationId &&
        r.timestamp.startsWith(date)
      );

      if (slotRecords.length === 0 && Math.random() < 0.15) {
        const slot = randomChoice(['breakfast', 'lunch', 'dinner', 'bedtime'] as TimeSlot[]);
        const actualTime = randomTime(slot, 60);
        
        records.push({
          id: randomId('nurse'),
          elderlyId: prescription.elderlyId,
          medicationId: prescription.medicationId,
          timestamp: `${date} ${actualTime}:00`,
          nurseName: randomChoice(NURSE_NAMES),
          type: Math.random() < 0.7 ? 'supplement' : 'missed',
          note: Math.random() < 0.7 ? '老人忘记服药，已协助补服' : '老人拒绝服药，已记录并通知医生',
          publicNote: '已妥善处理',
        });
      }

      if (slotRecords.length > 0 && Math.random() < 0.05) {
        const slot = randomChoice(['breakfast', 'lunch', 'dinner', 'bedtime'] as TimeSlot[]);
        const actualTime = randomTime(slot);
        
        records.push({
          id: randomId('nurse'),
          elderlyId: prescription.elderlyId,
          medicationId: prescription.medicationId,
          timestamp: `${date} ${actualTime}:00`,
          nurseName: randomChoice(NURSE_NAMES),
          type: 'missed',
          note: '药盒显示已服，但实际观察老人未服用，需要核实',
          publicNote: '记录待核实',
        });
      }
    });
  });

  return records;
}

export function generateAllMockData(days: number = 30) {
  const elderlyList = generateElderly(15);
  const medications = generateMedications();
  const prescriptions = generatePrescriptions(elderlyList, medications, days);
  const pillboxRecords = generatePillboxRecords(elderlyList, prescriptions, days);
  const nurseRecords = generateNurseRecords(elderlyList, prescriptions, pillboxRecords, days);

  return {
    elderlyList,
    medications,
    prescriptions,
    pillboxRecords,
    nurseRecords,
  };
}
