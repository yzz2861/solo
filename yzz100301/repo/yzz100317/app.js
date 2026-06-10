const STORAGE_KEYS = {
    MATERIAL_BATCHES: 'trace_material_batches',
    PROCESSING_BATCHES: 'trace_processing_batches',
    STORE_FEEDBACKS: 'trace_store_feedbacks',
    REVIEWS: 'trace_reviews',
    RISKS: 'trace_risks'
};

let appData = {
    materialBatches: [],
    processingBatches: [],
    storeFeedbacks: [],
    reviews: {},
    risks: []
};

function init() {
    loadData();
    bindEvents();
    updateCurrentDate();
    refreshDashboard();
}

function loadData() {
    appData.materialBatches = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATERIAL_BATCHES) || '[]');
    appData.processingBatches = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROCESSING_BATCHES) || '[]');
    appData.storeFeedbacks = JSON.parse(localStorage.getItem(STORAGE_KEYS.STORE_FEEDBACKS) || '[]');
    appData.reviews = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS) || '{}');
    appData.risks = JSON.parse(localStorage.getItem(STORAGE_KEYS.RISKS) || '[]');
}

function saveData() {
    localStorage.setItem(STORAGE_KEYS.MATERIAL_BATCHES, JSON.stringify(appData.materialBatches));
    localStorage.setItem(STORAGE_KEYS.PROCESSING_BATCHES, JSON.stringify(appData.processingBatches));
    localStorage.setItem(STORAGE_KEYS.STORE_FEEDBACKS, JSON.stringify(appData.storeFeedbacks));
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(appData.reviews));
    localStorage.setItem(STORAGE_KEYS.RISKS, JSON.stringify(appData.risks));
}

function bindEvents() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
    });

    document.getElementById('clearAllBtn').addEventListener('click', clearAllData);

    document.getElementById('materialFile').addEventListener('change', (e) => {
        handleFileSelect(e, 'material');
    });
    document.getElementById('processingFile').addEventListener('change', (e) => {
        handleFileSelect(e, 'processing');
    });
    document.getElementById('feedbackFile').addEventListener('change', (e) => {
        handleFileSelect(e, 'feedback');
    });

    document.getElementById('importMaterialBtn').addEventListener('click', importMaterialData);
    document.getElementById('importProcessingBtn').addEventListener('click', importProcessingData);
    document.getElementById('importFeedbackBtn').addEventListener('click', importFeedbackData);

    document.getElementById('generateSampleBtn').addEventListener('click', generateSampleData);

    document.getElementById('traceSearchBtn').addEventListener('click', searchTrace);
    document.getElementById('traceSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchTrace();
    });

    document.querySelectorAll('.risk-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterRisks(btn.dataset.risk));
    });

    document.getElementById('reviewStatusFilter').addEventListener('change', renderReviewList);
    document.getElementById('reviewRiskFilter').addEventListener('change', renderReviewList);

    document.getElementById('closeModal').addEventListener('click', closeReviewModal);
    document.getElementById('cancelReview').addEventListener('click', closeReviewModal);
    document.getElementById('saveReview').addEventListener('click', saveReview);

    document.getElementById('exportTraceBtn').addEventListener('click', exportTraceReport);
    document.getElementById('exportRiskBtn').addEventListener('click', exportRiskReport);
    document.getElementById('exportAllBtn').addEventListener('click', exportAllData);

    document.getElementById('reviewModal').addEventListener('click', (e) => {
        if (e.target.id === 'reviewModal') closeReviewModal();
    });
}

function updateCurrentDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('zh-CN', options);
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.toggle('active', tab.id === tabName + '-tab');
    });

    if (tabName === 'trace') searchTrace();
    if (tabName === 'risk') filterRisks('all');
    if (tabName === 'review') renderReviewList();
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function handleFileSelect(e, type) {
    const file = e.target.files[0];
    if (!file) return;

    const fileNameEl = document.getElementById(type + 'FileName');
    const importBtn = document.getElementById('import' + type.charAt(0).toUpperCase() + type.slice(1) + 'Btn');

    fileNameEl.textContent = file.name;
    importBtn.disabled = false;
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length !== headers.length) continue;

        const row = {};
        headers.forEach((header, idx) => {
            row[header] = values[idx];
        });
        data.push(row);
    }

    return data;
}

async function importMaterialData() {
    const fileInput = document.getElementById('materialFile');
    const file = fileInput.files[0];
    if (!file) return;

    try {
        const text = await readFile(file);
        const data = parseCSV(text);

        if (data.length === 0) {
            showToast('CSV 文件解析失败或无数据', 'error');
            return;
        }

        let added = 0;
        let updated = 0;

        data.forEach(row => {
            const batchNo = row['批次号'] || row['batchNo'];
            if (!batchNo) return;

            const existing = appData.materialBatches.find(b => b.batchNo === batchNo);
            const batchData = {
                batchNo: batchNo,
                materialName: row['原料名称'] || row['materialName'] || '',
                quantity: parseFloat(row['数量'] || row['quantity']) || 0,
                unit: row['单位'] || row['unit'] || '',
                supplier: row['供应商'] || row['supplier'] || '',
                inboundDate: row['入库日期'] || row['inboundDate'] || '',
                expiryDate: row['过期日期'] || row['expiryDate'] || ''
            };

            if (existing) {
                Object.assign(existing, batchData);
                updated++;
            } else {
                appData.materialBatches.push(batchData);
                added++;
            }
        });

        saveData();
        detectRisks();
        refreshDashboard();

        const resultEl = document.getElementById('materialImportResult');
        resultEl.textContent = `新增 ${added} 条，更新 ${updated} 条`;
        resultEl.className = 'import-result';

        showToast(`原料导入成功：新增 ${added} 条，更新 ${updated} 条`);
    } catch (err) {
        showToast('导入失败：' + err.message, 'error');
    }
}

