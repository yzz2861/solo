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

const FIELD_MAPPING: Record<string, string[]> = {
  orderNo: ['工单号', '工单编号', '工单ID', '编号', 'order_no', 'orderNo', 'ORDER_NO', 'OrderNo', 'WO', 'ticket_no', 'ticketId'],
  ownerName: ['业主姓名', '姓名', '业主名', '业主', 'owner_name', 'ownerName', 'OWNER_NAME', 'Name', 'username', '联系人'],
  phone: ['联系电话', '电话', '手机号', '手机', 'phone', 'phone_no', 'mobile', 'tel', 'phoneNumber', '联系手机'],
  roomNumber: ['房号', '房间号', '室号', '单元房号', 'room', 'room_no', 'roomNumber', 'ROOM', '地址'],
  community: ['小区', '小区名称', '社区', '园区', 'community', 'community_name', 'Community', '楼盘', '项目'],
  building: ['楼栋', '楼号', '楼宇', 'building', 'building_no', 'Building', '幢号', '座号'],
  staffName: ['处理管家', '管家', '负责人', '处理人', 'staff', 'staff_name', 'staffName', 'handler', '处理员'],
  problemType: ['问题类型', '问题', '类型', '投诉类型', 'problem', 'problem_type', 'Problem', 'issue', 'complaint_type'],
  source: ['来源', '渠道', '投诉渠道', 'source', 'channel', 'Source', '来源渠道'],
  receiveTime: ['受理时间', '接单时间', '创建时间', '投诉时间', 'receive_time', 'receiveTime', 'created_at', 'CreateTime', '受理日期', '接单日期'],
  responseTime: ['响应时间', '首次响应', '回复时间', 'response_time', 'responseTime', 'responded_at', 'ResponseTime'],
  closeTime: ['关闭时间', '完成时间', '结案时间', 'close_time', 'closeTime', 'closed_at', 'CloseTime', '处理完成时间'],
  status: ['状态', '工单状态', '处理状态', 'status', 'Status', 'state', 'STATE'],
  description: ['描述', '问题描述', '详情', '备注', 'description', 'desc', 'Description', '备注信息'],
  overdueReason: ['超期原因', '逾期原因', '延迟原因', 'overdue_reason', 'overdueReason', 'delay_reason', '原因'],
};

function normalizeHeader(header: string): string {
  let result = header.trim();
  result = result.replace(/^\uFEFF/, '');
  result = result.replace(/\r/g, '');
  result = result.replace(/\s+/g, '');
  result = result.toLowerCase();
  return result;
}

function mapFieldName(rawHeader: string): string | null {
  const normalized = normalizeHeader(rawHeader);
  
  for (const [internalField, aliases] of Object.entries(FIELD_MAPPING)) {
    const normalizedAliases = aliases.map(alias => normalizeHeader(alias));
    if (normalizedAliases.includes(normalized)) {
      return internalField;
    }
  }
  return null;
}

export function remapRows(rows: Record<string, unknown>[]): RawComplaintRow[] {
  if (rows.length === 0) return [];
  
  const firstRow = rows[0];
  const headerMap: Record<string, string> = {};
  
  for (const rawHeader of Object.keys(firstRow)) {
    const mappedField = mapFieldName(rawHeader);
    if (mappedField) {
      headerMap[rawHeader] = mappedField;
    }
  }
  
  return rows.map(row => {
    const remapped: RawComplaintRow = {};
    for (const [rawKey, value] of Object.entries(row)) {
      const mappedField = headerMap[rawKey];
      if (mappedField) {
        remapped[mappedField as keyof RawComplaintRow] = String(value ?? '');
      }
    }
    return remapped;
  });
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

export function getSupportedHeaders(): Array<{ internal: string; aliases: string[] }> {
  return Object.entries(FIELD_MAPPING).map(([internal, aliases]) => ({
    internal,
    aliases,
  }));
}
