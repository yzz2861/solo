import type { Order, Batch, Customer, AppConfig } from '@/types';
import { addDays } from 'date-fns';
import { generateId } from '@/utils/storage';
import { formatDate, getTimeSlot } from '@/utils/dateUtils';

const today = new Date();
const tomorrow = addDays(today, 1);
const dayAfter = addDays(today, 2);

export const defaultConfig: AppConfig = {
  ovenCapacity: 20,
  timeSlotDuration: 30,
  peakHours: ['15:00-16:00', '16:00-17:00', '17:00-18:00'],
  pickupStartTime: '13:00',
  pickupEndTime: '19:00',
  bakingInterval: 30,
  prepTime: 60,
};

export const mockCustomers: Customer[] = [
  {
    id: generateId(),
    name: '张阿姨',
    phone: '13800138001',
    noShowCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: '李叔叔',
    phone: '13800138002',
    noShowCount: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: '王小姐',
    phone: '13800138003',
    noShowCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: '赵大哥',
    phone: '13800138004',
    noShowCount: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: '陈女士',
    phone: '13800138005',
    noShowCount: 0,
    createdAt: new Date().toISOString(),
  },
];

const createOrder = (
  customer: Customer,
  date: Date,
  time: string,
  items: Order['items'],
  isPaid: boolean,
  status: Order['status'] = 'paid',
  noShowHistory: string[] = []
): Order => {
  const dateStr = formatDate(date);
  return {
    id: generateId(),
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    pickupDate: dateStr,
    pickupTime: time,
    timeSlot: getTimeSlot(time, defaultConfig.timeSlotDuration),
    status,
    isPaid,
    specialRequest: '',
    batchId: null,
    items,
    noShowHistory,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const mockOrders: Order[] = [
  createOrder(
    mockCustomers[0],
    today,
    '15:30',
    [
      { id: generateId(), productType: 'baguette', quantity: 3, flavor: '原味' },
      { id: generateId(), productType: 'toast', quantity: 2, flavor: '全麦' },
    ],
    true,
    'preparing'
  ),
  createOrder(
    mockCustomers[1],
    today,
    '16:00',
    [
      { id: generateId(), productType: 'cake', quantity: 1, flavor: '巧克力' },
    ],
    true,
    'paid'
  ),
  createOrder(
    mockCustomers[2],
    today,
    '14:30',
    [
      { id: generateId(), productType: 'baguette', quantity: 2, flavor: '蒜香' },
      { id: generateId(), productType: 'toast', quantity: 1, flavor: '牛奶' },
    ],
    true,
    'ready'
  ),
  createOrder(
    mockCustomers[0],
    tomorrow,
    '15:00',
    [
      { id: generateId(), productType: 'cake', quantity: 2, flavor: '草莓' },
    ],
    true,
    'paid'
  ),
  createOrder(
    mockCustomers[3],
    tomorrow,
    '17:00',
    [
      { id: generateId(), productType: 'baguette', quantity: 5, flavor: '原味' },
      { id: generateId(), productType: 'toast', quantity: 3, flavor: '全麦' },
    ],
    false,
    'pending'
  ),
  createOrder(
    mockCustomers[4],
    tomorrow,
    '16:30',
    [
      { id: generateId(), productType: 'toast', quantity: 4, flavor: '紫薯' },
      { id: generateId(), productType: 'cake', quantity: 1, flavor: '芒果' },
    ],
    true,
    'paid'
  ),
  createOrder(
    mockCustomers[2],
    dayAfter,
    '14:00',
    [
      { id: generateId(), productType: 'baguette', quantity: 10, flavor: '原味' },
    ],
    true,
    'paid'
  ),
  createOrder(
    mockCustomers[1],
    dayAfter,
    '18:00',
    [
      { id: generateId(), productType: 'cake', quantity: 3, flavor: '提拉米苏' },
      { id: generateId(), productType: 'toast', quantity: 2, flavor: '椰蓉' },
    ],
    false,
    'pending'
  ),
];

export const mockBatches: Batch[] = [
  {
    id: generateId(),
    batchNumber: 1,
    bakingDate: formatDate(today),
    startTime: '08:00',
    endTime: '09:30',
    capacity: defaultConfig.ovenCapacity,
    usedCapacity: 12,
    status: 'completed',
    productSummary: { baguette: 6, toast: 3, cake: 0 },
  },
  {
    id: generateId(),
    batchNumber: 2,
    bakingDate: formatDate(today),
    startTime: '10:00',
    endTime: '11:30',
    capacity: defaultConfig.ovenCapacity,
    usedCapacity: 15,
    status: 'baking',
    productSummary: { baguette: 3, toast: 2, cake: 1 },
  },
  {
    id: generateId(),
    batchNumber: 3,
    bakingDate: formatDate(today),
    startTime: '12:00',
    endTime: '13:30',
    capacity: defaultConfig.ovenCapacity,
    usedCapacity: 8,
    status: 'scheduled',
    productSummary: { baguette: 0, toast: 2, cake: 2 },
  },
  {
    id: generateId(),
    batchNumber: 1,
    bakingDate: formatDate(tomorrow),
    startTime: '08:00',
    endTime: '09:30',
    capacity: defaultConfig.ovenCapacity,
    usedCapacity: 0,
    status: 'scheduled',
    productSummary: { baguette: 0, toast: 0, cake: 0 },
  },
  {
    id: generateId(),
    batchNumber: 2,
    bakingDate: formatDate(tomorrow),
    startTime: '10:00',
    endTime: '11:30',
    capacity: defaultConfig.ovenCapacity,
    usedCapacity: 0,
    status: 'scheduled',
    productSummary: { baguette: 0, toast: 0, cake: 0 },
  },
];

mockOrders[0].batchId = mockBatches[1].id;
mockOrders[2].batchId = mockBatches[1].id;

export const initializeMockData = (): {
  orders: Order[];
  batches: Batch[];
  customers: Customer[];
  config: AppConfig;
} => {
  return {
    orders: mockOrders,
    batches: mockBatches,
    customers: mockCustomers,
    config: defaultConfig,
  };
};
