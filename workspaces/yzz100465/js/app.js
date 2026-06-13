// ========== 主应用逻辑 ==========

let currentView = 'manager';
let currentDateRange = [];
let currentStore = 'all';
let currentCategory = 'all';
let currentTopping = 'all';

function initApp() {
    initSampleData();
    initDateRange();
    initStoreSelect();
    initToppingFilter();
    bindEvents();
    initCharts();
    renderAll();
}

function initDateRange() {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 6);
    
    document.getElementById('dateSelect').value = lastWeek.toISOString().split('T')[0];
    currentDateRange = generateDateRange(7);
    updateReportDateRange();
}

function updateReportDateRange() {
    const rangeEl = document.getElementById('reportDateRange');
    if (rangeEl && currentDateRange.length > 0) {
        rangeEl.textContent = `${currentDateRange[0]} 至 ${currentDateRange[currentDateRange.length - 1]}`;
    }
}

function initStoreSelect() {
    const select = document.getElementById('storeSelect');
    storeData.forEach(store => {
        const option = document.createElement('option');
        option.value = store.id;
        option.textContent = store.name;
        select.appendChild(option);
    });
}

function initToppingFilter() {
    const select = document.getElementById('toppingFilter');
    toppingData.forEach(topping => {
        const option = document.createElement('option');
        option.value = topping.id;
        option.textContent = topping.name;
        select.appendChild(option);
    });
}

function bindEvents() {
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchView(btn.dataset.role);
        });
    });
    
    document.querySelectorAll('.quick-date-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.quick-date-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const days = parseInt(btn.dataset.days);
            if (days === 0) {
                currentDateRange = generateDateRange(1);
            } else if (days === -1) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                currentDateRange = [yesterday.toISOString().split('T')[0]];
            } else {
                currentDateRange = generateDateRange(Math.abs(days));
            }
            updateReportDateRange();
            renderAll();
        });
    });
    
    document.getElementById('storeSelect').addEventListener('change', (e) => {
        currentStore = e.target.value;
        renderAll();
    });
    
    document.getElementById('toppingFilter').addEventListener('change', (e) => {
        currentTopping = e.target.value;
        renderAll();
    });
    
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        currentCategory = e.target.value;
        renderToppingDetailTable();
    });
    
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importModal').classList.add('active');
    });
    
    document.querySelectorAll('.import-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchImportTab(tabName);
        });
    });
    
    document.querySelectorAll('.file-upload-area').forEach(area => {
        const type = area.dataset.type;
        const input = area.querySelector('.file-input');
        
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(type, e.target.files[0]);
            }
        });
    });
    
    document.getElementById('dateSelect').addEventListener('change', (e) => {
        const date = e.target.value;
        if (date) {
            currentDateRange = [date];
            updateReportDateRange();
            renderAll();
        }
    });
}

function switchView(view) {
    currentView = view;
    
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.role === view);
    });
    
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });
    document.getElementById(view + 'View').classList.add('active');
    
    renderAll();
}

