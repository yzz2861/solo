import type {
  InventoryRecord,
  DiscountRecord,
  SalesRecord,
  LossRecord,
  StoreInfo,
  CategoryInfo,
} from '../types';

const today = new Date('2026-06-18');

function daysFromNow(days: number): Date {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days: number): Date {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d;
}

export const stores: StoreInfo[] = [
  { storeId: 'S001', storeName: '朝阳旗舰店', storeType: 'flagship', area: 2500 },
  { storeId: 'S002', storeName: '海淀社区店', storeType: 'community', area: 800 },
  { storeId: 'S003', storeName: '西城标准店', storeType: 'standard', area: 1500 },
  { storeId: 'S004', storeName: '东城社区店', storeType: 'community', area: 600 },
  { storeId: 'S005', storeName: '丰台标准店', storeType: 'standard', area: 1200 },
];

export const categories: CategoryInfo[] = [
  { categoryId: 'C001', categoryName: '生鲜蔬菜', typicalShelfLifeDays: 5 },
  { categoryId: 'C002', categoryName: '生鲜水果', typicalShelfLifeDays: 7 },
  { categoryId: 'C003', categoryName: '生鲜肉类', typicalShelfLifeDays: 3 },
  { categoryId: 'C004', categoryName: '鲜乳制品', typicalShelfLifeDays: 10 },
  { categoryId: 'C005', categoryName: '常温乳品', typicalShelfLifeDays: 180 },
  { categoryId: 'C006', categoryName: '烘焙食品', typicalShelfLifeDays: 4 },
];

const products = [
  { sku: 'P001', name: '有机生菜', category: '生鲜蔬菜', price: 8.5 },
  { sku: 'P002', name: '西红柿', category: '生鲜蔬菜', price: 6.0 },
  { sku: 'P003', name: '黄瓜', category: '生鲜蔬菜', price: 5.5 },
  { sku: 'P004', name: '红富士苹果', category: '生鲜水果', price: 12.0 },
  { sku: 'P005', name: '香蕉', category: '生鲜水果', price: 7.5 },
  { sku: 'P006', name: '草莓', category: '生鲜水果', price: 25.0 },
  { sku: 'P007', name: '猪里脊肉', category: '生鲜肉类', price: 35.0 },
  { sku: 'P008', name: '鸡胸肉', category: '生鲜肉类', price: 22.0 },
  { sku: 'P009', name: '三文鱼', category: '生鲜肉类', price: 68.0 },
  { sku: 'P010', name: '鲜牛奶950ml', category: '鲜乳制品', price: 15.8 },
  { sku: 'P011', name: '酸奶原味200g', category: '鲜乳制品', price: 6.5 },
  { sku: 'P012', name: '奶酪片', category: '鲜乳制品', price: 18.0 },
  { sku: 'P013', name: '纯牛奶1L', category: '常温乳品', price: 12.0 },
  { sku: 'P014', name: '酸奶饮品', category: '常温乳品', price: 8.0 },
  { sku: 'P015', name: '全麦面包', category: '烘焙食品', price: 12.0 },
  { sku: 'P016', name: '牛角包', category: '烘焙食品', price: 8.0 },
];

const expiryFormats = [
  '2026-06-20',
  '2026/06/21',
  '06-22-2026',
  '2026年6月23日',
  '20260624',
  'Jun 25, 2026',
];

const shelfLocations = ['A区-生鲜柜1层', 'A区-生鲜柜2层', 'B区-冷柜', 'C区-端头架', 'D区-促销台', 'E区-角落货架'];

export function generateInventoryRecords(): InventoryRecord[] {
  const records: InventoryRecord[] = [];
  let id = 1;

  stores.forEach((store) => {
    products.forEach((product, prodIdx) => {
      const cat = categories.find((c) => c.categoryName === product.category);
      const shelfLife = cat?.typicalShelfLifeDays || 7;
      const expiryDays = Math.floor(Math.random() * shelfLife) + 1;
      const expiryDate = daysFromNow(expiryDays);
      const expiryFormat = expiryFormats[prodIdx % expiryFormats.length];

      const qty = Math.floor(Math.random() * 50) + 10;
      const hasShelfLocation = Math.random() > 0.2;

      records.push({
        id: `INV-${String(id).padStart(4, '0')}`,
        sku: product.sku,
        productName: product.name,
        category: product.category,
        storeId: store.storeId,
        storeName: store.storeName,
        quantity: qty,
        unitPrice: product.price,
        expiryDateRaw: expiryFormat,
        expiryDate: expiryDate,
        productionDate: daysAgo(shelfLife - expiryDays),
        shelfLifeDays: shelfLife,
        shelfLocation: hasShelfLocation ? shelfLocations[Math.floor(Math.random() * shelfLocations.length)] : undefined,
        inboundDate: daysAgo(Math.floor(Math.random() * 5) + 1),
      });
      id++;
    });
  });

  return records;
}

