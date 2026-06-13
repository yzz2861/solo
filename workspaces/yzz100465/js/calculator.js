// ========== 损耗计算引擎 ==========

// 计算理论用量 - 根据销量和配方
function calculateTheoryUsage(salesRecords, formulaList, dateRange, storeId = 'all', category = 'all') {
    const usageMap = {};
    
    const filteredSales = salesRecords.filter(sale => {
        const inDate = dateRange.includes(sale.date);
        const inStore = storeId === 'all' || sale.storeId === storeId;
        return inDate && inStore;
    });
    
    filteredSales.forEach(sale => {
        const formula = formulaList.find(f => f.id === sale.productId);
        if (!formula) return;
        
        if (category !== 'all') {
            const firstTopping = formula.baseFormula[0];
            const topping = getToppingById(firstTopping.toppingId);
            if (!topping || topping.category !== category) return;
        }
        
        formula.baseFormula.forEach(item => {
            const toppingId = item.toppingId;
            if (!usageMap[toppingId]) {
                usageMap[toppingId] = {
                    toppingId,
                    toppingName: getToppingById(toppingId)?.name || '',
                    category: getToppingById(toppingId)?.category || '',
                    theoryGrams: 0,
                    theoryCost: 0
                };
            }
            
            let adjustAmount = 0;
            if (sale.variant) {
                const variant = formula.variants.find(v => v.name === sale.variant);
                if (variant && variant.toppingAdjust && variant.toppingAdjust[toppingId]) {
                    adjustAmount = variant.toppingAdjust[toppingId];
                }
            }
            
            const grams = convertToGrams(item.amount + adjustAmount, item.unit, toppingId);
            const totalGrams = grams * sale.quantity;
            usageMap[toppingId].theoryGrams += totalGrams;
            
            const topping = getToppingById(toppingId);
            if (topping) {
                usageMap[toppingId].theoryCost += totalGrams * topping.costPerUnit;
            }
        });
    });
    
    return Object.values(usageMap);
}

// 按日期计算理论用量（用于趋势图）
function calculateTheoryUsageByDate(salesRecords, formulaList, dateRange, storeId = 'all', toppingId = 'all') {
    const result = {};
    dateRange.forEach(date => {
        result[date] = {};
    });
    
    const filteredSales = salesRecords.filter(sale => {
        const inDate = dateRange.includes(sale.date);
        const inStore = storeId === 'all' || sale.storeId === storeId;
        return inDate && inStore;
    });
    
    filteredSales.forEach(sale => {
        const formula = formulaList.find(f => f.id === sale.productId);
        if (!formula) return;
        
        formula.baseFormula.forEach(item => {
            const tId = item.toppingId;
            if (toppingId !== 'all' && tId !== toppingId) return;
            
            if (!result[sale.date][tId]) {
                result[sale.date][tId] = 0;
            }
            
            let adjustAmount = 0;
            if (sale.variant) {
                const variant = formula.variants.find(v => v.name === sale.variant);
                if (variant && variant.toppingAdjust && variant.toppingAdjust[tId]) {
                    adjustAmount = variant.toppingAdjust[tId];
                }
            }
            
            const grams = convertToGrams(item.amount + adjustAmount, item.unit, tId);
            result[sale.date][tId] += grams * sale.quantity;
        });
    });
    
    return result;
}

