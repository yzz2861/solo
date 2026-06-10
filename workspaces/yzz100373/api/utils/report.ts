import type { Order, DailyReport } from '../../shared/types';
import { isSameDay, formatDate } from './date';

export function generateDailyReport(orders: Order[], date: Date): DailyReport {
  const dateStr = formatDate(date);
  const dayOrders = orders.filter(o => isSameDay(o.createdAt, date) && o.status !== 'cancelled');
  const cancelledOrders = orders.filter(o => isSameDay(o.createdAt, date) && o.status === 'cancelled');

  let memberDeductionCount = 0;
  let memberDeductionAmount = 0;
  let cashRevenue = 0;
  let addonRevenue = 0;
  let cancelledAmount = 0;

  for (const order of dayOrders) {
    if (order.payType === 'member' && order.packageDeducted > 0) {
      memberDeductionCount += 1;
    }
    if (order.payType === 'cash' && order.cashAmount) {
      cashRevenue += order.cashAmount;
    }
    if (order.payType === 'member' && order.cashAmount) {
      memberDeductionAmount += order.cashAmount;
    }
    for (const addon of order.addons) {
      if (addon.paid) {
        addonRevenue += addon.price;
      }
    }
  }

  for (const order of cancelledOrders) {
    if (order.payType === 'cash' && order.cashAmount) {
      cancelledAmount += order.cashAmount;
    }
    for (const addon of order.addons) {
      if (addon.paid) {
        cancelledAmount += addon.price;
      }
    }
  }

  return {
    date: dateStr,
    totalOrders: dayOrders.length,
    totalRevenue: memberDeductionAmount + cashRevenue + addonRevenue,
    memberDeductionCount,
    memberDeductionAmount,
    cashRevenue,
    addonRevenue,
    cancelledOrders: cancelledOrders.length,
    cancelledAmount,
    orders: [...dayOrders, ...cancelledOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  };
}

export function generateCSV(report: DailyReport): string {
  const header = ['时间', '排队号', '车牌号', '会员', '套餐', '支付方式', '洗车金额', '加项收入', '加项明细', '洗车工', '状态', '备注'];
  const rows: string[][] = [];

  for (const order of report.orders) {
    const addonNames = order.addons.map(a => `${a.name}(${a.paid ? '已付' : '未付'}¥${a.price})`).join('; ');
    const addonPaid = order.addons.filter(a => a.paid).reduce((sum, a) => sum + a.price, 0);
    rows.push([
      order.createdAt,
      `#${order.queueNumber}`,
      order.plateNumber,
      order.memberName || '-',
      order.packageName || '-',
      order.payType === 'member' ? '会员扣次' : '现金',
      order.payType === 'cash' ? `¥${order.cashAmount || 0}` : `扣${order.packageDeducted}次`,
      `¥${addonPaid}`,
      addonNames || '-',
      order.workerName || '-',
      order.status === 'cancelled' ? '已撤销' : order.status === 'done' ? '已完成' : order.status === 'washing' ? '进行中' : '排队中',
      order.status === 'cancelled' ? `撤销原因: ${order.cancelReason || ''}` : '',
    ]);
  }

  return [header, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}
