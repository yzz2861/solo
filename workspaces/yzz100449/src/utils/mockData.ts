import type { RecycleOrder } from '../types';

function base64Phone(color = 'black'): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'>
    <defs>
      <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
        <stop offset='0' stop-color='${color === 'white' ? '#F8FAFC' : '#1E293B'}'/>
        <stop offset='1' stop-color='${color === 'white' ? '#CBD5E1' : '#0F172A'}'/>
      </linearGradient>
    </defs>
    <rect x='10' y='10' width='180' height='280' rx='24' fill='url(#g)' stroke='#334155' stroke-width='2'/>
    <rect x='28' y='36' width='144' height='230' rx='8' fill='${color === 'white' ? '#E2E8F0' : '#111827'}'/>
    <circle cx='100' cy='24' r='4' fill='#334155'/>
    <circle cx='100' cy='282' r='7' fill='none' stroke='#475569' stroke-width='2'/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

function daysAgo(days: number, hour = 10, min = 0): number {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, min, 0, 0);
  return d.getTime();
}

function mkOrder(p: Partial<RecycleOrder> & Pick<RecycleOrder, 'serialNumber' | 'brand' | 'model' | 'initialPrice'>): RecycleOrder {
  const now = Date.now();
  return {
    id: 'ord_' + Math.random().toString(36).slice(2, 10),
    serialNumber: p.serialNumber,
    imei: p.imei ?? '86' + Math.floor(Math.random() * 1e13).toString().padStart(13, '0'),
    brand: p.brand,
    model: p.model,
    storage: p.storage ?? '256GB',
    color: p.color ?? '黑色',
    appearanceRating: p.appearanceRating ?? 'A',
    photos: p.photos ?? [base64Phone(p.color === '白色' || p.color === '白色' ? 'white' : 'black')],
    checkResult: p.checkResult ?? {
      screen: { scratch: 'pass', crack: 'pass', display: 'pass' },
      battery: { health: 92, bulge: 'pass' },
      water: { indicator: 'pass' },
      account: { idLoggedOut: 'pass' },
    },
    privacyWiped: p.privacyWiped ?? true,
    initialPrice: p.initialPrice,
    finalPrice: p.finalPrice ?? p.initialPrice,
    priceHistory: p.priceHistory ?? [],
    failReasons: p.failReasons,
    bargainFailRemark: p.bargainFailRemark,
    duplicateSnWarning: p.duplicateSnWarning,
    status: p.status ?? 'pending_in',
    createdAt: p.createdAt ?? now,
    updatedAt: p.updatedAt ?? now,
    createdBy: p.createdBy ?? '李明',
    createdByRole: p.createdByRole ?? 'staff',
    logs: p.logs ?? [
      {
        id: 'log_' + Math.random().toString(36).slice(2, 8),
        timestamp: p.createdAt ?? now,
        action: '创建回收单',
        operator: p.createdBy ?? '李明',
        operatorRole: p.createdByRole ?? 'staff',
      },
    ],
  };
}