// 计算实际耗用 = 领用 - 报废(特殊损耗单独统计) - 库存变化
function calculateActualUsage(inventoryRecords, wasteRecords, stockTakeRecords, dateRange, storeId = 'all') {
    const usageMap = {};
    const specialLossMap = {};
    
    const filteredInventory = inventoryRecords.filter(r => {
        return dateRange.includes(r.date) && (storeId === 'all' || r.storeId === storeId);
    });
    
    const filteredWaste = wasteRecords.filter(r => {
        return dateRange.includes(r.date) && (storeId === 'all' || r.storeId === storeId);
    });
    
    const filteredStock = stockTakeRecords.filter(r => {
        return dateRange.includes(r.date) && (storeId === 'all' || r.storeId === storeId);
    });
    
    filteredInventory.forEach(record => {
        const tId = record.toppingId;
        if (!usageMap[tId]) {
            const topping = getToppingById(tId);
            usageMap[tId] = {
                toppingId: tId,
                toppingName: topping?.name || '',
                category: topping?.category || '',
                receivedGrams: 0,
                wasteGrams: 0,
                specialLossGrams: 0,
                stockChange: 0,
                actualGrams: 0,
                actualCost: 0
            };
        }
        const grams = convertToGrams(record.quantity, record.unit, tId);
        usageMap[tId].receivedGrams += grams;
    });
    
    filteredWaste.forEach(record => {
        const tId = record.toppingId;
        if (!usageMap[tId]) {
            const topping = getToppingById(tId);
            usageMap[tId] = {
                toppingId: tId,
                toppingName: topping?.name || '',
                category: topping?.category || '',
                receivedGrams: 0,
                wasteGrams: 0,
                specialLossGrams: 0,
                stockChange: 0,
                actualGrams: 0,
                actualCost: 0
            };
        }
        const grams = convertToGrams(record.quantity, record.unit, tId);
        
        if (record.isSpecial) {
            usageMap[tId].specialLossGrams += grams;
            
            if (!specialLossMap[tId]) {
                specialLossMap[tId] = {
                    toppingId: tId,
                    toppingName: getToppingById(tId)?.name || '',
                    totalGrams: 0,
                    records: []
                };
            }
            specialLossMap[tId].totalGrams += grams;
            specialLossMap[tId].records.push(record);
        } else {
            usageMap[tId].wasteGrams += grams;
        }
    });
    
    const stockByTopping = {};
    filteredStock.forEach(record => {
        const tId = record.toppingId;
        if (!stockByTopping[tId]) {
            stockByTopping[tId] = { opening: [], closing: [] };
        }
        if (record.date === dateRange[0]) {
            stockByTopping[tId].opening.push(record.openingStock);
        }
        if (record.date === dateRange[dateRange.length - 1]) {
            stockByTopping[tId].closing.push(record.closingStock);
        }
    });
    
    Object.entries(stockByTopping).forEach(([tId, stocks]) => {
        const avgOpening = stocks.opening.length > 0 ? stocks.opening.reduce((a, b) => a + b, 0) / stocks.opening.length : 0;
        const avgClosing = stocks.closing.length > 0 ? stocks.closing.reduce((a, b) => a + b, 0) / stocks.closing.length : 0;
        
        if (!usageMap[tId]) {
            const topping = getToppingById(tId);
            usageMap[tId] = {
                toppingId: tId,
                toppingName: topping?.name || '',
                category: topping?.category || '',
                receivedGrams: 0,
                wasteGrams: 0,
                specialLossGrams: 0,
                stockChange: 0,
                actualGrams: 0,
                actualCost: 0
            };
        }
        usageMap[tId].stockChange = avgOpening - avgClosing;
    });
    
    Object.values(usageMap).forEach(item => {
        item.actualGrams = item.receivedGrams - item.wasteGrams - item.specialLossGrams + item.stockChange;
        item.actualGrams = Math.max(0, item.actualGrams);
        
        const topping = getToppingById(item.toppingId);
        if (topping) {
            item.actualCost = item.actualGrams * topping.costPerUnit;
        }
    });
    
    return { usageMap: Object.values(usageMap), specialLossMap: Object.values(specialLossMap) };
}

// 计算损耗差异分析
function calculateLossAnalysis(theoryUsage, actualUsage) {
    const analysisMap = {};
    
    theoryUsage.forEach(item => {
        analysisMap[item.toppingId] = {
            toppingId: item.toppingId,
            toppingName: item.toppingName,
            category: item.category,
            theoryGrams: item.theoryGrams,
            theoryCost: item.theoryCost,
            actualGrams: 0,
            actualCost: 0,
            diffGrams: 0,
            diffCost: 0,
            diffRate: 0,
            status: 'normal'
        };
    });
    
    actualUsage.forEach(item => {
        if (!analysisMap[item.toppingId]) {
            analysisMap[item.toppingId] = {
                toppingId: item.toppingId,
                toppingName: item.toppingName,
                category: item.category,
                theoryGrams: 0,
                theoryCost: 0,
                actualGrams: 0,
                actualCost: 0,
                diffGrams: 0,
                diffCost: 0,
                diffRate: 0,
                status: 'normal'
            };
        }
        analysisMap[item.toppingId].actualGrams = item.actualGrams;
        analysisMap[item.toppingId].actualCost = item.actualCost;
        analysisMap[item.toppingId].receivedGrams = item.receivedGrams;
        analysisMap[item.toppingId].wasteGrams = item.wasteGrams;
        analysisMap[item.toppingId].specialLossGrams = item.specialLossGrams;
        analysisMap[item.toppingId].stockChange = item.stockChange;
    });
    
    Object.values(analysisMap).forEach(item => {
        item.diffGrams = item.actualGrams - item.theoryGrams;
        item.diffCost = item.actualCost - item.theoryCost;
        
        if (item.theoryGrams > 0) {
            item.diffRate = (item.diffGrams / item.theoryGrams) * 100;
        }
        
        if (item.diffRate > 15) {
            item.status = 'warning';
        } else if (item.diffRate > 25) {
            item.status = 'danger';
        } else if (item.diffRate < -10) {
            item.status = 'under';
        } else {
            item.status = 'normal';
        }
    });
    
    return Object.values(analysisMap).sort((a, b) => b.diffRate - a.diffRate);
}

