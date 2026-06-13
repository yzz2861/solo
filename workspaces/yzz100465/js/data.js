// ========== 数据模型与示例数据 ==========

// 门店信息
const storeData = [
    { id: 'store001', name: '朝阳大悦城店', address: '北京市朝阳区朝阳北路101号', type: '直营店' },
    { id: 'store002', name: '三里屯太古里店', address: '北京市朝阳区三里屯路19号', type: '直营店' },
    { id: 'store003', name: '五道口店', address: '北京市海淀区成府路28号', type: '加盟店' },
    { id: 'store004', name: '国贸店', address: '北京市朝阳区建国门外大街1号', type: '直营店' }
];

// 小料基础信息 - 含单位转换
const toppingData = [
    { id: 't001', name: '珍珠', category: '粉圆', unit: '克', costPerUnit: 0.015,
      unitConvert: { '份': 60, '勺': 30 }, safeStock: 50000, isNew: false },
    { id: 't002', name: '芋圆', category: '粉圆', unit: '克', costPerUnit: 0.025,
      unitConvert: { '份': 50, '勺': 25 }, safeStock: 30000, isNew: false },
    { id: 't003', name: '椰果', category: '果味', unit: '克', costPerUnit: 0.012,
      unitConvert: { '份': 50, '勺': 25 }, safeStock: 35000, isNew: false },
    { id: 't004', name: '布丁', category: '奶制品', unit: '克', costPerUnit: 0.03,
      unitConvert: { '份': 80, '勺': 40 }, safeStock: 25000, isNew: false },
    { id: 't005', name: '红豆', category: '粉圆', unit: '克', costPerUnit: 0.018,
      unitConvert: { '份': 40, '勺': 20 }, safeStock: 28000, isNew: false },
    { id: 't006', name: '仙草冻', category: '粉圆', unit: '克', costPerUnit: 0.02,
      unitConvert: { '份': 70, '勺': 35 }, safeStock: 20000, isNew: false },
    { id: 't007', name: '芝士奶盖', category: '奶制品', unit: '克', costPerUnit: 0.08,
      unitConvert: { '份': 50, '勺': 25 }, safeStock: 18000, isNew: false },
    { id: 't008', name: '脆波波', category: '果味', unit: '克', costPerUnit: 0.035,
      unitConvert: { '份': 40, '勺': 20 }, safeStock: 15000, isNew: true },
    { id: 't009', name: '抹茶冻', category: '粉圆', unit: '克', costPerUnit: 0.028,
      unitConvert: { '份': 60, '勺': 30 }, safeStock: 12000, isNew: true },
    { id: 't010', name: '乌龙茶汤', category: '茶底', unit: '克', costPerUnit: 0.008,
      unitConvert: { '杯': 250 }, safeStock: 200000, isNew: false },
    { id: 't011', name: '茉莉茶汤', category: '茶底', unit: '克', costPerUnit: 0.01,
      unitConvert: { '杯': 250 }, safeStock: 180000, isNew: false },
    { id: 't012', name: '青稞', category: '粉圆', unit: '克', costPerUnit: 0.022,
      unitConvert: { '份': 45, '勺': 22 }, safeStock: 12000, isNew: true }
];