export function genMockOrders(): RecycleOrder[] {
  return [
    mkOrder({
      serialNumber: 'F2LXW0XXXXQN', brand: 'Apple', model: 'iPhone 15 Pro', initialPrice: 6200, finalPrice: 6000,
      storage: '256GB', color: '蓝色', appearanceRating: 'A+',
      createdAt: daysAgo(0, 9, 30),
      priceHistory: [{ id: 'p1', oldPrice: 6200, newPrice: 6000, reason: '顾客坚持报价，机况优于预期', operator: '李明', operatorRole: 'staff', timestamp: daysAgo(0, 9, 45) }],
      status: 'on_shelf', createdBy: '李明',
    }),
    mkOrder({
      serialNumber: 'G2MD30XXXXP8', brand: '华为', model: 'Mate 60 Pro', initialPrice: 4500, finalPrice: 4300,
      storage: '512GB', color: '白色', appearanceRating: 'A',
      createdAt: daysAgo(0, 10, 15),
      priceHistory: [{ id: 'p2', oldPrice: 4500, newPrice: 4300, reason: '屏幕细微划痕，按B级处理', operator: '王芳', operatorRole: 'staff', timestamp: daysAgo(0, 10, 30) }],
      status: 'in_stock', privacyWiped: true, createdBy: '王芳',
    }),
    mkOrder({
      serialNumber: '8976ABXXXX21', brand: '小米', model: 'Xiaomi 14 Ultra', initialPrice: 3800, finalPrice: 3600,
      storage: '256GB', color: '黑色', appearanceRating: 'A',
      createdAt: daysAgo(0, 11, 20),
      priceHistory: [{ id: 'p3', oldPrice: 3800, newPrice: 3600, reason: '电池健康仅86%', operator: '张伟', operatorRole: 'staff', timestamp: daysAgo(0, 11, 35) }],
      status: 'pending_in', privacyWiped: false, createdBy: '张伟',
      checkResult: {
        screen: { scratch: 'pass', crack: 'pass', display: 'pass' },
        battery: { health: 86, bulge: 'pass' },
        water: { indicator: 'pass' },
        account: { idLoggedOut: 'pass' },
      },
    }),
    mkOrder({
      serialNumber: 'C39KXXXXQT33', brand: 'Apple', model: 'iPhone 13', initialPrice: 2200,
      storage: '128GB', color: '黑色', appearanceRating: 'B',
      createdAt: daysAgo(0, 14, 10),
      status: 'bargain_fail', bargainFailRemark: '顾客心理价位3000，议价2次未达成',
      failReasons: ['屏幕：存在明显划痕', '电池：健康度仅 79%'],
      createdBy: '李明',
      priceHistory: [
        { id: 'p4a', oldPrice: 2200, newPrice: 2400, reason: '顾客坚持报价，尝试争取', operator: '李明', operatorRole: 'staff', timestamp: daysAgo(0, 14, 20) },
        { id: 'p4b', oldPrice: 2400, newPrice: 2600, reason: '二次让价，仍未达顾客预期', operator: '陈店长', operatorRole: 'manager', timestamp: daysAgo(0, 14, 35) },
      ],
      checkResult: {
        screen: { scratch: 'fail', crack: 'pass', display: 'pass', remark: '右上角划痕约2cm' },
        battery: { health: 79, bulge: 'pass' },
        water: { indicator: 'pass' },
        account: { idLoggedOut: 'pass' },
      },
    }),
    mkOrder({
      serialNumber: 'OP24XXXXA88F', brand: 'OPPO', model: 'Find X7 Ultra', initialPrice: 4200, finalPrice: 4000,
      storage: '256GB', color: '绿色', appearanceRating: 'A',
      createdAt: daysAgo(1, 10, 5),
      priceHistory: [{ id: 'p5', oldPrice: 4200, newPrice: 4000, reason: '多台回收优惠', operator: '王芳', operatorRole: 'staff', timestamp: daysAgo(1, 10, 20) }],
      status: 'on_shelf', createdBy: '王芳',
    }),
    mkOrder({
      serialNumber: 'V2324XXXXB12', brand: 'vivo', model: 'X100 Pro', initialPrice: 3600, finalPrice: 3500,
      storage: '512GB', color: '金色', appearanceRating: 'A',
      createdAt: daysAgo(1, 15, 30),
      priceHistory: [{ id: 'p6', oldPrice: 3600, newPrice: 3500, reason: '市场行情波动', operator: '李明', operatorRole: 'staff', timestamp: daysAgo(1, 15, 45) }],
      status: 'on_shelf', createdBy: '李明',
    }),
    mkOrder({
      serialNumber: 'F2LXW0XXXXQN', brand: 'Apple', model: 'iPhone 15 Pro', initialPrice: 6000,
      storage: '256GB', color: '蓝色', appearanceRating: 'B',
      createdAt: daysAgo(2, 11, 10),
      status: 'pending_in', privacyWiped: false, duplicateSnWarning: true,
      checkResult: {
        screen: { scratch: 'pass', crack: 'pass', display: 'pass' },
        battery: { health: 95, bulge: 'pass' },
        water: { indicator: 'pass' },
        account: { idLoggedOut: 'pending' },
      },
      createdBy: '张伟',
    }),
    mkOrder({
      serialNumber: 'HW23XXXXY77', brand: '华为', model: 'Pura 70 Pro', initialPrice: 3800, finalPrice: 3650,
      storage: '256GB', color: '紫色', appearanceRating: 'A',
      createdAt: daysAgo(2, 14, 0),
      priceHistory: [{ id: 'p8', oldPrice: 3800, newPrice: 3650, reason: '外观轻微磕碰', operator: '陈店长', operatorRole: 'manager', timestamp: daysAgo(2, 14, 15) }],
      status: 'on_shelf', createdBy: '陈店长', createdByRole: 'manager',
    }),
    mkOrder({
      serialNumber: 'SM23XXXXK55', brand: '三星', model: 'Galaxy S24 Ultra', initialPrice: 5200,
      storage: '512GB', color: '黑色', appearanceRating: 'C',
      createdAt: daysAgo(3, 9, 40),
      status: 'returned',
      checkResult: {
        screen: { scratch: 'pass', crack: 'fail', display: 'pass' },
        battery: { health: 88, bulge: 'pass' },
        water: { indicator: 'fail' },
        account: { idLoggedOut: 'pass' },
      },
      failReasons: ['屏幕：玻璃碎裂', '进水：试纸变色，疑似进水'],
      createdBy: '王芳',
    }),
    mkOrder({
      serialNumber: 'HON24XXXXL31', brand: '荣耀', model: 'Magic6 Pro', initialPrice: 3300, finalPrice: 3200,
      storage: '256GB', color: '银色', appearanceRating: 'A',
      createdAt: daysAgo(3, 16, 20),
      priceHistory: [{ id: 'p10', oldPrice: 3300, newPrice: 3200, reason: '电池健康仅82%', operator: '张伟', operatorRole: 'staff', timestamp: daysAgo(3, 16, 35) }],
      status: 'in_stock', createdBy: '张伟', privacyWiped: true,
    }),
    mkOrder({
      serialNumber: 'A29XXXXXXW87', brand: 'Apple', model: 'iPhone 14 Pro Max', initialPrice: 5400, finalPrice: 5200,
      storage: '256GB', color: '银色', appearanceRating: 'A',
      createdAt: daysAgo(5, 10, 10),
      priceHistory: [{ id: 'p11', oldPrice: 5400, newPrice: 5200, reason: '顾客要求多让200', operator: '李明', operatorRole: 'staff', timestamp: daysAgo(5, 10, 25) }],
      status: 'on_shelf', createdBy: '李明',
    }),
    mkOrder({
      serialNumber: 'MI23XXXXU44', brand: '小米', model: 'Redmi K70 Pro', initialPrice: 2100, finalPrice: 2000,
      storage: '256GB', color: '蓝色', appearanceRating: 'B',
      createdAt: daysAgo(5, 14, 50),
      priceHistory: [{ id: 'p12', oldPrice: 2100, newPrice: 2000, reason: '屏幕细微划痕', operator: '王芳', operatorRole: 'staff', timestamp: daysAgo(5, 15, 5) }],
      status: 'on_shelf', createdBy: '王芳',
    }),
  ];
}