async function importProcessingData() {
    const fileInput = document.getElementById('processingFile');
    const file = fileInput.files[0];
    if (!file) return;

    try {
        const text = await readFile(file);
        const data = JSON.parse(text);

        if (!Array.isArray(data) || data.length === 0) {
            showToast('JSON 数据格式错误或为空', 'error');
            return;
        }

        let added = 0;
        let updated = 0;

        data.forEach(item => {
            if (!item.batchNo) return;

            const existing = appData.processingBatches.find(b => b.batchNo === item.batchNo);
            const batchData = {
                batchNo: item.batchNo,
                productName: item.productName || '',
                materialBatchNos: item.materialBatchNos || [],
                processDate: item.processDate || '',
                quantity: item.quantity || 0,
                deliveryStores: item.deliveryStores || []
            };

            if (existing) {
                Object.assign(existing, batchData);
                updated++;
            } else {
                appData.processingBatches.push(batchData);
                added++;
            }
        });

        saveData();
        detectRisks();
        refreshDashboard();

        const resultEl = document.getElementById('processingImportResult');
        resultEl.textContent = `新增 ${added} 条，更新 ${updated} 条`;
        resultEl.className = 'import-result';

        showToast(`加工记录导入成功：新增 ${added} 条，更新 ${updated} 条`);
    } catch (err) {
        showToast('导入失败：' + err.message, 'error');
    }
}

async function importFeedbackData() {
    const fileInput = document.getElementById('feedbackFile');
    const file = fileInput.files[0];
    if (!file) return;

    try {
        const text = await readFile(file);
        const data = parseCSV(text);

        if (data.length === 0) {
            showToast('CSV 文件解析失败或无数据', 'error');
            return;
        }

        let added = 0;
        let updated = 0;

        data.forEach(row => {
            const feedbackId = row['反馈ID'] || row['feedbackId'];
            if (!feedbackId) return;

            const existing = appData.storeFeedbacks.find(f => f.feedbackId === feedbackId);
            const feedbackData = {
                feedbackId: feedbackId,
                storeName: row['门店名称'] || row['storeName'] || '',
                deliveryBatchNo: row['配送批次号'] || row['deliveryBatchNo'] || '',
                feedbackDate: row['反馈日期'] || row['feedbackDate'] || '',
                content: row['反馈内容'] || row['content'] || '',
                feedbackType: row['反馈类型'] || row['feedbackType'] || 'normal'
            };

            if (existing) {
                Object.assign(existing, feedbackData);
                updated++;
            } else {
                appData.storeFeedbacks.push(feedbackData);
                added++;
            }
        });

        saveData();
        detectRisks();
        refreshDashboard();

        const resultEl = document.getElementById('feedbackImportResult');
        resultEl.textContent = `新增 ${added} 条，更新 ${updated} 条`;
        resultEl.className = 'import-result';

        showToast(`门店反馈导入成功：新增 ${added} 条，更新 ${updated} 条`);
    } catch (err) {
        showToast('导入失败：' + err.message, 'error');
    }
}

function detectRisks() {
    appData.risks = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nearExpiryDays = 7;

    appData.materialBatches.forEach(batch => {
        if (batch.expiryDate) {
            const expiryDate = new Date(batch.expiryDate);
            expiryDate.setHours(0, 0, 0, 0);

            if (expiryDate < today) {
                appData.risks.push({
                    id: 'expired_' + batch.batchNo,
                    type: 'expired',
                    level: 'high',
                    batchNo: batch.batchNo,
                    title: `原料 ${batch.materialName} 已过期`,
                    description: `批次号：${batch.batchNo}，过期日期：${batch.expiryDate}，供应商：${batch.supplier}`,
                    date: batch.expiryDate,
                    status: appData.reviews['expired_' + batch.batchNo] ? 'reviewed' : 'pending'
                });
            } else {
                const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                if (diffDays <= nearExpiryDays) {
                    appData.risks.push({
                        id: 'near_expiry_' + batch.batchNo,
                        type: 'near-expiry',
                        level: 'medium',
                        batchNo: batch.batchNo,
                        title: `原料 ${batch.materialName} 即将过期`,
                        description: `批次号：${batch.batchNo}，还有 ${diffDays} 天过期，过期日期：${batch.expiryDate}`,
                        date: batch.expiryDate,
                        status: appData.reviews['near_expiry_' + batch.batchNo] ? 'reviewed' : 'pending'
                    });
                }
            }
        }
    });

    appData.processingBatches.forEach(batch => {
        if (!batch.materialBatchNos || batch.materialBatchNos.length === 0) {
            appData.risks.push({
                id: 'missing_source_' + batch.batchNo,
                type: 'missing-source',
                level: 'high',
                batchNo: batch.batchNo,
                title: `加工批次 ${batch.productName} 缺少原料来源`,
                description: `加工批次号：${batch.batchNo}，未关联任何原料批次，无法追溯来源`,
                date: batch.processDate,
                status: appData.reviews['missing_source_' + batch.batchNo] ? 'reviewed' : 'pending'
            });
        } else {
            const missingBatches = batch.materialBatchNos.filter(mbNo => {
                return !appData.materialBatches.find(mb => mb.batchNo === mbNo);
            });

            if (missingBatches.length > 0) {
                appData.risks.push({
                    id: 'missing_source_mat_' + batch.batchNo,
                    type: 'missing-source',
                    level: 'high',
                    batchNo: batch.batchNo,
                    title: `加工批次 ${batch.productName} 原料批次不存在`,
                    description: `加工批次号：${batch.batchNo}，关联的原料批次 ${missingBatches.join('、')} 在原料台账中不存在`,
                    date: batch.processDate,
                    status: appData.reviews['missing_source_mat_' + batch.batchNo] ? 'reviewed' : 'pending'
                });
            }
        }
    });

    appData.storeFeedbacks.forEach(feedback => {
        if (feedback.deliveryBatchNo) {
            const processingBatch = appData.processingBatches.find(b => b.batchNo === feedback.deliveryBatchNo);

            if (!processingBatch) {
                appData.risks.push({
                    id: 'mismatch_' + feedback.feedbackId,
                    type: 'mismatch',
                    level: 'medium',
                    batchNo: feedback.deliveryBatchNo,
                    feedbackId: feedback.feedbackId,
                    title: `门店反馈配送批次号不匹配`,
                    description: `门店 ${feedback.storeName} 反馈的配送批次号 ${feedback.deliveryBatchNo} 在加工记录中不存在`,
                    date: feedback.feedbackDate,
                    status: appData.reviews['mismatch_' + feedback.feedbackId] ? 'reviewed' : 'pending'
                });
            } else if (processingBatch.deliveryStores && processingBatch.deliveryStores.length > 0) {
                const storeMatch = processingBatch.deliveryStores.some(s =>
                    s.storeName === feedback.storeName || s === feedback.storeName
                );

                if (!storeMatch) {
                    appData.risks.push({
                        id: 'store_mismatch_' + feedback.feedbackId,
                        type: 'mismatch',
                        level: 'low',
                        batchNo: feedback.deliveryBatchNo,
                        feedbackId: feedback.feedbackId,
                        title: `门店反馈与配送记录不一致`,
                        description: `加工批次 ${feedback.deliveryBatchNo} 的配送门店中没有 ${feedback.storeName}，但该门店提交了反馈`,
                        date: feedback.feedbackDate,
                        status: appData.reviews['store_mismatch_' + feedback.feedbackId] ? 'reviewed' : 'pending'
                    });
                }
            }
        }
    });

    saveData();
    updateRiskBadge();
}