// 按班次计算损耗
function calculateLossByShift(salesRecords, wasteRecords, formulaList, dateRange, storeId = 'all') {
    const shiftData = {};
    
    shifts.forEach(shift => {
        shiftData[shift.id] = {
            shiftId: shift.id,
            shiftName: shift.name,
            theoryGrams: 0,
            wasteGrams: 0,
            specialLossGrams: 0,
            abnormal: false
        };
    });
    
    const filteredSales = salesRecords.filter(s => {
        return dateRange.includes(s.date) && (storeId === 'all' || s.storeId === storeId);
    });
    
    const filteredWaste = wasteRecords.filter(w => {
        return dateRange.includes(w.date) && (storeId === 'all' || w.storeId === storeId);
    });
    
    filteredSales.forEach(sale => {
        const formula = formulaList.find(f => f.id === sale.productId);
        if (!formula) return;
        
        let totalGrams = 0;
        formula.baseFormula.forEach(item => {
            const grams = convertToGrams(item.amount, item.unit, item.toppingId);
            totalGrams += grams * sale.quantity;
        });
        
        if (shiftData[sale.shiftId]) {
            shiftData[sale.shiftId].theoryGrams += totalGrams;
        }
    });
    
    filteredWaste.forEach(waste => {
        const grams = convertToGrams(waste.quantity, waste.unit, waste.toppingId);
        if (shiftData[waste.shiftId]) {
            if (waste.isSpecial) {
                shiftData[waste.shiftId].specialLossGrams += grams;
            } else {
                shiftData[waste.shiftId].wasteGrams += grams;
            }
        }
    });
    
    const avgWasteRate = Object.values(shiftData).reduce((sum, s) => {
        if (s.theoryGrams > 0) return sum + (s.wasteGrams / s.theoryGrams);
        return sum;
    }, 0) / Object.values(shiftData).length;
    
    Object.values(shiftData).forEach(s => {
        if (s.theoryGrams > 0) {
            const wasteRate = s.wasteGrams / s.theoryGrams;
            s.wasteRate = wasteRate * 100;
            s.abnormal = wasteRate > avgWasteRate * 1.5;
        } else {
            s.wasteRate = 0;
            s.abnormal = false;
        }
    });
    
    return Object.values(shiftData);
}

// 计算损耗原因分布
function calculateWasteReasonDistribution(wasteRecords, dateRange, storeId = 'all') {
    const reasonMap = {};
    
    const filtered = wasteRecords.filter(w => {
        return dateRange.includes(w.date) && (storeId === 'all' || w.storeId === storeId);
    });
    
    filtered.forEach(waste => {
        const key = waste.type + '-' + waste.reason;
        if (!reasonMap[key]) {
            reasonMap[key] = {
                type: waste.type,
                reason: waste.reason,
                totalGrams: 0,
                count: 0,
                isSpecial: waste.isSpecial
            };
        }
        const grams = convertToGrams(waste.quantity, waste.unit, waste.toppingId);
        reasonMap[key].totalGrams += grams;
        reasonMap[key].count += 1;
    });
    
    return Object.values(reasonMap).sort((a, b) => b.totalGrams - a.totalGrams);
}

