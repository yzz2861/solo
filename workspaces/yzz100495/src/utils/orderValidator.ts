import type { Order, OrderItem, Warning, AppConfig } from '@/types';
import { PRODUCT_INFO } from '@/types';
import { isPeakHour, isSameDay } from './dateUtils';

interface ValidateContext {
  orders: Order[];
  config: AppConfig;
  customerPhone: string;
  pickupDate: string;
  timeSlot: string;
  isPaid: boolean;
  items: OrderItem[];
}

export class OrderValidator {
  static checkDuplicateOrder(
    customerPhone: string,
    pickupDate: string,
    orders: Order[]
  ): Warning | null {
    const duplicate = orders.find(
      o => o.customerPhone === customerPhone && 
           isSameDay(o.pickupDate, pickupDate) &&
           o.status !== 'completed' &&
           o.status !== 'noShow'
    );
    
    if (duplicate) {
      return {
        type: 'duplicate_order',
        message: `该顾客今日已有订单（${duplicate.pickupTime}），是否为重复下单？`,
        severity: 'warning',
      };
    }
    return null;
  }

  static calculateCapacity(items: OrderItem[]): number {
    return items.reduce((total, item) => {
      return total + PRODUCT_INFO[item.productType].capacity * item.quantity;
    }, 0);
  }

  static checkBatchCapacity(
    pickupDate: string,
    items: OrderItem[],
    orders: Order[],
    config: AppConfig
  ): Warning | null {
    const requiredCapacity = this.calculateCapacity(items);
    const dayOrders = orders.filter(o => isSameDay(o.pickupDate, pickupDate));
    const usedCapacity = dayOrders.reduce((total, o) => {
      return total + this.calculateCapacity(o.items);
    }, 0);
    
    const remainingCapacity = config.ovenCapacity * 5 - usedCapacity;
    
    if (requiredCapacity > remainingCapacity) {
      return {
        type: 'batch_full',
        message: `该日期烤炉容量不足（剩余${remainingCapacity}单位，需要${requiredCapacity}单位），请调整数量或改期`,
        severity: 'error',
      };
    }
    
    if (usedCapacity + requiredCapacity > config.ovenCapacity * 4) {
      return {
        type: 'batch_full',
        message: `该日期烤炉已接近满载（已用${usedCapacity}/${config.ovenCapacity * 5}单位）`,
        severity: 'warning',
      };
    }
    
    return null;
  }

  static checkUnpaidPeakHour(
    timeSlot: string,
    isPaid: boolean,
    config: AppConfig
  ): Warning | null {
    if (!isPaid && isPeakHour(timeSlot, config.peakHours)) {
      return {
        type: 'unpaid_peak',
        message: `${timeSlot}是热门时段，建议先收款再确认订单，避免占用名额`,
        severity: 'warning',
      };
    }
    return null;
  }

  static checkNoShowHistory(
    customerPhone: string,
    orders: Order[]
  ): Warning | null {
    const customerOrders = orders.filter(o => o.customerPhone === customerPhone);
    const noShowCount = customerOrders.filter(o => o.status === 'noShow').length;
    const hasRecentNoShow = customerOrders.some(o => 
      o.status === 'noShow' && 
      o.noShowHistory.length > 0
    );
    
    if (noShowCount >= 2) {
      return {
        type: 'no_show_history',
        message: `该顾客已有${noShowCount}次爽约记录，建议先收款或婉拒`,
        severity: 'error',
      };
    }
    
    if (hasRecentNoShow) {
      return {
        type: 'no_show_history',
        message: `该顾客有爽约后改期记录，请确认此次预约的可靠性`,
        severity: 'warning',
      };
    }
    
    return null;
  }

  static validate(ctx: ValidateContext): Warning[] {
    const warnings: Warning[] = [];
    
    const duplicateWarning = this.checkDuplicateOrder(
      ctx.customerPhone,
      ctx.pickupDate,
      ctx.orders
    );
    if (duplicateWarning) warnings.push(duplicateWarning);
    
    const capacityWarning = this.checkBatchCapacity(
      ctx.pickupDate,
      ctx.items,
      ctx.orders,
      ctx.config
    );
    if (capacityWarning) warnings.push(capacityWarning);
    
    const unpaidWarning = this.checkUnpaidPeakHour(
      ctx.timeSlot,
      ctx.isPaid,
      ctx.config
    );
    if (unpaidWarning) warnings.push(unpaidWarning);
    
    const noShowWarning = this.checkNoShowHistory(
      ctx.customerPhone,
      ctx.orders
    );
    if (noShowWarning) warnings.push(noShowWarning);
    
    return warnings;
  }
}