function updateRiskBadge() {
    const pendingRisks = appData.risks.filter(r => r.status === 'pending').length;
    const badge = document.getElementById('riskBadge');
    badge.textContent = pendingRisks;
    badge.classList.toggle('hidden', pendingRisks === 0);
}

function refreshDashboard() {
    document.getElementById('statMaterialCount').textContent = appData.materialBatches.length;
    document.getElementById('statProcessingCount').textContent = appData.processingBatches.length;
    document.getElementById('statFeedbackCount').textContent = appData.storeFeedbacks.length;

    const pendingRisks = appData.risks.filter(r => r.status === 'pending').length;
    document.getElementById('statRiskCount').textContent = pendingRisks;

    renderRecentBatches();
    renderRiskOverview();
    updateRiskBadge();
}

function renderRecentBatches() {
    const container = document.getElementById('recentBatches');
    const allBatches = [
        ...appData.materialBatches.map(b => ({ ...b, type: 'material', date: b.inboundDate })),
        ...appData.processingBatches.map(b => ({ ...b, type: 'processing', date: b.processDate }))
    ];

    allBatches.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = allBatches.slice(0, 5);

    if (recent.length === 0) {
        container.innerHTML = '<p class="empty-state">暂无数据，请先导入批次记录</p>';
        return;
    }

    container.innerHTML = recent.map(batch => `
        <div class="trace-item" onclick="showBatchDetail('${batch.batchNo}', '${batch.type}')">
            <div class="trace-item-header">
                <div class="trace-item-title">
                    <span class="trace-badge ${batch.type}">${batch.type === 'material' ? '原料' : '加工'}</span>
                    <strong>${batch.batchNo}</strong>
                    <span>${batch.materialName || batch.productName}</span>
                </div>
                <span style="color: var(--text-muted); font-size: 12px;">${batch.date}</span>
            </div>
            <div class="trace-item-meta">
                ${batch.type === 'material'
                    ? `<span>供应商：${batch.supplier || '-'}</span><span>数量：${batch.quantity}${batch.unit || ''}</span>`
                    : `<span>原料批次：${(batch.materialBatchNos || []).length} 个</span><span>产量：${batch.quantity || 0}</span>`
                }
            </div>
        </div>
    `).join('');
}

function renderRiskOverview() {
    const container = document.getElementById('riskOverview');
    const risks = appData.risks.filter(r => r.status === 'pending').slice(0, 5);

    if (risks.length === 0) {
        container.innerHTML = '<p class="empty-state">暂无风险项</p>';
        return;
    }

    container.innerHTML = risks.map(risk => `
        <div class="risk-item">
            <div class="risk-icon">
                ${risk.type === 'expired' ? '🔴' : risk.type === 'near-expiry' ? '🟡' : risk.type === 'missing-source' ? '⚠️' : '❓'}
            </div>
            <div class="risk-content">
                <div class="risk-title">
                    <span class="risk-level ${risk.level}">${risk.level === 'high' ? '高风险' : risk.level === 'medium' ? '中风险' : '低风险'}</span>
                    ${risk.title}
                </div>
                <div class="risk-desc">${risk.description}</div>
            </div>
        </div>
    `).join('');
}