// 按门店计算损耗排行
function calculateStoreLossRank(salesRecords, inventoryRecords, wasteRecords, formulaList, dateRange) {
    const storeLossMap = {};
    
    storeData.forEach(store => {
        storeLossMap[store.id] = {
            storeId: store.id,
            storeName: store.name,
            theoryCost: 0,
            actualCost: 0,
            diffCost: 0,
            lossRate: 0
        };
    });
    
    storeData.forEach(store => {
        const theory = calculateTheoryUsage(salesRecords, formulaList, dateRange, store.id);
        const actual = calculateActualUsage(inventoryRecords, wasteRecords, stockTakeData, dateRange, store.id);
        const analysis = calculateLossAnalysis(theory, actual.usageMap);
        
        analysis.forEach(item => {
            storeLossMap[store.id].theoryCost += item.theoryCost;
            storeLossMap[store.id].actualCost += item.actualCost;
            storeLossMap[store.id].diffCost += item.diffCost;
        });
        
        if (storeLossMap[store.id].theoryCost > 0) {
            storeLossMap[store.id].lossRate = (storeLossMap[store.id].diffCost / storeLossMap[store.id].theoryCost) * 100;
        }
    });
    
    return Object.values(storeLossMap).sort((a, b) => b.lossRate - a.lossRate);
}

// 计算补货建议
function calculateRestockAdvice(stockTakeRecords, inventoryRecords, dateRange, storeId = 'all') {
    const advice = [];
    const days = dateRange.length;
    
    const currentStock = {};
    const lastDate = dateRange[dateRange.length - 1];
    
    stockTakeRecords.filter(r => r.date === lastDate && (storeId === 'all' || r.storeId === storeId))
        .forEach(r => {
            if (!currentStock[r.toppingId]) {
                currentStock[r.toppingId] = { stock: 0, stores: 0 };
            }
            currentStock[r.toppingId].stock += r.closingStock;
            currentStock[r.toppingId].stores += 1;
        });
    
    const dailyUsage = {};
    inventoryRecords.filter(r => dateRange.includes(r.date) && (storeId === 'all' || r.storeId === storeId))
        .forEach(r => {
            if (!dailyUsage[r.toppingId]) {
                dailyUsage[r.toppingId] = 0;
            }
            dailyUsage[r.toppingId] += r.quantity;
        });
    
    Object.entries(currentStock).forEach(([tId, data]) => {
        const topping = getToppingById(tId);
        if (!topping) return;
        
        const avgDaily = (dailyUsage[tId] || 0) / days;
        const avgStock = data.stock / data.stores;
        const daysLeft = avgDaily > 0 ? avgStock / avgDaily : 999;
        
        if (daysLeft < 3) {
            advice.push({
                toppingId: tId,
                toppingName: topping.name,
                currentStock: Math.floor(avgStock),
                dailyUsage: Math.floor(avgDaily),
                daysLeft: daysLeft.toFixed(1),
                suggestAmount: Math.floor(topping.safeStock * 0.8),
                urgency: daysLeft < 1 ? 'urgent' : 'warning'
            });
        }
    });
    
    return advice.sort((a, b) => parseFloat(a.daysLeft) - parseFloat(b.daysLeft));
}

// 计算浪费预警
function calculateWasteAlerts(lossAnalysis, wasteRecords, dateRange, storeId = 'all') {
    const alerts = [];
    
    lossAnalysis.filter(item => item.status === 'warning' || item.status === 'danger')
        .forEach(item => {
            alerts.push({
                type: '损耗过高',
                toppingName: item.toppingName,
                description: `${item.toppingName}损耗率达${item.diffRate.toFixed(1)}%，超出正常范围`,
                diffGrams: Math.floor(item.diffGrams),
                severity: item.status
            });
        });
    
    const reasonDist = calculateWasteReasonDistribution(wasteRecords, dateRange, storeId);
    const unknownReasons = reasonDist.filter(r => r.reason === '未知原因');
    unknownReasons.forEach(r => {
        alerts.push({
            type: '原因不明',
            toppingName: '多种小料',
            description: `存在${r.count}笔无原因报废记录，共${Math.floor(r.totalGrams)}克`,
            diffGrams: Math.floor(r.totalGrams),
            severity: 'warning'
        });
    });
    
    return alerts;
}