export function generateDiscountRecords(): DiscountRecord[] {
  const records: DiscountRecord[] = [];
  let id = 1;

  const discountProducts = products.filter((_, i) => i % 3 !== 2);

  stores.forEach((store, storeIdx) => {
    discountProducts.forEach((product, prodIdx) => {
      const cat = categories.find((c) => c.categoryName === product.category);
      void cat;

      const discountStartDaysAgo = Math.floor(Math.random() * 4) + 1;
      const discountEndDaysFromNow = Math.floor(Math.random() * 2);
      const discountStartDate = daysAgo(discountStartDaysAgo);
      const discountEndDate = daysFromNow(discountEndDaysFromNow);

      const discountTypes: Array<'percentage' | 'fixed' | 'buyXgetY'> = ['percentage', 'percentage', 'percentage', 'buyXgetY'];
      const discountType = discountTypes[Math.floor(Math.random() * discountTypes.length)];

      let discountRate = 0;
      let discountedPrice = product.price;
      let buyXgetYDetails;

      if (discountType === 'percentage') {
        discountRate = 0.15 + Math.random() * 0.4;
        discountedPrice = product.price * (1 - discountRate);
      } else if (discountType === 'buyXgetY') {
        buyXgetYDetails = { buy: 2, get: 1 };
        discountRate = 1 / 3;
        discountedPrice = product.price * (2 / 3);
      }

      const isStacked = Math.random() > 0.7;
      const sameDayDiscount = Math.random() > 0.85;

      records.push({
        id: `DIS-${String(id).padStart(4, '0')}`,
        sku: product.sku,
        productName: product.name,
        category: product.category,
        storeId: store.storeId,
        storeName: store.storeName,
        discountStartDate: sameDayDiscount ? daysFromNow(0) : discountStartDate,
        discountEndDate,
        discountRate,
        discountType,
        buyXgetYDetails,
        originalPrice: product.price,
        discountedPrice: Math.round(discountedPrice * 100) / 100,
        isStackedWithPromotion: isStacked,
        promotionName: isStacked ? (Math.random() > 0.5 ? '会员日额外9折' : '满减活动') : undefined,
        notes: sameDayDiscount ? '临期当天才贴折扣' : undefined,
        shelfLocationAtDiscount: shelfLocations[(storeIdx + prodIdx) % shelfLocations.length],
      });
      id++;
    });
  });

  return records;
}

export function generateSalesRecords(): SalesRecord[] {
  const records: SalesRecord[] = [];
  let id = 1;

  stores.forEach((store) => {
    products.forEach((product, _prodIdx) => {
      const hasDiscount = Math.random() > 0.3;
      const daysInRange = 7;

      for (let d = 0; d < daysInRange; d++) {
        const saleDate = daysAgo(daysInRange - d - 1);
        const baseQty = Math.floor(Math.random() * 8) + 1;
        const qty = hasDiscount ? Math.floor(baseQty * (1.5 + Math.random())) : baseQty;

        if (qty <= 0) continue;

        const discountApplied = hasDiscount && Math.random() > 0.3;
        const isBuyXgetY = discountApplied && Math.random() > 0.7;

        records.push({
          id: `SAL-${String(id).padStart(4, '0')}`,
          sku: product.sku,
          productName: product.name,
          category: product.category,
          storeId: store.storeId,
          storeName: store.storeName,
          saleDate,
          quantity: qty,
          unitPrice: product.price,
          discountApplied,
          discountRate: discountApplied ? 0.2 + Math.random() * 0.3 : undefined,
          promotionApplied: Math.random() > 0.8 ? '会员优惠' : undefined,
          isBuyXgetY,
        });
        id++;
      }
    });
  });

  return records;
}

export function generateLossRecords(): LossRecord[] {
  const records: LossRecord[] = [];
  let id = 1;

  const lossReasons = ['过期变质', '外观破损', '顾客退货', '运输损耗', '质量问题', undefined, undefined, undefined];

  stores.forEach((store, _storeIdx) => {
    products.forEach((product, _prodIdx) => {
      const cat = categories.find((c) => c.categoryName === product.category);
      const shelfLife = cat?.typicalShelfLifeDays || 7;
      const lossChance = 0.3 + (5 - shelfLife) * 0.05;

      if (Math.random() < lossChance) {
        const lossDate = daysAgo(Math.floor(Math.random() * 7));
        const qty = Math.floor(Math.random() * 10) + 2;
        const reason = lossReasons[Math.floor(Math.random() * lossReasons.length)];
        const daysBeforeExpiry = Math.floor(Math.random() * 3);
        const isExpiryRelated = !reason || reason === '过期变质';

        records.push({
          id: `LOS-${String(id).padStart(4, '0')}`,
          sku: product.sku,
          productName: product.name,
          category: product.category,
          storeId: store.storeId,
          storeName: store.storeName,
          lossDate,
          quantity: qty,
          unitCost: product.price * 0.6,
          lossReason: reason,
          lossReasonCategory: reason ? (isExpiryRelated ? '效期相关' : '其他') : undefined,
          isExpiryRelated,
          daysBeforeExpiry: isExpiryRelated ? daysBeforeExpiry : undefined,
          notes: !reason ? '报损原因未填写' : undefined,
        });
        id++;
      }
    });
  });

  return records;
}

export const mockInventory = generateInventoryRecords();
export const mockDiscounts = generateDiscountRecords();
export const mockSales = generateSalesRecords();
export const mockLosses = generateLossRecords();