function searchTrace() {
    const keyword = document.getElementById('traceSearch').value.trim().toLowerCase();
    const filterType = document.getElementById('traceFilter').value;
    const container = document.getElementById('traceResults');

    let results = [];

    if (filterType === 'all' || filterType === 'material') {
        appData.materialBatches.forEach(batch => {
            if (!keyword ||
                batch.batchNo.toLowerCase().includes(keyword) ||
                batch.materialName.toLowerCase().includes(keyword) ||
                batch.supplier.toLowerCase().includes(keyword)) {
                results.push({ ...batch, type: 'material' });
            }
        });
    }

    if (filterType === 'all' || filterType === 'processing') {
        appData.processingBatches.forEach(batch => {
            if (!keyword ||
                batch.batchNo.toLowerCase().includes(keyword) ||
                batch.productName.toLowerCase().includes(keyword) ||
                (batch.materialBatchNos || []).some(n => n.toLowerCase().includes(keyword))) {
                results.push({ ...batch, type: 'processing' });
            }
        });
    }

    results.sort((a, b) => {
        const dateA = new Date(a.inboundDate || a.processDate || 0);
        const dateB = new Date(b.inboundDate || b.processDate || 0);
        return dateB - dateA;
    });

    if (results.length === 0) {
        container.innerHTML = '<p class="empty-state">未找到匹配的批次记录</p>';
        return;
    }

    container.innerHTML = results.map(batch => renderTraceItem(batch)).join('');
}

