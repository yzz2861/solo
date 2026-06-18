import Papa from 'papaparse';
import { Order, Refund, WardCount, Holiday, MealType, OrderStatus, RefundReason } from '../types';

const MEAL_TYPE_MAP: Record<string, MealType> = {
  breakfast: 'breakfast', 早餐: 'breakfast', zao: 'breakfast',
  lunch: 'lunch', 午餐: 'lunch', wu: 'lunch',
  dinner: 'dinner', 晚餐: 'dinner', wan: 'dinner',
  supper: 'supper', 夜宵: 'supper', 宵夜: 'supper', ye: 'supper'
};

const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  pending: 'pending', 待处理: 'pending', 待确认: 'pending',
  confirmed: 'confirmed', 已确认: 'confirmed',
  completed: 'completed', 已完成: 'completed', 完成: 'completed',
  refunded: 'refunded', 已退餐: 'refunded', 退餐: 'refunded'
};

const REFUND_REASON_MAP: Record<string, RefundReason> = {
  discharge: 'discharge', 出院: 'discharge', 病人出院: 'discharge',
  lockdown: 'lockdown', 封控: 'lockdown', 病区封控: 'lockdown',
  duplicate: 'duplicate', 重复: 'duplicate', 重复订餐: 'duplicate',
  other: 'other', 其他: 'other'
};

const HOLIDAY_TYPE_MAP: Record<string, 'public' | 'hospital' | 'event'> = {
  public: 'public', 公共: 'public', 法定: 'public', 节假日: 'public',
  hospital: 'hospital', 医院: 'hospital', 院庆: 'hospital',
  event: 'event', 活动: 'event', 事件: 'event'
};

export interface ParseResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
}

export const parseCSV = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

const normalizeField = <T extends object>(row: T, keys: string[]): any => {
  for (const k of keys) {
    if ((row as any)[k] !== undefined && (row as any)[k] !== null && (row as any)[k] !== '') {
      return (row as any)[k];
    }
  }
  return undefined;
};

const validateRequired = (row: any, fields: { key: string; label: string }[], lineNum: number, errors: string[]) => {
  for (const f of fields) {
    if (row[f.key] === undefined || row[f.key] === null || String(row[f.key]).trim() === '') {
      errors.push(`第${lineNum}行: 缺少必填字段【${f.label}】`);
      return false;
    }
  }
  return true;
};