// 新品复盘分析
function calculateNewProductAnalysis(salesRecords, wasteRecords, formulaList, dateRange, storeId = 'all') {
    const newProducts = formulaList.filter(p => p.isNew);
    const analysis = [];
    
    newProducts.forEach(product => {
        const productSales = salesRecords.filter(s => 
            s.productId === product.id && 
            dateRange.includes(s.date) && 
            (storeId === 'all' || s.storeId === storeId)
        );
        
        const totalQty = productSales.reduce((sum, s) => sum + s.quantity, 0);
        const totalRevenue = productSales.reduce((sum, s) => sum + s.totalAmount, 0);
        
        let theoryCost = 0;
        let totalGrams = 0;
        product.baseFormula.forEach(item => {
            const grams = convertToGrams(item.amount, item.unit, item.toppingId);
            totalGrams += grams;
            const topping = getToppingById(item.toppingId);
            if (topping) {
                theoryCost += grams * topping.costPerUnit;
            }
        });
        
        const theoryPerCup = theoryCost;
        
        const relatedWaste = wasteRecords.filter(w => {
            const relatedToppings = product.baseFormula.map(f => f.toppingId);
            return relatedToppings.includes(w.toppingId) && 
                   dateRange.includes(w.date) && 
                   (storeId === 'all' || w.storeId === storeId) &&
                   !w.isSpecial;
        });
        
        const wasteCost = relatedWaste.reduce((sum, w) => {
            const topping = getToppingById(w.toppingId);
            const grams = convertToGrams(w.quantity, w.unit, w.toppingId);
            return sum + grams * (topping?.costPerUnit || 0);
        }, 0);
        
        const newProductRatio = totalQty > 0 ? 0.3 : 0;
        const allocatedWasteCost = wasteCost * newProductRatio;
        const actualPerCup = totalQty > 0 ? theoryPerCup + (allocatedWasteCost / totalQty) : theoryPerCup;
        
        const deviation = totalQty > 0 ? ((actualPerCup - theoryPerCup) / theoryPerCup) * 100 : 0;
        
        let status = 'normal';
        let suggestion = '表现正常';
        if (deviation > 15) {
            status = 'warning';
            suggestion = '建议核查配方标准操作';
        } else if (deviation > 25) {
            status = 'danger';
            suggestion = '配方可能需调整，考虑增加分量';
        } else if (deviation < -10) {
            status = 'under';
            suggestion = '实际用量偏少，检查是否偷工减料';
        }
        
        analysis.push({
            productId: product.id,
            productName: product.name,
            launchDate: product.launchDate,
            totalQty,
            totalRevenue,
            theoryPerCup: theoryPerCup.toFixed(2),
            actualPerCup: actualPerCup.toFixed(2),
            deviation: deviation.toFixed(1),
            status,
            suggestion
        });
    });
    
    return analysis.sort((a, b) => parseFloat(b.deviation) - parseFloat(a.deviation));
}

// 配方变体分析（半糖等对成本的影响）
function calculateFormulaVariantAnalysis(salesRecords, formulaList, dateRange, storeId = 'all') {
    const analysis = [];
    
    formulaList.forEach(product => {
        if (product.variants.length <= 1) return;
        
        const productSales = salesRecords.filter(s => 
            s.productId === product.id && 
            dateRange.includes(s.date) && 
            (storeId === 'all' || s.storeId === storeId)
        );
        
        const totalQty = productSales.reduce((sum, s) => sum + s.quantity, 0);
        if (totalQty === 0) return;
        
        product.variants.forEach(variant => {
            const variantSales = productSales.filter(s => s.variant === variant.name);
            const variantQty = variantSales.reduce((sum, s) => sum + s.quantity, 0);
            const ratio = totalQty > 0 ? (variantQty / totalQty) * 100 : 0;
            
            let toppingDiff = '';
            let costImpact = 0;
            
            if (variant.toppingAdjust && Object.keys(variant.toppingAdjust).length > 0) {
                const diffs = [];
                Object.entries(variant.toppingAdjust).forEach(([tId, adjust]) => {
                    const topping = getToppingById(tId);
                    if (topping) {
                        diffs.push(`${topping.name} ${adjust > 0 ? '+' : ''}${adjust}克`);
                        costImpact += adjust * topping.costPerUnit;
                    }
                });
                toppingDiff = diffs.join('、');
            } else {
                toppingDiff = '无变化';
            }
            
            analysis.push({
                productName: product.name,
                variantName: variant.name,
                ratio: ratio.toFixed(1) + '%',
                toppingDiff,
                costImpact: costImpact.toFixed(3) + '元/杯'
            });
        });
    });
    
    return analysis;
}