function renderTraceItem(batch) {
    const isProcessing = batch.type === 'processing';
    const review = appData.reviews[batch.batchNo];

    let detailContent = '';

    if (isProcessing) {
        const materialBatches = (batch.materialBatchNos || []).map(mbNo => {
            const mat = appData.materialBatches.find(m => m.batchNo === mbNo);
            return {
                batchNo: mbNo,
                exists: !!mat,
                name: mat ? mat.materialName : '未知',
                supplier: mat ? mat.supplier : '-',
                expiryDate: mat ? mat.expiryDate : '-'
            };
        });

        const feedbacks = appData.storeFeedbacks.filter(f => f.deliveryBatchNo === batch.batchNo);

        detailContent = `
            <div class="timeline">
                <div class="timeline-item success">
                    <div class="timeline-date">${batch.processDate || '-'}</div>
                    <div class="timeline-title">加工完成</div>
                    <div class="timeline-desc">产品：${batch.productName}，产量：${batch.quantity || 0}</div>
                </div>
                <div class="timeline-item ${materialBatches.every(m => m.exists) ? 'success' : 'danger'}">
                    <div class="timeline-title">原料来源（${materialBatches.length} 批）</div>
                    <div class="timeline-desc">
                        ${materialBatches.map(m => `
                            <div style="padding: 4px 0;">
                                <strong>${m.batchNo}</strong> - ${m.name}
                                ${m.exists ? `<span style="color: var(--success-color);">✓</span>` : `<span style="color: var(--danger-color);">✗ 原料台账中不存在</span>`}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="timeline-item ${batch.deliveryStores && batch.deliveryStores.length > 0 ? 'success' : 'warning'}">
                    <div class="timeline-title">配送门店</div>
                    <div class="timeline-desc">
                        ${batch.deliveryStores && batch.deliveryStores.length > 0
                            ? batch.deliveryStores.map(s => typeof s === 'string' ? s : s.storeName).join('、')
                            : '暂无配送记录'}
                    </div>
                </div>
                <div class="timeline-item ${feedbacks.length > 0 ? 'success' : ''}">
                    <div class="timeline-title">门店反馈（${feedbacks.length} 条）</div>
                    <div class="timeline-desc">
                        ${feedbacks.length > 0
                            ? feedbacks.map(f => `<div>${f.storeName}：${f.content}</div>`).join('')
                            : '暂无反馈'}
                    </div>
                </div>
                ${review ? `
                <div class="timeline-item success">
                    <div class="timeline-date">${review.reviewDate}</div>
                    <div class="timeline-title">复核完成</div>
                    <div class="timeline-desc">
                        复核人：${review.reviewer}<br>
                        意见：${review.opinion}
                    </div>
                </div>
                ` : ''}
            </div>
            <div style="margin-top: 12px; display: flex; gap: 8px;">
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openReviewModal('${batch.batchNo}')">
                    ${review ? '查看/编辑复核' : '添加复核'}
                </button>
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); exportSingleBatch('${batch.batchNo}')">
                    导出报告
                </button>
            </div>
        `;
    } else {
        const usedInProcessing = appData.processingBatches.filter(pb =>
            (pb.materialBatchNos || []).includes(batch.batchNo)
        );

        detailContent = `
            <div class="timeline">
                <div class="timeline-item success">
                    <div class="timeline-date">${batch.inboundDate || '-'}</div>
                    <div class="timeline-title">原料入库</div>
                    <div class="timeline-desc">
                        名称：${batch.materialName}<br>
                        数量：${batch.quantity}${batch.unit || ''}<br>
                        供应商：${batch.supplier || '-'}
                    </div>
                </div>
                <div class="timeline-item ${isExpired(batch) ? 'danger' : isNearExpiry(batch) ? 'warning' : 'success'}">
                    <div class="timeline-date">保质期至：${batch.expiryDate || '-'}</div>
                    <div class="timeline-title">
                        ${isExpired(batch) ? '已过期' : isNearExpiry(batch) ? '即将过期' : '有效期内'}
                    </div>
                    <div class="timeline-desc">
                        ${isExpired(batch) ? '⚠️ 该原料已过期，请立即处理' :
                          isNearExpiry(batch) ? `⚡ 还有 ${getExpiryDays(batch)} 天过期` :
                          '✅ 原料状态正常'}
                    </div>
                </div>
                <div class="timeline-item ${usedInProcessing.length > 0 ? 'success' : ''}">
                    <div class="timeline-title">用于加工批次（${usedInProcessing.length} 批）</div>
                    <div class="timeline-desc">
                        ${usedInProcessing.length > 0
                            ? usedInProcessing.map(p => `<div><strong>${p.batchNo}</strong> - ${p.productName}</div>`).join('')
                            : '暂未用于加工'}
                    </div>
                </div>
                ${review ? `
                <div class="timeline-item success">
                    <div class="timeline-date">${review.reviewDate}</div>
                    <div class="timeline-title">复核完成</div>
                    <div class="timeline-desc">
                        复核人：${review.reviewer}<br>
                        意见：${review.opinion}
                    </div>
                </div>
                ` : ''}
            </div>
            <div style="margin-top: 12px; display: flex; gap: 8px;">
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openReviewModal('${batch.batchNo}')">
                    ${review ? '查看/编辑复核' : '添加复核'}
                </button>
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); exportSingleBatch('${batch.batchNo}')">
                    导出报告
                </button>
            </div>
        `;
    }

    return `
        <div class="trace-item" onclick="this.classList.toggle('expanded')">
            <div class="trace-item-header">
                <div class="trace-item-title">
                    <span class="trace-badge ${batch.type}">${isProcessing ? '加工' : '原料'}</span>
                    <strong>${batch.batchNo}</strong>
                    <span>${batch.productName || batch.materialName}</span>
                </div>
                <span style="color: var(--text-muted); font-size: 12px;">
                    ${batch.processDate || batch.inboundDate || '-'}
                </span>
            </div>
            <div class="trace-item-meta">
                ${isProcessing
                    ? `<span>原料批次：${(batch.materialBatchNos || []).length} 个</span>`
                    : `<span>供应商：${batch.supplier || '-'}</span>`
                }
                ${review ? '<span style="color: var(--success-color);">✓ 已复核</span>' : '<span style="color: var(--text-muted);">待复核</span>'}
            </div>
            <div class="trace-detail">
                ${detailContent}
            </div>
        </div>
    `;
}

function isExpired(batch) {
    if (!batch.expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(batch.expiryDate) < today;
}

function isNearExpiry(batch) {
    if (!batch.expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(batch.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
}

function getExpiryDays(batch) {
    if (!batch.expiryDate) return '-';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(batch.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

function showBatchDetail(batchNo, type) {
}

function filterRisks(riskType) {
    document.querySelectorAll('.risk-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.risk === riskType);
    });

    const container = document.getElementById('riskResults');
    let risks = appData.risks;

    if (riskType !== 'all') {
        risks = risks.filter(r => r.type === riskType);
    }

    risks.sort((a, b) => {
        const levelOrder = { high: 0, medium: 1, low: 2 };
        if (levelOrder[a.level] !== levelOrder[b.level]) {
            return levelOrder[a.level] - levelOrder[b.level];
        }
        return new Date(b.date) - new Date(a.date);
    });

    if (risks.length === 0) {
        container.innerHTML = '<p class="empty-state">暂无风险项</p>';
        return;
    }

    container.innerHTML = risks.map(risk => `
        <div class="risk-item">
            <div class="risk-icon">
                ${risk.type === 'expired' ? '🔴' : risk.type === 'near-expiry' ? '🟡' : risk.type === 'missing-source' ? '⚠️' : '❓'}
            </div>
            <div class="risk-content">
                <div class="risk-title">
                    <span class="risk-level ${risk.level}">${risk.level === 'high' ? '高风险' : risk.level === 'medium' ? '中风险' : '低风险'}</span>
                    <span class="risk-status ${risk.status}">${risk.status === 'pending' ? '待复核' : '已复核'}</span>
                    ${risk.title}
                </div>
                <div class="risk-desc">${risk.description}</div>
                <div class="risk-meta">
                    <span>批次号：${risk.batchNo}</span>
                    <span>日期：${risk.date || '-'}</span>
                </div>
            </div>
            <div class="risk-actions">
                <button class="btn btn-primary btn-sm" onclick="openReviewModal('${risk.id}')">
                    ${risk.status === 'pending' ? '复核' : '查看'}
                </button>
            </div>
        </div>
    `).join('');
}

function renderReviewList() {
    const statusFilter = document.getElementById('reviewStatusFilter').value;
    const riskFilter = document.getElementById('reviewRiskFilter').value;
    const container = document.getElementById('reviewList');

    let items = [];

    appData.risks.forEach(risk => {
        const review = appData.reviews[risk.id];
        const isReviewed = !!review;

        if (statusFilter === 'pending' && isReviewed) return;
        if (statusFilter === 'reviewed' && !isReviewed) return;
        if (riskFilter !== 'all' && risk.level !== riskFilter) return;

        items.push({
            ...risk,
            review: review
        });
    });

    items.sort((a, b) => {
        if (a.status !== b.status) {
            return a.status === 'pending' ? -1 : 1;
        }
        const levelOrder = { high: 0, medium: 1, low: 2 };
        return levelOrder[a.level] - levelOrder[b.level];
    });

    if (items.length === 0) {
        container.innerHTML = '<p class="empty-state">暂无复核项</p>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="review-item">
            <div class="review-item-header">
                <span class="review-item-title">${item.title}</span>
                <div style="display: flex; gap: 8px;">
                    <span class="risk-level ${item.level}">${item.level === 'high' ? '高风险' : item.level === 'medium' ? '中风险' : '低风险'}</span>
                    <span class="risk-status ${item.status}">${item.status === 'pending' ? '待复核' : '已复核'}</span>
                </div>
            </div>
            <div class="review-item-body">
                <p style="color: var(--text-secondary); font-size: 13px;">${item.description}</p>
                ${item.review ? `
                    <div class="review-opinion">
                        <strong>复核意见：</strong>${item.review.opinion}<br>
                        <strong>处理结果：</strong>${getResultLabel(item.review.result)}<br>
                        <strong>复核人：</strong>${item.review.reviewer} · ${item.review.reviewDate}
                    </div>
                ` : ''}
            </div>
            <div class="review-item-footer">
                <span>批次号：${item.batchNo}</span>
                <button class="btn btn-primary btn-sm" onclick="openReviewModal('${item.id}')">
                    ${item.review ? '编辑复核' : '开始复核'}
                </button>
            </div>
        </div>
    `).join('');
}

