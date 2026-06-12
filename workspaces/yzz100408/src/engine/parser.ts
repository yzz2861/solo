import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ChargingOrder, QueueRecord, ElectricityPrice, GunFault, DataCategory, PriceType } from '@/types';
import { formatDate } from '@/utils/date';

const parseDateTime = (val: string): Date => {
  if (!val) return new Date();
  const cleaned = val.replace(/\//g, '-').replace('年', '-').replace('月', '-').replace('日', '');
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? new Date() : d;
};

const parseNumber = (val: string, fallback: number = 0): number => {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
};

const parseBoolean = (val: string): boolean => {
  return ['是', 'true', '1', 'yes', 'Y'].includes(val?.toLowerCase?.() || val);
};

const normalizePriceType = (val: string): PriceType => {
  const map: Record<string, PriceType> = {
    '峰': 'peak', '峰段': 'peak', 'peak': 'peak',
    '平': 'flat', '平段': 'flat', 'flat': 'flat',
    '谷': 'valley', '谷段': 'valley', 'valley': 'valley',
    '促销': 'promotion', '优惠': 'promotion', 'promotion': 'promotion',
  };
  return map[val] || 'flat';
};

export const parseCSV = <T>(raw: string): Record<string, string>[] => {
  const result = Papa.parse(raw, { header: true, skipEmptyLines: true });
  return result.data as Record<string, string>[];
};

export const parseXLSX = (raw: ArrayBuffer): Record<string, unknown>[] => {
  const workbook = XLSX.read(raw, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
};

export const parseOrders = (rows: Record<string, string | number | Date>[]): ChargingOrder[] => {
  return rows.map((row, idx) => {
    const qStart = parseDateTime(String(row['排队开始时间'] || row['queueStartTime'] || row['queue_start'] || ''));
    const cStart = parseDateTime(String(row['充电开始时间'] || row['chargeStartTime'] || row['charge_start'] || ''));
    const cEnd = parseDateTime(String(row['充电结束时间'] || row['chargeEndTime'] || row['charge_end'] || ''));
    const waitMin = parseNumber(String(row['等待时长(分钟)'] || row['waitMinutes'] || row['wait_minutes'] || ''),
      Math.max(0, Math.floor((cStart.getTime() - qStart.getTime()) / 60000)));
    const chargeMin = parseNumber(String(row['充电时长(分钟)'] || row['chargeMinutes'] || row['charge_minutes'] || ''),
      Math.max(0, Math.floor((cEnd.getTime() - cStart.getTime()) / 60000)));

    return {
      orderId: String(row['订单号'] || row['orderId'] || row['order_id'] || `ORD_${idx + 1}`),
      gunId: String(row['枪位号'] || row['gunId'] || row['gun_id'] || 'G01'),
      vehiclePlate: String(row['车牌号'] || row['vehiclePlate'] || row['plate'] || ''),
      vehicleModel: String(row['车型'] || row['vehicleModel'] || row['model'] || ''),
      queueStartTime: qStart,
      chargeStartTime: cStart,
      chargeEndTime: cEnd,
      waitMinutes: waitMin,
      chargeMinutes: chargeMin,
      chargeKwh: parseNumber(String(row['充电量(kWh)'] || row['chargeKwh'] || row['kwh'] || ''), 30),
      leftEarly: parseBoolean(String(row['是否提前离开'] || row['leftEarly'] || '')),
      crossDay: formatDate(qStart) !== formatDate(cEnd),
    };
  });
};

export const parseQueueRecords = (rows: Record<string, string | number | Date>[]): QueueRecord[] => {
  return rows.map((row, idx) => ({
    recordId: String(row['记录号'] || row['recordId'] || `QR_${idx + 1}`),
    timestamp: parseDateTime(String(row['时间戳'] || row['timestamp'] || row['time'] || '')),
    queueLength: parseNumber(String(row['排队车辆数'] || row['queueLength'] || row['queue_length'] || '')),
    gunId: row['枪位号'] || row['gunId'] ? String(row['枪位号'] || row['gunId']) : undefined,
  }));
};

export const parsePrices = (rows: Record<string, string | number | Date>[]): ElectricityPrice[] => {
  return rows.map((row, idx) => ({
    periodId: String(row['时段ID'] || row['periodId'] || `EP_${idx + 1}`),
    effectiveDate: String(row['生效日期'] || row['effectiveDate'] || row['date'] || formatDate(new Date())),
    startHour: parseNumber(String(row['开始小时'] || row['startHour'] || row['start_hour'] || ''), 0),
    endHour: parseNumber(String(row['结束小时'] || row['endHour'] || row['end_hour'] || ''), 24),
    priceType: normalizePriceType(String(row['电价类型'] || row['priceType'] || row['type'] || '')),
    pricePerKwh: parseNumber(String(row['电价(元/kWh)'] || row['pricePerKwh'] || row['price'] || ''), 0.8),
  }));
};

export const parseFaults = (rows: Record<string, string | number | Date>[]): GunFault[] => {
  return rows.map((row, idx) => {
    const fStart = parseDateTime(String(row['故障开始时间'] || row['faultStartTime'] || row['start_time'] || ''));
    const fEnd = parseDateTime(String(row['故障恢复时间'] || row['faultEndTime'] || row['end_time'] || ''));
    return {
      faultId: String(row['故障ID'] || row['faultId'] || `F_${idx + 1}`),
      gunId: String(row['枪位号'] || row['gunId'] || row['gun_id'] || 'G01'),
      faultStartTime: fStart,
      faultEndTime: fEnd,
      faultType: String(row['故障类型'] || row['faultType'] || row['type'] || '未知故障'),
      faultDurationMinutes: parseNumber(String(row['故障时长(分钟)'] || row['faultDurationMinutes'] || row['duration'] || ''),
        Math.max(0, Math.floor((fEnd.getTime() - fStart.getTime()) / 60000))),
      mergedFromMultiple: false,
    };
  });
};

export const detectCategory = (filename: string, headers: string[]): DataCategory => {
  const lower = filename.toLowerCase();
  const headerStr = headers.join(',').toLowerCase();

  if (lower.includes('order') || lower.includes('订单') || headerStr.includes('充电量') || headerStr.includes('charge')) return 'orders';
  if (lower.includes('queue') || lower.includes('排队') || headerStr.includes('排队车辆') || headerStr.includes('queue_length')) return 'queue';
  if (lower.includes('price') || lower.includes('电价') || headerStr.includes('电价') || headerStr.includes('price')) return 'prices';
  if (lower.includes('fault') || lower.includes('故障') || headerStr.includes('故障') || headerStr.includes('fault')) return 'faults';
  return 'orders';
};
