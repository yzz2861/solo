import { Refund, RefundReason } from '../types';
import { orders } from './orders';
import { format, addHours, parseISO } from 'date-fns';

const generateRefunds = (): Refund[] => {
  const refunds: Refund[] = [];
  const refundedOrders = orders.filter(o => o.status === 'refunded' && !o.flags.isDuplicate);
  const dischargePatients = new Set<string>();
  
  let refundId = 1;
  
  refundedOrders.forEach((order, index) => {
    const reasons: RefundReason[] = ['discharge', 'lockdown', 'other'];
    const reason = reasons[index % 3];
    
    if (reason === 'discharge') {
      dischargePatients.add(order.patientId);
    }
    
    const orderTime = parseISO(order.createdAt);
    const refundTime = addHours(orderTime, 1 + Math.floor(Math.random() * 5));
    
    refunds.push({
      id: `REF-${String(refundId++).padStart(6, '0')}`,
      orderId: order.id,
      reason,
      reasonDetail: reason === 'discharge' ? '患者出院' :
                    reason === 'lockdown' ? '病区临时封控' :
                    '个人原因退餐',
      amount: order.price,
      refundTime: format(refundTime, 'yyyy-MM-dd HH:mm:ss'),
      operator: ['李护士', '王护士', '张护士', '刘护士'][index % 4]
    });
  });
  
  return refunds.sort((a, b) => b.refundTime.localeCompare(a.refundTime));
};

export const refunds: Refund[] = generateRefunds();