function getResultLabel(result) {
    const labels = {
        pending: '待处理',
        resolved: '已解决',
        accepted: '可接受',
        rejected: '驳回'
    };
    return labels[result] || result;
}

function openReviewModal(targetId) {
    const modal = document.getElementById('reviewModal');
    document.getElementById('reviewBatchNo').value = targetId;

    const review = appData.reviews[targetId];
    if (review) {
        document.getElementById('reviewRiskLevel').value = review.riskLevel || 'medium';
        document.getElementById('reviewerName').value = review.reviewer || '';
        document.getElementById('reviewOpinion').value = review.opinion || '';
        document.getElementById('reviewResult').value = review.result || 'pending';
    } else {
        const risk = appData.risks.find(r => r.id === targetId);
        document.getElementById('reviewRiskLevel').value = risk ? risk.level : 'medium';
        document.getElementById('reviewerName').value = '';
        document.getElementById('reviewOpinion').value = '';
        document.getElementById('reviewResult').value = 'pending';
    }

    modal.dataset.targetId = targetId;
    modal.classList.remove('hidden');
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.add('hidden');
}

function saveReview() {
    const modal = document.getElementById('reviewModal');
    const targetId = modal.dataset.targetId;
    if (!targetId) return;

    const reviewer = document.getElementById('reviewerName').value.trim();
    const opinion = document.getElementById('reviewOpinion').value.trim();
    const riskLevel = document.getElementById('reviewRiskLevel').value;
    const result = document.getElementById('reviewResult').value;

    if (!reviewer) {
        showToast('请填写复核人姓名', 'warning');
        return;
    }
    if (!opinion) {
        showToast('请填写复核意见', 'warning');
        return;
    }

    const now = new Date();
    const reviewDate = now.toLocaleDateString('zh-CN') + ' ' + now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    appData.reviews[targetId] = {
        targetId: targetId,
        riskLevel: riskLevel,
        reviewer: reviewer,
        opinion: opinion,
        result: result,
        reviewDate: reviewDate
    };

    const riskIndex = appData.risks.findIndex(r => r.id === targetId);
    if (riskIndex !== -1) {
        appData.risks[riskIndex].status = 'reviewed';
    }

    saveData();
    closeReviewModal();
    refreshDashboard();

    const activeTab = document.querySelector('.nav-item.active').dataset.tab;
    if (activeTab === 'risk') filterRisks('all');
    if (activeTab === 'review') renderReviewList();
    if (activeTab === 'trace') searchTrace();

    showToast('复核意见已保存');
}

function exportTraceReport() {
    const batchNo = document.getElementById('exportBatchNo').value.trim();
    let report = '';

    if (batchNo) {
        report = generateSingleBatchReport(batchNo);
    } else {
        report = generateFullTraceReport();
    }

    document.getElementById('exportPreviewContent').textContent = report;
    downloadFile(report, '批次追溯报告_' + new Date().toLocaleDateString('zh-CN') + '.txt', 'text/plain');
}

function generateSingleBatchReport(batchNo) {
    const material = appData.materialBatches.find(b => b.batchNo === batchNo);
    const processing = appData.processingBatches.find(b => b.batchNo === batchNo);
    const review = appData.reviews[batchNo];

    let report = '========================================\n';
    report += '       中央厨房批次追溯报告\n';
    report += '========================================\n\n';
    report += `生成时间：${new Date().toLocaleString('zh-CN')}\n`;
    report += `批次号：${batchNo}\n\n`;

    if (material) {
        report += '【原料信息】\n';
        report += `  原料名称：${material.materialName}\n`;
        report += `  数量：${material.quantity}${material.unit || ''}\n`;
        report += `  供应商：${material.supplier || '-'}\n`;
        report += `  入库日期：${material.inboundDate || '-'}\n`;
        report += `  过期日期：${material.expiryDate || '-'}\n`;
        report += `  状态：${isExpired(material) ? '已过期' : isNearExpiry(material) ? '临期' : '正常'}\n\n`;

        const usedIn = appData.processingBatches.filter(p =>
            (p.materialBatchNos || []).includes(batchNo)
        );
        if (usedIn.length > 0) {
            report += '【用于加工批次】\n';
            usedIn.forEach(p => {
                report += `  - ${p.batchNo}（${p.productName}）\n`;
            });
            report += '\n';
        }
    }

    if (processing) {
        report += '【加工信息】\n';
        report += `  产品名称：${processing.productName}\n`;
        report += `  加工日期：${processing.processDate || '-'}\n`;
        report += `  产量：${processing.quantity || 0}\n\n`;

        report += '【原料来源】\n';
        if (processing.materialBatchNos && processing.materialBatchNos.length > 0) {
            processing.materialBatchNos.forEach(mbNo => {
                const mat = appData.materialBatches.find(m => m.batchNo === mbNo);
                report += `  - ${mbNo}：${mat ? mat.materialName : '⚠️ 原料台账中不存在'}\n`;
            });
        } else {
            report += '  ⚠️ 未关联任何原料批次\n';
        }
        report += '\n';

        report += '【配送门店】\n';
        if (processing.deliveryStores && processing.deliveryStores.length > 0) {
            processing.deliveryStores.forEach(s => {
                report += `  - ${typeof s === 'string' ? s : s.storeName}\n`;
            });
        } else {
            report += '  暂无配送记录\n';
        }
        report += '\n';

        const feedbacks = appData.storeFeedbacks.filter(f => f.deliveryBatchNo === batchNo);
        report += '【门店反馈】\n';
        if (feedbacks.length > 0) {
            feedbacks.forEach(f => {
                report += `  - ${f.storeName}（${f.feedbackDate}）：${f.content}\n`;
            });
        } else {
            report += '  暂无反馈\n';
        }
        report += '\n';
    }

    if (review) {
        report += '【复核记录】\n';
        report += `  风险等级：${review.riskLevel === 'high' ? '高' : review.riskLevel === 'medium' ? '中' : '低'}\n`;
        report += `  复核人：${review.reviewer}\n`;
        report += `  复核时间：${review.reviewDate}\n`;
        report += `  处理结果：${getResultLabel(review.result)}\n`;
        report += `  复核意见：${review.opinion}\n`;
    } else {
        report += '【复核记录】\n  暂无复核记录\n';
    }

    report += '\n========================================\n';
    report += '           报告结束\n';
    report += '========================================\n';

    return report;
}