// 汇总计算 - 店长视图数据
function getManagerViewData(dateRange, storeId = 'all') {
    const theory = calculateTheoryUsage(salesData, formulaData, dateRange, storeId);
    const actual = calculateActualUsage(inventoryData, wasteData, stockTakeData, dateRange, storeId);
    const analysis = calculateLossAnalysis(theory, actual.usageMap);
    const shiftData = calculateLossByShift(salesData, wasteData, formulaData, dateRange, storeId);
    const reasonDist = calculateWasteReasonDistribution(wasteData, dateRange, storeId);
    const theoryByDate = calculateTheoryUsageByDate(salesData, formulaData, dateRange, storeId);
    
    const totalTheory = theory.reduce((sum, t) => sum + t.theoryGrams, 0);
    const totalActual = actual.usageMap.reduce((sum, t) => sum + t.actualGrams, 0);
    const totalDiff = totalActual - totalTheory;
    const diffRate = totalTheory > 0 ? (totalDiff / totalTheory) * 100 : 0;
    const abnormalCount = shiftData.filter(s => s.abnormal).length;
    
    return {
        totalTheory,
        totalActual,
        totalDiff,
        diffRate,
        abnormalCount,
        analysis,
        shiftData,
        reasonDist,
        theoryByDate,
        specialLossRecords: actual.specialLossMap,
        wasteRecords: wasteData.filter(w => dateRange.includes(w.date) && (storeId === 'all' || w.storeId === storeId))
    };
}

// 汇总计算 - 老板视图数据
function getBossViewData(dateRange, storeId = 'all') {
    const theory = calculateTheoryUsage(salesData, formulaData, dateRange, storeId);
    const actual = calculateActualUsage(inventoryData, wasteData, stockTakeData, dateRange, storeId);
    const analysis = calculateLossAnalysis(theory, actual.usageMap);
    const storeRank = calculateStoreLossRank(salesData, inventoryData, wasteData, formulaData, dateRange);
    const restockAdvice = calculateRestockAdvice(stockTakeData, inventoryData, dateRange, storeId);
    const wasteAlerts = calculateWasteAlerts(analysis, wasteData, dateRange, storeId);
    
    const filteredSales = salesData.filter(s => dateRange.includes(s.date) && (storeId === 'all' || s.storeId === storeId));
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalTheoryCost = theory.reduce((sum, t) => sum + t.theoryCost, 0);
    const totalDiffCost = analysis.reduce((sum, a) => sum + a.diffCost, 0);
    const lossRate = totalTheoryCost > 0 ? (totalDiffCost / totalTheoryCost) * 100 : 0;
    
    const highestLoss = analysis.length > 0 ? analysis[0] : null;
    const bestStore = [...storeRank].sort((a, b) => a.lossRate - b.lossRate)[0];
    
    return {
        totalRevenue,
        totalTheoryCost,
        totalDiffCost,
        lossRate,
        restockCount: restockAdvice.length,
        storeRank,
        restockAdvice,
        wasteAlerts,
        highestLossTopping: highestLoss?.toppingName || '-',
        bestStore: bestStore?.storeName || '-',
        pendingShifts: wasteAlerts.filter(a => a.severity === 'danger').length
    };
}

// 汇总计算 - 总部视图数据
function getHeadquartersViewData(dateRange, storeId = 'all') {
    const newProductAnalysis = calculateNewProductAnalysis(salesData, wasteData, formulaData, dateRange, storeId);
    const variantAnalysis = calculateFormulaVariantAnalysis(salesData, formulaData, dateRange, storeId);
    
    const totalProducts = formulaData.length;
    const newProductCount = formulaData.filter(p => p.isNew).length;
    
    const filteredSales = salesData.filter(s => dateRange.includes(s.date) && (storeId === 'all' || s.storeId === storeId));
    const totalSalesQty = filteredSales.reduce((sum, s) => sum + s.quantity, 0);
    const newProductSales = filteredSales.filter(s => {
        const product = formulaData.find(p => p.id === s.productId);
        return product?.isNew;
    }).reduce((sum, s) => sum + s.quantity, 0);
    const newProductRate = totalSalesQty > 0 ? (newProductSales / totalSalesQty) * 100 : 0;
    
    const avgNewLoss = newProductAnalysis.reduce((sum, p) => sum + parseFloat(p.deviation), 0) / (newProductAnalysis.length || 1);
    const needOptimize = newProductAnalysis.filter(p => p.status === 'warning' || p.status === 'danger').length;
    
    return {
        totalProducts,
        newProductCount,
        newProductRate: newProductRate.toFixed(1),
        avgNewLoss: avgNewLoss.toFixed(1),
        needOptimize,
        newProductAnalysis,
        variantAnalysis
    };
}
