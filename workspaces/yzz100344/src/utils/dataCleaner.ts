import { differenceInHours, parseISO, isValid } from 'date-fns';
import type { Complaint, Owner, CleaningReport, DataQualityFlag } from '@/types';
import { standardizeProblemType, standardizeSource, OVERDUE_THRESHOLD_HOURS } from './standardize';

export interface RawComplaintRow {
  [key: string]: string | number | undefined;
  orderNo?: string;
  ownerName?: string;
  phone?: string;
  roomNumber?: string;
  community?: string;
  building?: string;
  staffName?: string;
  problemType?: string;
  source?: string;
  receiveTime?: string;
  responseTime?: string;
  closeTime?: string;
  status?: string;
  description?: string;
  overdueReason?: string;
}

function safeParseDate(value: string | number | undefined): Date | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  
  let normalized = str;
  if (/^\d{4}\//.test(str)) {
    normalized = str.replace(/\//g, '-');
  }
  
  try {
    const parsed = parseISO(normalized.replace(' ', 'T'));
    if (isValid(parsed)) return parsed;
  } catch {
    // ignore
  }
  
  const fallback = new Date(str);
  return isValid(fallback) ? fallback : null;
}

function generateId(prefix: string, ...parts: string[]): string {
  return `${prefix}_${parts.map(p => p.replace(/\s+/g, '_')).join('_')}`;
}

export function cleanData(rows: RawComplaintRow[]): {
  complaints: Complaint[];
  owners: Owner[];
  report: CleaningReport;
} {
  const report: CleaningReport = {
    totalRows: rows.length,
    validRows: 0,
    timeMissing: 0,
    timeInverted: 0,
    ownersMerged: 0,
    typesStandardized: 0,
    typesUnconfirmed: 0,
    details: {
      timeMissingIds: [],
      timeInvertedIds: [],
      mergedOwnerIds: [],
      unconfirmedTypes: [],
    },
  };

  const ownerMap = new Map<string, Owner>();
  const complaints: Complaint[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const flags: DataQualityFlag[] = [];
    const id = `cmp_${Date.now()}_${i}`;
    const orderNo = row.orderNo || `WO${String(i + 1).padStart(6, '0')}`;

    let receiveTime = safeParseDate(row.receiveTime);
    let responseTime = safeParseDate(row.responseTime);
    let closeTime = safeParseDate(row.closeTime);

    if (!receiveTime) {
      flags.push('time_missing');
      report.timeMissing++;
      report.details.timeMissingIds.push(id);
    }

    if (closeTime && receiveTime && closeTime < receiveTime) {
      const temp = closeTime;
      closeTime = receiveTime;
      receiveTime = temp;
      flags.push('time_inverted');
      report.timeInverted++;
      report.details.timeInvertedIds.push(id);
    }

    if (responseTime && receiveTime && responseTime < receiveTime) {
      responseTime = receiveTime;
      flags.push('time_inverted');
    }

    const { type: problemType, flags: typeFlags } = standardizeProblemType(row.problemType || '');
    if (typeFlags.includes('type_standardized')) {
      flags.push('type_standardized');
      report.typesStandardized++;
    }
    if (typeFlags.includes('type_unconfirmed')) {
      flags.push('type_unconfirmed');
      report.typesUnconfirmed++;
      report.details.unconfirmedTypes.push({ id, raw: row.problemType || '' });
    }

    const ownerName = row.ownerName?.trim() || '未知业主';
    const roomNumber = row.roomNumber?.trim() || '';
    const phone = row.phone?.trim() || '';

    let ownerKey = roomNumber && ownerName !== '未知业主' 
      ? generateId('own', roomNumber, ownerName)
      : phone 
        ? generateId('own', phone)
        : generateId('own', ownerName, String(i));

    let owner = ownerMap.get(ownerKey);
    if (!owner) {
      owner = {
        id: ownerKey,
        name: ownerName,
        roomNumber,
        phoneNumbers: phone ? [phone] : [],
        complaintCount: 0,
      };
      ownerMap.set(ownerKey, owner);
    } else {
      if (phone && !owner.phoneNumbers.includes(phone)) {
        owner.phoneNumbers.push(phone);
        flags.push('owner_merged');
        if (!report.details.mergedOwnerIds.includes(ownerKey)) {
          report.details.mergedOwnerIds.push(ownerKey);
          report.ownersMerged++;
        }
      }
    }
    owner.complaintCount++;

    const community = row.community?.trim() || '未指定小区';
    const building = row.building?.trim() || '未指定楼栋';
    const buildingId = generateId('bld', community, building);

    const staffName = row.staffName?.trim() || '未分配';
    const staffId = generateId('stf', staffName);

    const source = standardizeSource(row.source || '');
    
    let status: Complaint['status'] = '处理中';
    if (row.status) {
      if (row.status.includes('关闭') || row.status.includes('完成')) status = '已关闭';
      else if (row.status.includes('超期') || row.status.includes('逾期')) status = '已超期';
    } else if (closeTime) {
      status = '已关闭';
    }

    let responseHours: number | null = null;
    if (responseTime && receiveTime) {
      responseHours = Math.max(0, differenceInHours(responseTime, receiveTime));
    }

    let closeHours: number | null = null;
    if (closeTime && receiveTime) {
      closeHours = Math.max(0, differenceInHours(closeTime, receiveTime));
    }

    const isOverdue = closeHours !== null ? closeHours > OVERDUE_THRESHOLD_HOURS : false;
    if (isOverdue && status === '已关闭') {
      status = '已超期';
    }

    const complaint: Complaint = {
      id,
      orderNo,
      ownerId: owner.id,
      ownerName,
      roomNumber,
      phone,
      buildingId,
      community,
      building,
      staffId,
      staffName,
      problemType,
      rawProblemType: row.problemType || '',
      source,
      receiveTime,
      responseTime,
      closeTime,
      status,
      responseHours,
      closeHours,
      isOverdue,
      overdueReason: row.overdueReason || (isOverdue ? '待核实' : ''),
      description: row.description || '',
      dataQualityFlags: flags,
    };

    complaints.push(complaint);
    report.validRows++;
  }

  return {
    complaints,
    owners: Array.from(ownerMap.values()),
    report,
  };
}