// 饮品配方表
const formulaData = [
    {
        id: 'p001', name: '经典珍珠奶茶', price: 18, category: '奶茶', isNew: false,
        launchDate: '2023-01-15',
        baseFormula: [
            { toppingId: 't001', amount: 60, unit: '克' },
            { toppingId: 't010', amount: 250, unit: '克' },
            { toppingId: 't007', amount: 0, unit: '克' }
        ],
        variants: [
            { name: '正常糖', sugar: '正常', toppingAdjust: {} },
            { name: '半糖', sugar: '半糖', toppingAdjust: { 't001': -5 } },
            { name: '少糖', sugar: '少糖', toppingAdjust: { 't001': -10 } },
            { name: '无糖', sugar: '无糖', toppingAdjust: { 't001': -15 } }
        ]
    },
    {
        id: 'p002', name: '芋圆奶茶', price: 20, category: '奶茶', isNew: false,
        launchDate: '2023-03-20',
        baseFormula: [
            { toppingId: 't002', amount: 50, unit: '克' },
            { toppingId: 't010', amount: 250, unit: '克' }
        ],
        variants: [
            { name: '正常糖', sugar: '正常', toppingAdjust: {} },
            { name: '半糖', sugar: '半糖', toppingAdjust: { 't002': -5 } },
            { name: '少糖', sugar: '少糖', toppingAdjust: { 't002': -8 } }
        ]
    },
    {
        id: 'p003', name: '椰果茉莉茶', price: 16, category: '果茶', isNew: false,
        launchDate: '2023-02-10',
        baseFormula: [
            { toppingId: 't003', amount: 50, unit: '克' },
            { toppingId: 't011', amount: 250, unit: '克' }
        ],
        variants: [
            { name: '正常糖', sugar: '正常', toppingAdjust: {} },
            { name: '半糖', sugar: '半糖', toppingAdjust: {} },
            { name: '少糖', sugar: '少糖', toppingAdjust: {} }
        ]
    },
    {
        id: 'p004', name: '布丁奶茶', price: 19, category: '奶茶', isNew: false,
        launchDate: '2023-04-05',
        baseFormula: [
            { toppingId: 't004', amount: 80, unit: '克' },
            { toppingId: 't010', amount: 250, unit: '克' }
        ],
        variants: [
            { name: '正常糖', sugar: '正常', toppingAdjust: {} },
            { name: '半糖', sugar: '半糖', toppingAdjust: { 't004': -10 } }
        ]
    },
    {
        id: 'p005', name: '芝士奶盖茶', price: 22, category: '奶盖茶', isNew: false,
        launchDate: '2023-05-12',
        baseFormula: [
            { toppingId: 't007', amount: 50, unit: '克' },
            { toppingId: 't011', amount: 250, unit: '克' }
        ],
        variants: [
            { name: '正常糖', sugar: '正常', toppingAdjust: {} },
            { name: '少糖', sugar: '少糖', toppingAdjust: {} }
        ]
    },
    {
        id: 'p006', name: '脆波波葡萄冻', price: 24, category: '果茶', isNew: true,
        launchDate: '2024-01-15',
        baseFormula: [
            { toppingId: 't008', amount: 40, unit: '克' },
            { toppingId: 't006', amount: 50, unit: '克' },
            { toppingId: 't011', amount: 250, unit: '克' }
        ],
        variants: [
            { name: '正常糖', sugar: '正常', toppingAdjust: {} },
            { name: '半糖', sugar: '半糖', toppingAdjust: { 't008': -5 } }
        ]
    },
    {
        id: 'p007', name: '抹茶红豆拿铁', price: 25, category: '奶茶', isNew: true,
        launchDate: '2024-02-01',
        baseFormula: [
            { toppingId: 't009', amount: 60, unit: '克' },
            { toppingId: 't005', amount: 40, unit: '克' },
            { toppingId: 't010', amount: 200, unit: '克' }
        ],
        variants: [
            { name: '正常糖', sugar: '正常', toppingAdjust: {} },
            { name: '半糖', sugar: '半糖', toppingAdjust: { 't005': -8 } }
        ]
    },
    {
        id: 'p008', name: '青稞奶茶', price: 23, category: '奶茶', isNew: true,
        launchDate: '2024-02-20',
        baseFormula: [
            { toppingId: 't012', amount: 45, unit: '克' },
            { toppingId: 't001', amount: 30, unit: '克' },
            { toppingId: 't010', amount: 250, unit: '克' }
        ],
        variants: [
            { name: '正常糖', sugar: '正常', toppingAdjust: {} },
            { name: '半糖', sugar: '半糖', toppingAdjust: { 't001': -5 } }
        ]
    }
];

