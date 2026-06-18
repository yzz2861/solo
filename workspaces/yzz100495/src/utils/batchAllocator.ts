import type { Batch, Order, OrderItem, AppConfig } from '@/types';
import { PRODUCT_INFO } from '@/types';
import { generateId } from './storage';
import { formatDate, formatTime, parseDate, parseTime, addMinutes } from './dateUtils';
import { OrderValidator } from './orderValidator';

export class BatchAllocator {
  static calculateCapacity(items: OrderItem[]): number {
    return OrderValidator.calculateCapacity(items);
  }

  static allocateBatch(
    pickupDate: string,
    pickupTime: string,
    items: OrderItem[],
    batches: Batch[],
    config: AppConfig
  ): Batch | null {
    const requiredCapacity = this.calculateCapacity(items);
    const bakingDate = this.getBakingDate(pickupDate, pickupTime, config);
    
    const dayBatches = batches
      .filter(b => b.bakingDate === bakingDate)
      .sort((a, b) => a.batchNumber - b.batchNumber);
    
    for (const batch of dayBatches) {
      const remainingCapacity = batch.capacity - batch.usedCapacity;
      if (remainingCapacity >= requiredCapacity && batch.status === 'scheduled') {
        return batch;
      }
    }
    
    return this.createNewBatch(bakingDate, dayBatches.length + 1, requiredCapacity, config);
  }

  static getBakingDate(
    pickupDate: string,
    pickupTime: string,
    config: AppConfig
  ): string {
    const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
    const bakingDateTime = addMinutes(pickupDateTime, -config.prepTime);
    return formatDate(bakingDateTime);
  }

  static createNewBatch(
    bakingDate: string,
    batchNumber: number,
    requiredCapacity: number,
    config: AppConfig
  ): Batch {
    const startHour = 8 + (batchNumber - 1) * 2;
    const startTime = `${startHour.toString().padStart(2, '0')}:00`;
    const endTime = `${(startHour + 1).toString().padStart(2, '0')}:30`;
    
    return {
      id: generateId(),
      batchNumber,
      bakingDate,
      startTime,
      endTime,
      capacity: config.ovenCapacity,
      usedCapacity: 0,
      status: 'scheduled',
      productSummary: {
        baguette: 0,
        toast: 0,
        cake: 0,
      },
    };
  }

  static updateBatchSummary(batch: Batch, items: OrderItem[], add: boolean = true): Batch {
    const summary = { ...batch.productSummary };
    let capacityChange = 0;
    
    items.forEach(item => {
      const qty = add ? item.quantity : -item.quantity;
      summary[item.productType] += qty;
      capacityChange += PRODUCT_INFO[item.productType].capacity * item.quantity;
    });
    
    return {
      ...batch,
      productSummary: summary,
      usedCapacity: add 
        ? batch.usedCapacity + capacityChange 
        : batch.usedCapacity - capacityChange,
    };
  }

  static groupOrdersByBatch(
    orders: Order[], 
    batches: Batch[], 
    date: string,
    config?: AppConfig
  ): Map<string, Order[]> {
    const grouped = new Map<string, Order[]>();
    
    const dayBatches = batches.filter(b => b.bakingDate === date);
    const dayBatchIds = new Set(dayBatches.map(b => b.id));
    
    const relatedOrders = orders.filter(o => {
      if (o.batchId && dayBatchIds.has(o.batchId)) {
        return true;
      }
      if (!o.batchId && config) {
        const bakingDate = this.getBakingDate(o.pickupDate, o.pickupTime, config);
        return bakingDate === date;
      }
      return false;
    });
    
    dayBatches.forEach(batch => {
      const batchOrders = relatedOrders.filter(o => o.batchId === batch.id);
      grouped.set(batch.id, batchOrders);
    });
    
    const unassignedOrders = relatedOrders.filter(o => !o.batchId);
    if (unassignedOrders.length > 0) {
      grouped.set('unassigned', unassignedOrders);
    }
    
    return grouped;
  }

  static groupOrdersByTimeSlot(orders: Order[], date: string): Map<string, Order[]> {
    const grouped = new Map<string, Order[]>();
    
    orders
      .filter(o => o.pickupDate === date)
      .forEach(order => {
        const slot = order.timeSlot;
        if (!grouped.has(slot)) {
          grouped.set(slot, []);
        }
        grouped.get(slot)!.push(order);
      });
    
    return grouped;
  }

  static getBatchLoadPercentage(batch: Batch): number {
    return Math.round((batch.usedCapacity / batch.capacity) * 100);
  }

  static isBatchAvailable(batch: Batch, requiredCapacity: number): boolean {
    return batch.status === 'scheduled' && 
           (batch.capacity - batch.usedCapacity) >= requiredCapacity;
  }
}
