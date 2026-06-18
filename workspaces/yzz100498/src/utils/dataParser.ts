import Papa from 'papaparse';
import { Order, Refund, WardCount, Holiday, MealType } from '../types';

export const parseCSV = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const parseOrders = async (file: File): Promise<Partial<Order>[]> => {
  const data = await parseCSV(file);
  
  return data.map((row: any, index: number) => ({
    id: row['订单号'] || row['id'] || `IMP-${String(index + 1).padStart(6, '0')}`,
    patientId: row['患者ID'] || row['patientId'],
    patientName: row['患者姓名'] || row['patientName'],
    wardId: row['病区ID'] || row['wardId'],
    wardName: row['病区名称'] || row['wardName'],
    mealId: row['餐品ID'] || row['mealId'],
    mealName: row['餐品名称'] || row['mealName'],
    mealType: (row['餐次'] || row['mealType'] || 'lunch') as MealType,
    orderDate: row['订餐日期'] || row['orderDate'],
    quantity: parseInt(row['数量'] || row['quantity'] || '1'),
    price: parseFloat(row['价格'] || row['price'] || '0'),
    status: row['状态'] || row['status'] || 'confirmed',
    isSpecial: (row['特殊餐'] || row['isSpecial']) === '是' || (row['特殊餐'] || row['isSpecial']) === true,
    dietaryType: row['饮食类型'] || row['dietaryType'],
    createdAt: row['创建时间'] || row['createdAt'] || new Date().toISOString(),
    notes: row['备注'] || row['notes']
  }));
};

export const parseWardCounts = async (file: File): Promise<Partial<WardCount>[]> => {
  const data = await parseCSV(file);
  
  return data.map((row: any, index: number) => ({
    id: row['ID'] || row['id'] || `WC-${String(index + 1).padStart(6, '0')}`,
    wardId: row['病区ID'] || row['wardId'],
    wardName: row['病区名称'] || row['wardName'],
    reportDate: row['上报日期'] || row['reportDate'],
    patientCount: parseInt(row['患者人数'] || row['patientCount'] || '0'),
    companionCount: parseInt(row['陪护人数'] || row['companionCount'] || '0'),
    specialMealCount: parseInt(row['特殊餐人数'] || row['specialMealCount'] || '0'),
    reporter: row['上报人'] || row['reporter'],
    isLockedDown: (row['是否封控'] || row['isLockedDown']) === '是' || (row['是否封控'] || row['isLockedDown']) === true
  }));
};

export const parseRefunds = async (file: File): Promise<Partial<Refund>[]> => {
  const data = await parseCSV(file);
  
  return data.map((row: any, index: number) => ({
    id: row['退餐号'] || row['id'] || `REF-${String(index + 1).padStart(6, '0')}`,
    orderId: row['原订单号'] || row['orderId'],
    reason: row['退餐原因'] || row['reason'] || 'other',
    reasonDetail: row['原因详情'] || row['reasonDetail'],
    amount: parseFloat(row['退餐金额'] || row['amount'] || '0'),
    refundTime: row['退餐时间'] || row['refundTime'] || new Date().toISOString(),
    operator: row['操作人'] || row['operator']
  }));
};

export const parseHolidays = async (file: File): Promise<Partial<Holiday>[]> => {
  const data = await parseCSV(file);
  
  return data.map((row: any) => ({
    date: row['日期'] || row['date'],
    name: row['节假日名称'] || row['name'],
    type: (row['类型'] || row['type'] || 'public') as 'public' | 'hospital' | 'event',
    impactFactor: parseFloat(row['影响因子'] || row['impactFactor'] || '1.0'),
    notes: row['备注'] || row['notes']
  }));
};

export const validateData = (data: any[], requiredFields: string[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field] && row[field] !== 0) {
        errors.push(`第${index + 2}行缺少必填字段: ${field}`);
      }
    });
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const detectDuplicateOrders = (orders: Partial<Order>[]): string[] => {
  const duplicates: string[] = [];
  const seen = new Set<string>();
  
  orders.forEach(order => {
    const key = `${order.patientId}-${order.orderDate}-${order.mealType}`;
    if (seen.has(key)) {
      duplicates.push(order.id || '');
    } else {
      seen.add(key);
    }
  });
  
  return duplicates;
};

export const detectCrossMidnightOrders = (orders: Partial<Order>[]): string[] => {
  return orders
    .filter(order => {
      if (order.mealType !== 'supper' || !order.createdAt) return false;
      const hour = new Date(order.createdAt).getHours();
      return hour >= 23 || hour < 2;
    })
    .map(order => order.id || '');
};