function generateFullTraceReport() {
    let report = '========================================\n';
    report += '     中央厨房全量批次追溯报告\n';
    report += '========================================\n\n';
    report += `生成时间：${new Date().toLocaleString('zh-CN')}\n`;
    report += `原料批次：${appData.materialBatches.length} 条\n`;
    report += `加工批次：${appData.processingBatches.length} 条\n`;
    report += `门店反馈：${appData.storeFeedbacks.length} 条\n`;
    report += `风险项：${appData.risks.length} 条\n\n`;

    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += '一、原料批次清单\n';
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    appData.materialBatches.forEach((b, i) => {
        report += `${i + 1}. ${b.batchNo}\n`;
        report += `   名称：${b.materialName}\n`;
        report += `   数量：${b.quantity}${b.unit || ''} | 供应商：${b.supplier || '-'}\n`;
        report += `   入库：${b.inboundDate || '-'} | 过期：${b.expiryDate || '-'}\n`;
        report += `   状态：${isExpired(b) ? '❌ 已过期' : isNearExpiry(b) ? '⚠️ 临期' : '✅ 正常'}\n\n`;
    });

    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += '二、加工批次清单\n';
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    appData.processingBatches.forEach((b, i) => {
        report += `${i + 1}. ${b.batchNo}\n`;
        report += `   产品：${b.productName} | 产量：${b.quantity || 0}\n`;
        report += `   加工日期：${b.processDate || '-'}\n`;
        report += `   原料批次：${(b.materialBatchNos || []).join('、') || '无'}\n`;
        report += `   配送门店：${(b.deliveryStores || []).map(s => typeof s === 'string' ? s : s.storeName).join('、') || '无'}\n\n`;
    });

    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += '三、风险项汇总\n';
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    const pendingRisks = appData.risks.filter(r => r.status === 'pending');
    const reviewedRisks = appData.risks.filter(r => r.status === 'reviewed');

    report += `待处理：${pendingRisks.length} 条 | 已复核：${reviewedRisks.length} 条\n\n`;

    appData.risks.forEach((r, i) => {
        const levelText = r.level === 'high' ? '高' : r.level === 'medium' ? '中' : '低';
        report += `${i + 1}. [${levelText}风险] ${r.title}\n`;
        report += `   批次号：${r.batchNo}\n`;
        report += `   状态：${r.status === 'pending' ? '待复核' : '已复核'}\n`;
        report += `   描述：${r.description}\n`;
        if (appData.reviews[r.id]) {
            report += `   复核意见：${appData.reviews[r.id].opinion}\n`;
        }
        report += '\n';
    });

    report += '========================================\n';
    report += '           报告结束\n';
    report += '========================================\n';

    return report;
}

function exportSingleBatch(batchNo) {
    const report = generateSingleBatchReport(batchNo);
    document.getElementById('exportPreviewContent').textContent = report;
    downloadFile(report, `追溯报告_${batchNo}_${new Date().toLocaleDateString('zh-CN')}.txt`, 'text/plain');
}

function exportRiskReport() {
    let report = '========================================\n';
    report += '       中央厨房风险分析报告\n';
    report += '========================================\n\n';
    report += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;

    const highRisks = appData.risks.filter(r => r.level === 'high');
    const mediumRisks = appData.risks.filter(r => r.level === 'medium');
    const lowRisks = appData.risks.filter(r => r.level === 'low');

    report += '【风险统计】\n';
    report += `  高风险：${highRisks.length} 项\n`;
    report += `  中风险：${mediumRisks.length} 项\n`;
    report += `  低风险：${lowRisks.length} 项\n`;
    report += `  合计：${appData.risks.length} 项\n\n`;

    const pendingCount = appData.risks.filter(r => r.status === 'pending').length;
    const reviewedCount = appData.risks.filter(r => r.status === 'reviewed').length;
    report += `  待复核：${pendingCount} 项\n`;
    report += `  已复核：${reviewedCount} 项\n\n`;

    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += '高风险项\n';
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    highRisks.forEach((r, i) => {
        const review = appData.reviews[r.id];
        report += `${i + 1}. ${r.title}\n`;
        report += `   批次号：${r.batchNo}\n`;
        report += `   日期：${r.date || '-'}\n`;
        report += `   状态：${r.status === 'pending' ? '待复核' : '已复核'}\n`;
        report += `   描述：${r.description}\n`;
        if (review) {
            report += `   复核人：${review.reviewer}\n`;
            report += `   处理结果：${getResultLabel(review.result)}\n`;
            report += `   复核意见：${review.opinion}\n`;
        }
        report += '\n';
    });

    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += '中风险项\n';
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    mediumRisks.forEach((r, i) => {
        const review = appData.reviews[r.id];
        report += `${i + 1}. ${r.title}\n`;
        report += `   批次号：${r.batchNo}\n`;
        report += `   描述：${r.description}\n`;
        report += `   状态：${r.status === 'pending' ? '待复核' : '已复核'}\n`;
        if (review) {
            report += `   复核意见：${review.opinion}\n`;
        }
        report += '\n';
    });

    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += '低风险项\n';
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    lowRisks.forEach((r, i) => {
        const review = appData.reviews[r.id];
        report += `${i + 1}. ${r.title}\n`;
        report += `   批次号：${r.batchNo}\n`;
        report += `   描述：${r.description}\n`;
        report += `   状态：${r.status === 'pending' ? '待复核' : '已复核'}\n`;
        if (review) {
            report += `   复核意见：${review.opinion}\n`;
        }
        report += '\n';
    });

    report += '========================================\n';
    report += '           报告结束\n';
    report += '========================================\n';

    document.getElementById('exportPreviewContent').textContent = report;
    downloadFile(report, '风险分析报告_' + new Date().toLocaleDateString('zh-CN') + '.txt', 'text/plain');
}

