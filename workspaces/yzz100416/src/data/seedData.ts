import type { FlowerItem, Florist, WeddingCarOrder } from '@/types';

export const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const seedFlowers: FlowerItem[] = [
  { id: 'f1', name: '红玫瑰', unit: '扎', price: 68, stock: 18, safeStock: 5, category: '主花' },
  { id: 'f2', name: '白玫瑰', unit: '扎', price: 62, stock: 8, safeStock: 5, category: '主花' },
  { id: 'f3', name: '粉玫瑰', unit: '扎', price: 65, stock: 12, safeStock: 5, category: '主花' },
  { id: 'f4', name: '白百合', unit: '扎', price: 58, stock: 6, safeStock: 3, category: '主花' },
  { id: 'f5', name: '洋桔梗', unit: '扎', price: 45, stock: 10, safeStock: 4, category: '辅花' },
  { id: 'f6', name: '满天星', unit: '扎', price: 28, stock: 15, safeStock: 5, category: '辅花' },
  { id: 'f7', name: '绣球花', unit: '枝', price: 32, stock: 7, safeStock: 3, category: '辅花' },
  { id: 'f8', name: '尤加利叶', unit: '扎', price: 22, stock: 14, safeStock: 5, category: '叶材' },
  { id: 'f9', name: '高山羊齿', unit: '扎', price: 18, stock: 9, safeStock: 4, category: '叶材' },
  { id: 'f10', name: '缎带（香槟色）', unit: '卷', price: 15, stock: 6, safeStock: 3, category: '配饰' },
  { id: 'f11', name: '缎带（酒红色）', unit: '卷', price: 15, stock: 4, safeStock: 3, category: '配饰' },
  { id: 'f12', name: '吸盘', unit: '个', price: 2, stock: 50, safeStock: 20, category: '配饰' },
];

export const seedFlorists: Florist[] = [
  { id: 'fl1', name: '林姐', phone: '13800000001' },
  { id: 'fl2', name: '王师傅', phone: '13800000002' },
  { id: 'fl3', name: '小梅', phone: '13800000003' },
];

const T = todayStr();
const now = Date.now();

export const seedOrders: WeddingCarOrder[] = [
  {
    id: 'o1',
    date: T,
    coupleName: '陈先生 & 李小姐',
    carModel: '奔驰 S400',
    plateNumber: '粤B·A8888',
    flowers: [
      { flowerId: 'f1', quantity: 3 },
      { flowerId: 'f6', quantity: 2 },
      { flowerId: 'f8', quantity: 2 },
      { flowerId: 'f10', quantity: 1 },
      { flowerId: 'f12', quantity: 8 },
    ],
    floristId: 'fl1',
    arrivalTime: '08:30',
    handoverNote: '车头V型大花，门把手小花束4个',
    status: 'delivered',
    startedAt: '07:55',
    finishedAt: '08:25',
    deliveredAt: '08:32',
    costTotal: 0,
    anomalies: [],
    createdAt: now - 86400000,
    updatedAt: now - 3600000,
  },
  {
    id: 'o2',
    date: T,
    coupleName: '王先生 & 张小姐',
    carModel: '宝马 7系',
    plateNumber: '粤B·B6666',
    flowers: [
      { flowerId: 'f2', quantity: 3 },
      { flowerId: 'f5', quantity: 2 },
      { flowerId: 'f8', quantity: 1 },
      { flowerId: 'f11', quantity: 1 },
      { flowerId: 'f12', quantity: 8 },
    ],
    floristId: 'fl2',
    arrivalTime: '09:30',
    handoverNote: '素雅风格，副车5辆装饰',
    status: 'in_progress',
    startedAt: '09:00',
    costTotal: 0,
    anomalies: [],
    createdAt: now - 7200000,
    updatedAt: now - 1800000,
  },
  {
    id: 'o3',
    date: T,
    coupleName: '刘先生 & 周小姐',
    carModel: '保时捷 Cayenne',
    plateNumber: '粤B·C9999',
    flowers: [
      { flowerId: 'f3', quantity: 2 },
      { flowerId: 'f4', quantity: 2 },
      { flowerId: 'f7', quantity: 3 },
      { flowerId: 'f9', quantity: 2 },
      { flowerId: 'f10', quantity: 1 },
      { flowerId: 'f12', quantity: 8 },
    ],
    floristId: 'fl3',
    arrivalTime: '10:00',
    handoverNote: '新娘指定粉白配色，带LOVE字母牌',
    status: 'pending',
    costTotal: 0,
    anomalies: [],
    createdAt: now - 5400000,
    updatedAt: now - 5400000,
  },
  {
    id: 'o4',
    date: T,
    coupleName: '赵先生 & 黄小姐',
    carModel: '奥迪 A8L',
    plateNumber: '粤B·D5555',
    flowers: [
      { flowerId: 'f1', quantity: 4 },
      { flowerId: 'f5', quantity: 2 },
      { flowerId: 'f6', quantity: 1 },
      { flowerId: 'f8', quantity: 2 },
      { flowerId: 'f11', quantity: 1 },
      { flowerId: 'f12', quantity: 10 },
    ],
    floristId: 'fl1',
    arrivalTime: '11:00',
    handoverNote: '经典红色主题，副车8辆',
    status: 'pending',
    costTotal: 0,
    anomalies: [],
    createdAt: now - 3600000,
    updatedAt: now - 3600000,
  },
];

// 为示例订单计算成本
seedOrders.forEach(o => {
  o.costTotal = o.flowers.reduce((sum, ofi) => {
    const f = seedFlowers.find(ff => ff.id === ofi.flowerId);
    return sum + (f ? f.price * ofi.quantity : 0);
  }, 0);
});