export const parseOrders = async (file: File): Promise<ParseResult<Order>> => {
  const rawData = await parseCSV(file);
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: Order[] = [];

  rawData.forEach((row: any, index: number) => {
    const lineNum = index + 2;
    const order = {
      id: normalizeField(row, ['订单号', 'id', 'orderId', 'order_id']),
      patientId: normalizeField(row, ['患者ID', 'patientId', 'patient_id']),
      patientName: normalizeField(row, ['患者姓名', 'patientName', 'patient_name', '姓名']),
      familyMemberName: normalizeField(row, ['家属姓名', 'familyMemberName', 'family_member_name', '陪护姓名']),
      wardId: normalizeField(row, ['病区ID', 'wardId', 'ward_id']),
      wardName: normalizeField(row, ['病区名称', 'wardName', 'ward_name', '病区']),
      mealId: normalizeField(row, ['餐品ID', 'mealId', 'meal_id']),
      mealName: normalizeField(row, ['餐品名称', 'mealName', 'meal_name', '餐品']),
      mealTypeRaw: normalizeField(row, ['餐次', 'mealType', 'meal_type']),
      orderDate: normalizeField(row, ['订餐日期', 'orderDate', 'order_date', '日期']),
      quantity: normalizeField(row, ['数量', 'quantity', 'qty']),
      price: normalizeField(row, ['价格', 'price', '金额']),
      statusRaw: normalizeField(row, ['状态', 'status', '订单状态']),
      isSpecialRaw: normalizeField(row, ['特殊餐', 'isSpecial', '是否特殊餐', 'special']),
      dietaryType: normalizeField(row, ['饮食类型', 'dietaryType', 'dietary_type', '餐型']),
      createdAt: normalizeField(row, ['创建时间', 'createdAt', 'create_time', '下单时间']),
      notes: normalizeField(row, ['备注', 'notes', 'remark'])
    };

    if (!validateRequired(order, [
      { key: 'orderDate', label: '订餐日期' }
    ], lineNum, errors)) return;

    const mealType = MEAL_TYPE_MAP[String(order.mealTypeRaw || 'lunch').trim().toLowerCase()]
      || MEAL_TYPE_MAP[String(order.mealTypeRaw || 'lunch').trim()]
      || 'lunch';

    const status = ORDER_STATUS_MAP[String(order.statusRaw || 'confirmed').trim().toLowerCase()]
      || ORDER_STATUS_MAP[String(order.statusRaw || 'confirmed').trim()]
      || 'confirmed';

    const isSpecial = String(order.isSpecialRaw || 'false').trim() === '是'
      || String(order.isSpecialRaw || 'false').trim() === 'true'
      || order.isSpecialRaw === true
      || order.isSpecialRaw === 1;

    let isDuplicate = false;
    let isCrossMidnight = false;
    if (order.createdAt && mealType === 'supper') {
      try {
        const hour = new Date(order.createdAt).getHours();
        isCrossMidnight = hour >= 23 || hour < 2;
      } catch { /* ignore */ }
    }

    data.push({
      id: order.id || `IMP-${String(index + 1).padStart(6, '0')}`,
      patientId: order.patientId || `P${String(1000 + index).padStart(4, '0')}`,
      patientName: String(order.patientName || '未知患者').trim(),
      familyMemberName: String(order.familyMemberName || `${order.patientName || '患者'}家属`).trim(),
      wardId: String(order.wardId || `ward-${String(Math.floor(Math.random() * 8) + 1).padStart(3, '0')}`).trim(),
      wardName: String(order.wardName || '未明病区').trim(),
      mealId: String(order.mealId || 'MEAL-GENERIC').trim(),
      mealName: String(order.mealName || '标准陪护餐').trim(),
      mealType,
      mealTypeLabel: { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', supper: '夜宵' }[mealType],
      orderDate: String(order.orderDate).trim(),
      quantity: parseInt(String(order.quantity || '1')) || 1,
      price: parseFloat(String(order.price || '20')) || 20,
      status,
      isSpecial,
      dietaryType: order.dietaryType ? String(order.dietaryType).trim() : undefined,
      createdAt: String(order.createdAt || new Date().toISOString()),
      notes: order.notes ? String(order.notes).trim() : undefined,
      flags: {
        isDuplicate,
        isCrossMidnight,
        isHoliday: false
      }
    });
  });

  const seenKeys = new Set<string>();
  data.forEach(order => {
    const key = `${order.patientId}-${order.orderDate}-${order.mealType}`;
    if (seenKeys.has(key)) {
      order.flags.isDuplicate = true;
    } else {
      seenKeys.add(key);
    }
  });

  const dupCount = data.filter(o => o.flags.isDuplicate).length;
  if (dupCount > 0) warnings.push(`检测到 ${dupCount} 笔重复订餐（同患者同餐次）`);
  const crossCount = data.filter(o => o.flags.isCrossMidnight).length;
  if (crossCount > 0) warnings.push(`检测到 ${crossCount} 笔跨午夜夜宵订单`);

  return {
    success: errors.length === 0,
    data,
    errors,
    warnings
  };
};

export const parseWardCounts = async (file: File): Promise<ParseResult<WardCount>> => {
  const rawData = await parseCSV(file);
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: WardCount[] = [];

  rawData.forEach((row: any, index: number) => {
    const lineNum = index + 2;
    const wc = {
      id: normalizeField(row, ['ID', 'id', 'recordId']),
      wardId: normalizeField(row, ['病区ID', 'wardId', 'ward_id']),
      wardName: normalizeField(row, ['病区名称', 'wardName', 'ward_name', '病区']),
      reportDate: normalizeField(row, ['上报日期', 'reportDate', 'report_date', '日期']),
      patientCount: normalizeField(row, ['患者人数', 'patientCount', 'patient_count']),
      companionCount: normalizeField(row, ['陪护人数', 'companionCount', 'companion_count']),
      specialMealCount: normalizeField(row, ['特殊餐人数', 'specialMealCount', 'special_meal_count']),
      reporter: normalizeField(row, ['上报人', 'reporter', 'operator']),
      isLockedDownRaw: normalizeField(row, ['是否封控', 'isLockedDown', '封控', 'locked_down'])
    };

    if (!validateRequired(wc, [
      { key: 'wardName', label: '病区名称' },
      { key: 'reportDate', label: '上报日期' }
    ], lineNum, errors)) return;

    const isLockedDown = String(wc.isLockedDownRaw || 'false').trim() === '是'
      || String(wc.isLockedDownRaw || 'false').trim() === 'true'
      || wc.isLockedDownRaw === true
      || wc.isLockedDownRaw === 1;

    data.push({
      id: wc.id || `WC-${String(index + 1).padStart(6, '0')}`,
      wardId: String(wc.wardId || `ward-${String(index + 1).padStart(3, '0')}`).trim(),
      wardName: String(wc.wardName).trim(),
      reportDate: String(wc.reportDate).trim(),
      patientCount: parseInt(String(wc.patientCount || '0')) || 0,
      companionCount: parseInt(String(wc.companionCount || '0')) || 0,
      specialMealCount: parseInt(String(wc.specialMealCount || '0')) || 0,
      reporter: String(wc.reporter || '系统导入').trim(),
      isLockedDown
    });
  });

  const lockedCount = data.filter(w => w.isLockedDown).length;
  if (lockedCount > 0) warnings.push(`检测到 ${lockedCount} 条病区封控记录`);

  return { success: errors.length === 0, data, errors, warnings };
};

export const parseRefunds = async (file: File): Promise<ParseResult<Refund>> => {
  const rawData = await parseCSV(file);
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: Refund[] = [];

  rawData.forEach((row: any, index: number) => {
    const lineNum = index + 2;
    const rf = {
      id: normalizeField(row, ['退餐号', 'id', 'refundId', 'refund_id']),
      orderId: normalizeField(row, ['原订单号', 'orderId', 'order_id']),
      reasonRaw: normalizeField(row, ['退餐原因', 'reason', '原因']),
      reasonDetail: normalizeField(row, ['原因详情', 'reasonDetail', 'detail', '说明']),
      amount: normalizeField(row, ['退餐金额', 'amount', '金额']),
      refundTime: normalizeField(row, ['退餐时间', 'refundTime', 'refund_time', '时间']),
      operator: normalizeField(row, ['操作人', 'operator', 'staff'])
    };

    if (!validateRequired(rf, [
      { key: 'orderId', label: '原订单号' }
    ], lineNum, errors)) return;

    const reason = REFUND_REASON_MAP[String(rf.reasonRaw || 'other').trim().toLowerCase()]
      || REFUND_REASON_MAP[String(rf.reasonRaw || 'other').trim()]
      || 'other';

    data.push({
      id: rf.id || `REF-${String(index + 1).padStart(6, '0')}`,
      orderId: String(rf.orderId).trim(),
      reason,
      reasonDetail: rf.reasonDetail ? String(rf.reasonDetail).trim() : undefined,
      amount: parseFloat(String(rf.amount || '0')) || 0,
      refundTime: String(rf.refundTime || new Date().toISOString()),
      operator: String(rf.operator || '系统导入').trim()
    });
  });

  const dischargeCount = data.filter(r => r.reason === 'discharge').length;
  if (dischargeCount > 0) warnings.push(`因病人出院退餐 ${dischargeCount} 笔`);

  return { success: errors.length === 0, data, errors, warnings };
};

export const parseHolidays = async (file: File): Promise<ParseResult<Holiday>> => {
  const rawData = await parseCSV(file);
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: Holiday[] = [];

  rawData.forEach((row: any, index: number) => {
    const lineNum = index + 2;
    const hd = {
      date: normalizeField(row, ['日期', 'date', 'holiday_date']),
      name: normalizeField(row, ['节假日名称', 'name', 'holiday_name', '名称']),
      typeRaw: normalizeField(row, ['类型', 'type', 'holiday_type']),
      impactFactor: normalizeField(row, ['影响因子', 'impactFactor', 'impact_factor', 'factor']),
      notes: normalizeField(row, ['备注', 'notes', 'remark'])
    };

    if (!validateRequired(hd, [
      { key: 'date', label: '日期' },
      { key: 'name', label: '节假日名称' }
    ], lineNum, errors)) return;

    const type = HOLIDAY_TYPE_MAP[String(hd.typeRaw || 'public').trim().toLowerCase()]
      || HOLIDAY_TYPE_MAP[String(hd.typeRaw || 'public').trim()]
      || 'public';

    data.push({
      date: String(hd.date).trim(),
      name: String(hd.name).trim(),
      type,
      impactFactor: parseFloat(String(hd.impactFactor || '1.0')) || 1.0,
      notes: hd.notes ? String(hd.notes).trim() : undefined
    });
  });

  return { success: errors.length === 0, data, errors, warnings };
};

export const detectDuplicateOrders = (orders: Order[]): string[] => {
  const duplicates: string[] = [];
  const seen = new Set<string>();
  orders.forEach(order => {
    const key = `${order.patientId}-${order.orderDate}-${order.mealType}`;
    if (seen.has(key)) duplicates.push(order.id);
    else seen.add(key);
  });
  return duplicates;
};

export const detectCrossMidnightOrders = (orders: Order[]): string[] => {
  return orders
    .filter(order => {
      if (order.mealType !== 'supper' || !order.createdAt) return false;
      try {
        const hour = new Date(order.createdAt).getHours();
        return hour >= 23 || hour < 2;
      } catch { return false; }
    })
    .map(order => order.id);
};