function exportAllData() {
    const data = {
        exportDate: new Date().toISOString(),
        materialBatches: appData.materialBatches,
        processingBatches: appData.processingBatches,
        storeFeedbacks: appData.storeFeedbacks,
        reviews: appData.reviews,
        risks: appData.risks
    };

    const json = JSON.stringify(data, null, 2);
    document.getElementById('exportPreviewContent').textContent = json;
    downloadFile(json, '全量数据_' + new Date().toLocaleDateString('zh-CN') + '.json', 'application/json');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('文件已下载');
}

function clearAllData() {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return;

    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });

    appData = {
        materialBatches: [],
        processingBatches: [],
        storeFeedbacks: [],
        reviews: {},
        risks: []
    };

    refreshDashboard();
    showToast('所有数据已清空');
}

function generateSampleData() {
    const sampleMaterials = [
        { batchNo: 'YL202401001', materialName: '土豆', quantity: 500, unit: 'kg', supplier: '绿源农场', inboundDate: '2024-01-05', expiryDate: '2024-02-05' },
        { batchNo: 'YL202401002', materialName: '西红柿', quantity: 300, unit: 'kg', supplier: '红太阳果蔬', inboundDate: '2024-01-08', expiryDate: '2024-01-25' },
        { batchNo: 'YL202401003', materialName: '鸡蛋', quantity: 200, unit: '箱', supplier: '正大蛋业', inboundDate: '2024-01-10', expiryDate: '2024-02-10' },
        { batchNo: 'YL202401004', materialName: '面粉', quantity: 800, unit: 'kg', supplier: '五得利面粉', inboundDate: '2024-01-12', expiryDate: '2024-07-12' },
        { batchNo: 'YL202312005', materialName: '青菜', quantity: 150, unit: 'kg', supplier: '绿源农场', inboundDate: '2023-12-28', expiryDate: '2024-01-10' },
        { batchNo: 'YL202401006', materialName: '猪肉', quantity: 400, unit: 'kg', supplier: '双汇食品', inboundDate: '2024-01-15', expiryDate: '2024-01-20' }
    ];

    const sampleProcessing = [
        {
            batchNo: 'JG202401001',
            productName: '土豆烧牛肉',
            materialBatchNos: ['YL202401001', 'YL202401006'],
            processDate: '2024-01-10',
            quantity: 500,
            deliveryStores: ['人民路店', '解放路店', '建设路店']
        },
        {
            batchNo: 'JG202401002',
            productName: '番茄炒蛋',
            materialBatchNos: ['YL202401002', 'YL202401003'],
            processDate: '2024-01-12',
            quantity: 300,
            deliveryStores: ['人民路店', '解放路店']
        },
        {
            batchNo: 'JG202401003',
            productName: '小笼包',
            materialBatchNos: ['YL202401004', 'YL202401003'],
            processDate: '2024-01-13',
            quantity: 1000,
            deliveryStores: ['人民路店', '解放路店', '建设路店', '长江路店']
        },
        {
            batchNo: 'JG202401004',
            productName: '清炒时蔬',
            materialBatchNos: ['YL202312005'],
            processDate: '2024-01-09',
            quantity: 200,
            deliveryStores: ['建设路店']
        },
        {
            batchNo: 'JG202401005',
            productName: '红烧肉',
            materialBatchNos: [],
            processDate: '2024-01-14',
            quantity: 350,
            deliveryStores: ['长江路店']
        }
    ];

    const sampleFeedbacks = [
        { feedbackId: 'FK202401001', storeName: '人民路店', deliveryBatchNo: 'JG202401001', feedbackDate: '2024-01-11', content: '土豆烧牛肉味道很好，客户反馈满意', feedbackType: 'positive' },
        { feedbackId: 'FK202401002', storeName: '解放路店', deliveryBatchNo: 'JG202401002', feedbackDate: '2024-01-13', content: '番茄炒蛋分量足，新鲜度好', feedbackType: 'positive' },
        { feedbackId: 'FK202401003', storeName: '建设路店', deliveryBatchNo: 'JG202401003', feedbackDate: '2024-01-14', content: '小笼包有几个破皮，请注意', feedbackType: 'warning' },
        { feedbackId: 'FK202401004', storeName: '长江路店', deliveryBatchNo: 'JG202401006', feedbackDate: '2024-01-15', content: '配送批次号与订单不一致', feedbackType: 'problem' },
        { feedbackId: 'FK202401005', storeName: '中心广场店', deliveryBatchNo: 'JG202401001', feedbackDate: '2024-01-11', content: '收到土豆烧牛肉，但我们店没有订这个', feedbackType: 'problem' }
    ];

    appData.materialBatches = sampleMaterials;
    appData.processingBatches = sampleProcessing;
    appData.storeFeedbacks = sampleFeedbacks;
    appData.reviews = {};

    saveData();
    detectRisks();
    refreshDashboard();

    showToast('示例数据已生成，共 ' + sampleMaterials.length + ' 批原料、' + sampleProcessing.length + ' 批加工、' + sampleFeedbacks.length + ' 条反馈');
}

document.addEventListener('DOMContentLoaded', init);