function switchImportTab(tabName) {
    document.querySelectorAll('.import-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.import-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById('tab-' + tabName).classList.add('active');
}

function closeModal() {
    document.getElementById('importModal').classList.remove('active');
}

function loadSampleData(type) {
    console.log(`加载${type}示例数据`);
    alert(`${type} 示例数据加载成功！`);
    closeModal();
    renderAll();
}

function handleFileUpload(type, file) {
    console.log(`上传${type}数据:`, file.name);
    alert(`文件 ${file.name} 上传成功！\n（演示模式，实际使用需对接后端）`);
}

function confirmImport() {
    alert('数据导入成功！');
    closeModal();
    renderAll();
}

function renderAll() {
    if (currentView === 'manager') {
        renderManagerView();
    } else if (currentView === 'boss') {
        renderBossView();
    } else if (currentView === 'headquarters') {
        renderHeadquartersView();
    }
}

function renderManagerView() {
    const data = getManagerViewData(currentDateRange, currentStore);
    
    document.getElementById('theoryUsage').textContent = formatNumber(data.totalTheory);
    document.getElementById('actualUsage').textContent = formatNumber(data.totalActual);
    document.getElementById('diffUsage').textContent = formatNumber(data.totalDiff);
    
    const diffRateEl = document.getElementById('diffRate');
    diffRateEl.textContent = `差异率 ${data.diffRate.toFixed(2)}%`;
    if (data.diffRate > 15) {
        diffRateEl.style.color = 'var(--color-danger)';
    } else if (data.diffRate > 8) {
        diffRateEl.style.color = 'var(--color-warning)';
    } else {
        diffRateEl.style.color = 'var(--color-success)';
    }
    
    document.getElementById('abnormalShifts').textContent = data.abnormalCount;
    
    const actualByDate = {};
    currentDateRange.forEach(date => {
        actualByDate[date] = data.totalActual / currentDateRange.length * (0.9 + Math.random() * 0.2);
    });
    
    updateTrendChart(currentDateRange, data.theoryByDate, actualByDate);
    updateCompareChart(data.analysis);
    updateShiftChart(data.shiftData);
    updateReasonChart(data.reasonDist);
    
    renderToppingDetailTable();
    renderSpecialLossTable(data.wasteRecords);
}

function renderToppingDetailTable() {
    const data = getManagerViewData(currentDateRange, currentStore);
    let analysis = data.analysis;
    
    if (currentCategory !== 'all') {
        analysis = analysis.filter(a => a.category === currentCategory);
    }
    
    const tbody = document.querySelector('#toppingDetailTable tbody');
    tbody.innerHTML = '';
    
    analysis.forEach(item => {
        const row = document.createElement('tr');
        
        let statusText = '正常';
        let statusClass = 'normal';
        if (item.status === 'warning') {
            statusText = '偏高';
            statusClass = 'warning';
        } else if (item.status === 'danger') {
            statusText = '过高';
            statusClass = 'danger';
        } else if (item.status === 'under') {
            statusText = '偏低';
            statusClass = 'under';
        }
        
        row.innerHTML = `
            <td>${item.toppingName}</td>
            <td>${item.category || '-'}</td>
            <td>${formatNumber(item.theoryGrams)}克</td>
            <td>${formatNumber(item.actualGrams)}克</td>
            <td style="color: ${item.diffGrams >= 0 ? 'var(--color-danger)' : 'var(--color-success)'}">
                ${item.diffGrams >= 0 ? '+' : ''}${formatNumber(item.diffGrams)}克
            </td>
            <td style="color: ${item.diffRate >= 0 ? 'var(--color-danger)' : 'var(--color-success)'}">
                ${item.diffRate >= 0 ? '+' : ''}${item.diffRate.toFixed(2)}%
            </td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        `;
        tbody.appendChild(row);
    });
    
    if (analysis.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">暂无数据</td></tr>';
    }
}

function renderSpecialLossTable(wasteRecords) {
    const specialRecords = wasteRecords.filter(w => w.isSpecial);
    const tbody = document.querySelector('#specialLossTable tbody');
    tbody.innerHTML = '';
    
    specialRecords.slice(0, 20).forEach(record => {
        const row = document.createElement('tr');
        const typeClass = record.type === '试饮' ? 'badge-info' : 'badge-success';
        
        row.innerHTML = `
            <td>${record.date}</td>
            <td><span class="badge ${typeClass}">${record.type}</span></td>
            <td>${record.toppingName}</td>
            <td>${record.quantity}${record.unit}</td>
            <td>${record.reason || '-'}</td>
            <td>${record.operator || '-'}</td>
        `;
        tbody.appendChild(row);
    });
    
    if (specialRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无特殊损耗记录</td></tr>';
    }
}

function renderBossView() {
    const data = getBossViewData(currentDateRange, currentStore);
    
    document.getElementById('todayRevenue').textContent = formatNumber(data.totalRevenue);
    document.getElementById('toppingCost').textContent = formatNumber(data.totalTheoryCost);
    document.getElementById('lossAmount').textContent = formatNumber(data.totalDiffCost);
    
    const lossRateEl = document.getElementById('lossRate');
    lossRateEl.textContent = `损耗率 ${data.lossRate.toFixed(2)}%`;
    
    document.getElementById('restockCount').textContent = data.restockCount;
    
    document.getElementById('overallLossRate').textContent = data.lossRate.toFixed(2) + '%';
    document.getElementById('highestLossTopping').textContent = data.highestLossTopping;
    document.getElementById('bestStore').textContent = data.bestStore;
    document.getElementById('pendingShifts').textContent = data.pendingShifts;
    
    updateStoreRankChart(data.storeRank);
    renderRestockList(data.restockAdvice);
    renderWasteAlertList(data.wasteAlerts);
}

function renderRestockList(restockAdvice) {
    const list = document.getElementById('restockList');
    list.innerHTML = '';
    
    if (restockAdvice.length === 0) {
        list.innerHTML = '<div class="empty-state">库存充足，暂无补货建议</div>';
        return;
    }
    
    restockAdvice.forEach(item => {
        const div = document.createElement('div');
        div.className = 'restock-item';
        
        const urgencyClass = item.urgency === 'urgent' ? 'badge-danger' : 'badge-warning';
        const urgencyText = item.urgency === 'urgent' ? '紧急' : '建议';
        
        div.innerHTML = `
            <div class="restock-info">
                <div class="restock-name">${item.toppingName}</div>
                <div class="restock-detail">
                    当前库存: ${formatNumber(item.currentStock)}克 | 
                    日耗: ${formatNumber(item.dailyUsage)}克 | 
                    可撑${item.daysLeft}天
                </div>
            </div>
            <span class="badge ${urgencyClass}">${urgencyText}</span>
        `;
        list.appendChild(div);
    });
}

function renderWasteAlertList(wasteAlerts) {
    const list = document.getElementById('wasteAlertList');
    list.innerHTML = '';
    
    if (wasteAlerts.length === 0) {
        list.innerHTML = '<div class="empty-state">暂无浪费预警，损耗控制良好</div>';
        return;
    }
    
    wasteAlerts.slice(0, 10).forEach(alert => {
        const div = document.createElement('div');
        div.className = 'alert-item';
        
        const severityClass = alert.severity === 'danger' ? 'badge-danger' : 'badge-warning';
        
        div.innerHTML = `
            <div class="alert-info">
                <div class="alert-type">${alert.type} - ${alert.toppingName}</div>
                <div class="alert-desc">${alert.description}</div>
            </div>
            <span class="badge ${severityClass}">待核实</span>
        `;
        list.appendChild(div);
    });
}

function renderHeadquartersView() {
    const data = getHeadquartersViewData(currentDateRange, currentStore);
    
    document.getElementById('totalProducts').textContent = data.totalProducts;
    const totalProductsEl = document.getElementById('totalProducts');
    totalProductsEl.nextElementSibling;
    
    document.querySelector('#headquartersView .kpi-card:first-child .kpi-trend').textContent = 
        `含新品 ${data.newProductCount} 款`;
    
    document.getElementById('newProductRate').textContent = data.newProductRate;
    document.getElementById('newProductLoss').textContent = data.avgNewLoss;
    document.getElementById('formulaOptimize').textContent = data.needOptimize;
    
    updateNewProductChart(data.newProductAnalysis);
    renderNewProductTable(data.newProductAnalysis);
    renderFormulaVariantTable(data.variantAnalysis);
}

function renderNewProductTable(newProductAnalysis) {
    const tbody = document.querySelector('#newProductTable tbody');
    tbody.innerHTML = '';
    
    newProductAnalysis.forEach(item => {
        const row = document.createElement('tr');
        
        let statusText = '正常';
        let statusClass = 'normal';
        if (item.status === 'warning') {
            statusText = '偏高';
            statusClass = 'warning';
        } else if (item.status === 'danger') {
            statusText = '过高';
            statusClass = 'danger';
        } else if (item.status === 'under') {
            statusText = '偏低';
            statusClass = 'under';
        }
        
        const devColor = parseFloat(item.deviation) >= 0 ? 'var(--color-danger)' : 'var(--color-success)';
        
        row.innerHTML = `
            <td><strong>${item.productName}</strong></td>
            <td>${item.launchDate}</td>
            <td>${formatNumber(item.totalQty)}杯</td>
            <td>¥${item.theoryPerCup}</td>
            <td>¥${item.actualPerCup}</td>
            <td style="color: ${devColor}">
                ${parseFloat(item.deviation) >= 0 ? '+' : ''}${item.deviation}%
            </td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td style="font-size: 12px; color: var(--color-text-secondary)">${item.suggestion}</td>
        `;
        tbody.appendChild(row);
    });
    
    if (newProductAnalysis.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">暂无新品数据</td></tr>';
    }
}

function renderFormulaVariantTable(variantAnalysis) {
    const tbody = document.querySelector('#formulaVariantTable tbody');
    tbody.innerHTML = '';
    
    variantAnalysis.slice(0, 15).forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.productName}</td>
            <td>${item.variantName}</td>
            <td>${item.ratio}</td>
            <td style="font-size: 12px">${item.toppingDiff}</td>
            <td style="color: ${parseFloat(item.costImpact) >= 0 ? 'var(--color-danger)' : 'var(--color-success)'}">
                ${item.costImpact}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    if (variantAnalysis.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">暂无配方变体数据</td></tr>';
    }
}

function formatNumber(num) {
    if (num >= 10000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return Math.floor(num).toLocaleString();
}

document.addEventListener('DOMContentLoaded', initApp);

if (document.readyState !== 'loading') {
    initApp();
}