// 生成近7天的日期
function generateDateRange(days) {
    const dates = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

const dateRange7 = generateDateRange(7);
const dateRange30 = generateDateRange(30);

// 班次定义
const shifts = [
    { id: 'morning', name: '早班', time: '08:00-16:00' },
    { id: 'afternoon', name: '中班', time: '12:00-20:00' },
    { id: 'evening', name: '晚班', time: '16:00-24:00' }
];

// 生成销量数据（带随机波动，模拟真实业务）
function generateSalesData() {
    const sales = [];
    let saleId = 1;
    
    storeData.forEach(store => {
        dateRange7.forEach(date => {
            const dayOfWeek = new Date(date).getDay();
            const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.3 : 1;
            
            shifts.forEach(shift => {
                const shiftFactor = shift.id === 'afternoon' ? 1.2 : (shift.id === 'evening' ? 1.1 : 0.7);
                
                formulaData.forEach(product => {
                    const baseQty = product.isNew ? 8 : 25;
                    const storeFactor = store.id === 'store001' ? 1.2 : (store.id === 'store002' ? 1.1 : 0.9);
                    const quantity = Math.floor(baseQty * weekendFactor * shiftFactor * storeFactor * (0.8 + Math.random() * 0.4));
                    
                    if (quantity > 0) {
                        const variantIndex = Math.floor(Math.random() * product.variants.length);
                        const variant = product.variants[variantIndex];
                        
                        sales.push({
                            id: `s${String(saleId++).padStart(6, '0')}`,
                            storeId: store.id,
                            storeName: store.name,
                            date: date,
                            shiftId: shift.id,
                            shiftName: shift.name,
                            productId: product.id,
                            productName: product.name,
                            quantity: quantity,
                            variant: variant.name,
                            sugar: variant.sugar,
                            unitPrice: product.price,
                            totalAmount: quantity * product.price
                        });
                    }
                });
            });
        });
    });
    
    return sales;
}

// 仓库领用/入库数据
function generateInventoryData() {
    const inventory = [];
    let recordId = 1;
    
    storeData.forEach(store => {
        dateRange7.forEach((date, dateIndex) => {
            toppingData.forEach(topping => {
                if (dateIndex % 2 === 0 || topping.isNew) {
                    const baseAmount = topping.safeStock * 0.55;
                    const factor = 0.85 + Math.random() * 0.3;
                    const amount = Math.floor(baseAmount * factor / 500) * 500;
                    
                    if (amount > 0) {
                        inventory.push({
                            id: `inv${String(recordId++).padStart(6, '0')}`,
                            storeId: store.id,
                            storeName: store.name,
                            date: date,
                            toppingId: topping.id,
                            toppingName: topping.name,
                            type: '领用',
                            quantity: amount,
                            unit: topping.unit,
                            operator: '仓管员' + Math.floor(Math.random() * 3 + 1),
                            batchNo: 'B' + Date.now() + Math.floor(Math.random() * 1000)
                        });
                    }
                }
            });
        });
    });
    
    return inventory;
}

// 报废/损耗数据 - 包含正常报废、试饮、员工餐等
function generateWasteData() {
    const waste = [];
    let wasteId = 1;
    
    const wasteReasons = [
        { type: '正常报废', reason: '过期变质', proportion: 0.3, isSpecial: false },
        { type: '正常报废', reason: '制作失误', proportion: 0.25, isSpecial: false },
        { type: '正常报废', reason: '口感不佳', proportion: 0.1, isSpecial: false },
        { type: '试饮', reason: '新品推广试饮', proportion: 0.15, isSpecial: true },
        { type: '员工餐', reason: '员工福利', proportion: 0.15, isSpecial: true },
        { type: '其他', reason: '未知原因', proportion: 0.05, isSpecial: false }
    ];
    
    storeData.forEach(store => {
        dateRange7.forEach(date => {
            const dayOfWeek = new Date(date).getDay();
            const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 1;
            
            toppingData.forEach(topping => {
                if (Math.random() > 0.4) {
                    const baseWaste = 100 + Math.random() * 200;
                    const newProductFactor = topping.isNew ? 1.5 : 1;
                    
                    const rand = Math.random();
                    let cumProb = 0;
                    let selectedReason = wasteReasons[0];
                    for (const wr of wasteReasons) {
                        cumProb += wr.proportion;
                        if (rand <= cumProb) {
                            selectedReason = wr;
                            break;
                        }
                    }
                    
                    const quantity = Math.floor(baseWaste * weekendFactor * newProductFactor * (0.5 + Math.random()));
                    
                    if (quantity > 0) {
                        waste.push({
                            id: `w${String(wasteId++).padStart(6, '0')}`,
                            storeId: store.id,
                            storeName: store.name,
                            date: date,
                            toppingId: topping.id,
                            toppingName: topping.name,
                            quantity: quantity,
                            unit: topping.unit,
                            type: selectedReason.type,
                            reason: selectedReason.reason,
                            isSpecial: selectedReason.isSpecial,
                            operator: '店员' + Math.floor(Math.random() * 5 + 1),
                            shiftId: shifts[Math.floor(Math.random() * 3)].id,
                            shiftName: shifts[Math.floor(Math.random() * 3)].name
                        });
                    }
                }
            });
        });
    });
    
    return waste;
}

// 盘点数据（模拟每天打烊后的盘点）
function generateStockTakeData() {
    const stockTake = [];
    let stockId = 1;
    
    storeData.forEach(store => {
        let currentStock = {};
        toppingData.forEach(topping => {
            currentStock[topping.id] = Math.floor(topping.safeStock * (0.5 + Math.random() * 0.5));
        });
        
        dateRange7.forEach(date => {
            toppingData.forEach(topping => {
                currentStock[topping.id] = Math.max(0, currentStock[topping.id] + Math.floor(Math.random() * 2000 - 500));
                
                stockTake.push({
                    id: `st${String(stockId++).padStart(6, '0')}`,
                    storeId: store.id,
                    storeName: store.name,
                    date: date,
                    toppingId: topping.id,
                    toppingName: topping.name,
                    openingStock: Math.max(0, currentStock[topping.id] - 100 + Math.floor(Math.random() * 200)),
                    closingStock: currentStock[topping.id],
                    unit: topping.unit
                });
            });
        });
    });
    
    return stockTake;
}

// 初始化所有示例数据
let salesData = [];
let inventoryData = [];
let wasteData = [];
let stockTakeData = [];

function calcDailyTheoryByStore(sales, formulaList, stores, dates) {
    const result = {};
    stores.forEach(store => {
        result[store.id] = {};
        dates.forEach(date => {
            result[store.id][date] = {};
        });
    });
    
    sales.forEach(sale => {
        const formula = formulaList.find(f => f.id === sale.productId);
        if (!formula) return;
        
        formula.baseFormula.forEach(item => {
            const tId = item.toppingId;
            if (!result[sale.storeId][sale.date][tId]) {
                result[sale.storeId][sale.date][tId] = 0;
            }
            
            let adjustAmount = 0;
            if (sale.variant) {
                const variant = formula.variants.find(v => v.name === sale.variant);
                if (variant && variant.toppingAdjust && variant.toppingAdjust[tId]) {
                    adjustAmount = variant.toppingAdjust[tId];
                }
            }
            
            const grams = convertToGrams(item.amount + adjustAmount, item.unit, tId);
            result[sale.storeId][sale.date][tId] += grams * sale.quantity;
        });
    });
    
    return result;
}

function generateInventoryAndStock(theoryByStore, dates) {
    const inventory = [];
    const stockTake = [];
    let invId = 1;
    let stId = 1;
    
    Object.entries(theoryByStore).forEach(([storeId, dailyData]) => {
        const store = getStoreById(storeId);
        let currentStock = {};
        
        toppingData.forEach(topping => {
            currentStock[topping.id] = Math.floor(topping.safeStock * 0.6);
        });
        
        dates.forEach(date => {
            toppingData.forEach(topping => {
                const tId = topping.id;
                const theory = dailyData[date][tId] || 0;
                
                const wasteFactor = 0.05 + Math.random() * 0.1;
                const actualUsage = theory * (1 + wasteFactor);
                
                const openingStock = currentStock[tId];
                
                currentStock[tId] = Math.max(0, currentStock[tId] - actualUsage);
                
                if (currentStock[tId] < topping.safeStock * 0.3) {
                    const restockAmount = Math.floor(topping.safeStock * (0.5 + Math.random() * 0.2));
                    inventory.push({
                        id: `inv${String(invId++).padStart(6, '0')}`,
                        storeId: storeId,
                        storeName: store?.name || '',
                        date: date,
                        toppingId: tId,
                        toppingName: topping.name,
                        type: '领用',
                        quantity: restockAmount,
                        unit: topping.unit,
                        operator: '仓管员' + Math.floor(Math.random() * 3 + 1),
                        batchNo: 'B' + Date.now() + Math.floor(Math.random() * 1000)
                    });
                    currentStock[tId] += restockAmount;
                }
                
                stockTake.push({
                    id: `st${String(stId++).padStart(6, '0')}`,
                    storeId: storeId,
                    storeName: store?.name || '',
                    date: date,
                    toppingId: tId,
                    toppingName: topping.name,
                    openingStock: Math.floor(openingStock),
                    closingStock: Math.floor(currentStock[tId]),
                    unit: topping.unit
                });
            });
        });
    });
    
    return { inventory, stockTake };
}

function initSampleData() {
    salesData = generateSalesData();
    
    const theoryByStore = calcDailyTheoryByStore(salesData, formulaData, storeData, dateRange7);
    
    const { inventory, stockTake } = generateInventoryAndStock(theoryByStore, dateRange7);
    inventoryData = inventory;
    stockTakeData = stockTake;
    wasteData = generateWasteData();
    
    console.log('示例数据已加载');
    console.log(`销量记录: ${salesData.length} 条`);
    console.log(`领用记录: ${inventoryData.length} 条`);
    console.log(`报废记录: ${wasteData.length} 条`);
    console.log(`盘点记录: ${stockTakeData.length} 条`);
}

// 工具函数：获取小料信息
function getToppingById(id) {
    return toppingData.find(t => t.id === id);
}

// 工具函数：获取饮品配方
function getFormulaById(id) {
    return formulaData.find(p => p.id === id);
}

// 工具函数：获取门店信息
function getStoreById(id) {
    return storeData.find(s => s.id === id);
}

// 单位转换：统一转为克
function convertToGrams(amount, unit, toppingId) {
    const topping = getToppingById(toppingId);
    if (!topping || unit === '克') return amount;
    if (topping.unitConvert && topping.unitConvert[unit]) {
        return amount * topping.unitConvert[unit];
    }
    return amount;
}
