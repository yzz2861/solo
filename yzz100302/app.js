(function() {
    'use strict';

    const STORAGE_KEYS = {
        STACKS: 'danger_yard_stacks',
        DECLARATIONS: 'danger_yard_declarations',
        LOCKDOWNS: 'danger_yard_lockdowns',
        CONTAINERS: 'danger_yard_containers',
        REVIEW_RECORDS: 'danger_yard_reviews'
    };

    const SAFETY_DISTANCE = 3;
    const ZONE_TYPES = { A: 'A类危化区', B: 'B类危化区', N: '普通区' };
    const CONTAINER_STATUS = {
        declared: '已申报',
        entered: '已入场',
        reviewed: '已复核',
        released: '已释放'
    };
    const LOCKDOWN_STATUS = {
        active: '封控中',
        released: '已解除'
    };

    function getData(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    function setData(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getStacks() {
        return getData(STORAGE_KEYS.STACKS, []);
    }

    function setStacks(stacks) {
        setData(STORAGE_KEYS.STACKS, stacks);
    }

    function getDeclarations() {
        return getData(STORAGE_KEYS.DECLARATIONS, []);
    }

    function setDeclarations(declarations) {
        setData(STORAGE_KEYS.DECLARATIONS, declarations);
    }

    function getLockdowns() {
        return getData(STORAGE_KEYS.LOCKDOWNS, []);
    }

    function setLockdowns(lockdowns) {
        setData(STORAGE_KEYS.LOCKDOWNS, lockdowns);
    }

    function getContainers() {
        return getData(STORAGE_KEYS.CONTAINERS, []);
    }

    function setContainers(containers) {
        setData(STORAGE_KEYS.CONTAINERS, containers);
    }

    function getReviewRecords() {
        return getData(STORAGE_KEYS.REVIEW_RECORDS, {});
    }

    function setReviewRecords(records) {
        setData(STORAGE_KEYS.REVIEW_RECORDS, records);
    }

    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length !== headers.length) continue;

            const obj = {};
            headers.forEach((header, idx) => {
                obj[header] = values[idx];
            });
            result.push(obj);
        }

        return result;
    }

    function parseJSON(jsonText) {
        try {
            return JSON.parse(jsonText);
        } catch (e) {
            return null;
        }
    }

    function formatDateTime(isoString) {
        if (!isoString) return '-';
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        return d.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function calculateDistance(stack1, stack2) {
        const dx = Math.abs((stack1.row || 0) - (stack2.row || 0));
        const dy = Math.abs((stack1.col || 0) - (stack2.col || 0));
        return Math.sqrt(dx * dx + dy * dy);
    }

    function importStacks(csvText) {
        const parsed = parseCSV(csvText);
        if (!parsed.length) {
            return { success: false, message: 'CSV解析失败或无数据', added: 0, updated: 0 };
        }

        const existingStacks = getStacks();
        const stackMap = new Map();
        existingStacks.forEach(s => stackMap.set(s.stackId, s));

        let added = 0;
        let updated = 0;

        parsed.forEach(item => {
            const stackId = item.stackid || item.stackId;
            if (!stackId) return;

            const newStack = {
                stackId: stackId,
                name: item.name || stackId,
                row: parseInt(item.row) || 0,
                col: parseInt(item.col) || 0,
                zoneType: item.zonetype || item.zoneType || 'N',
                capacity: parseInt(item.capacity) || 1
            };

            if (stackMap.has(stackId)) {
                Object.assign(stackMap.get(stackId), newStack);
                updated++;
            } else {
                stackMap.set(stackId, newStack);
                added++;
            }
        });

        const newStacks = Array.from(stackMap.values());
        setStacks(newStacks);

        return { success: true, message: `导入成功`, added, updated };
    }

    function importDeclarations(jsonText) {
        let parsed = parseJSON(jsonText);
        if (!parsed) {
            return { success: false, message: 'JSON解析失败', added: 0, updated: 0 };
        }

        if (!Array.isArray(parsed)) {
            parsed = [parsed];
        }

        const existingDeclarations = getDeclarations();
        const declMap = new Map();
        existingDeclarations.forEach(d => declMap.set(d.containerId, d));

        const existingContainers = getContainers();
        const containerMap = new Map();
        existingContainers.forEach(c => containerMap.set(c.containerId, c));

        const stacks = getStacks();
        const stackMap = new Map();
        stacks.forEach(s => stackMap.set(s.stackId, s));

        let added = 0;
        let updated = 0;

        parsed.forEach(item => {
            const containerId = item.containerId;
            if (!containerId) return;

            const newDecl = {
                containerId: containerId,
                cargoName: item.cargoName || '未知货物',
                hazardClass: item.hazardClass || 'N',
                declaredStack: item.declaredStack || '',
                declareTime: item.declareTime || new Date().toISOString(),
                weight: item.weight || 0
            };

            if (declMap.has(containerId)) {
                const existing = declMap.get(containerId);
                const prevStack = existing.declaredStack;
                Object.assign(existing, newDecl);
                updated++;

                if (containerMap.has(containerId)) {
                    const container = containerMap.get(containerId);
                    if (container.status !== 'released' && prevStack !== newDecl.declaredStack) {
                        container.currentStack = newDecl.declaredStack;
                        container.hazardClass = newDecl.hazardClass;
                        container.cargoName = newDecl.cargoName;
                    }
                }
            } else {
                declMap.set(containerId, newDecl);
                added++;

                if (!containerMap.has(containerId)) {
                    containerMap.set(containerId, {
                        containerId: containerId,
                        cargoName: newDecl.cargoName,
                        hazardClass: newDecl.hazardClass,
                        currentStack: newDecl.declaredStack,
                        status: 'declared',
                        declareTime: newDecl.declareTime,
                        enterTime: null,
                        reviewTime: null,
                        releaseTime: null
                    });
                }
            }
        });

        setDeclarations(Array.from(declMap.values()));
        setContainers(Array.from(containerMap.values()));

        return { success: true, message: `导入成功`, added, updated };
    }

    function importLockdowns(jsonText) {
        let parsed = parseJSON(jsonText);
        if (!parsed) {
            return { success: false, message: 'JSON解析失败', added: 0, updated: 0 };
        }

        if (!Array.isArray(parsed)) {
            parsed = [parsed];
        }

        const existingLockdowns = getLockdowns();
        const lockdownMap = new Map();
        existingLockdowns.forEach(l => lockdownMap.set(l.lockdownId, l));

        let added = 0;
        let updated = 0;

        parsed.forEach(item => {
            const lockdownId = item.lockdownId;
            if (!lockdownId) return;

            const newLockdown = {
                lockdownId: lockdownId,
                stackId: item.stackId || '',
                reason: item.reason || '未说明',
                startTime: item.startTime || new Date().toISOString(),
                endTime: item.endTime || null,
                status: item.status || 'active'
            };

            if (lockdownMap.has(lockdownId)) {
                Object.assign(lockdownMap.get(lockdownId), newLockdown);
                updated++;
            } else {
                lockdownMap.set(lockdownId, newLockdown);
                added++;
            }
        });

        setLockdowns(Array.from(lockdownMap.values()));

        return { success: true, message: `导入成功`, added, updated };
    }

    function detectAnomalies() {
        const containers = getContainers().filter(c => c.status === 'entered' || c.status === 'reviewed');
        const stacks = getStacks();
        const lockdowns = getLockdowns().filter(l => l.status === 'active');
        const declarations = getDeclarations();

        const stackMap = new Map();
        stacks.forEach(s => stackMap.set(s.stackId, s));

        const declMap = new Map();
        declarations.forEach(d => declMap.set(d.containerId, d));

        const activeLockdownMap = new Map();
        lockdowns.forEach(l => {
            if (!activeLockdownMap.has(l.stackId)) {
                activeLockdownMap.set(l.stackId, []);
            }
            activeLockdownMap.get(l.stackId).push(l);
        });

        const distanceAnomalies = [];
        for (let i = 0; i < containers.length; i++) {
            for (let j = i + 1; j < containers.length; j++) {
                const c1 = containers[i];
                const c2 = containers[j];

                if (!c1.currentStack || !c2.currentStack) continue;
                if (c1.currentStack === c2.currentStack) continue;

                const s1 = stackMap.get(c1.currentStack);
                const s2 = stackMap.get(c2.currentStack);
                if (!s1 || !s2) continue;

                const h1 = c1.hazardClass;
                const h2 = c2.hazardClass;

                const isHazardPair = (h1 === 'A' && h2 === 'B') || (h1 === 'B' && h2 === 'A');
                if (!isHazardPair) continue;

                const distance = calculateDistance(s1, s2);
                if (distance < SAFETY_DISTANCE) {
                    distanceAnomalies.push({
                        containerA: c1.containerId,
                        hazardA: h1,
                        stackA: c1.currentStack,
                        containerB: c2.containerId,
                        hazardB: h2,
                        stackB: c2.currentStack,
                        distance: distance.toFixed(2),
                        safeDistance: SAFETY_DISTANCE
                    });
                }
            }
        }

        const lockdownAnomalies = [];
        containers.forEach(c => {
            if (!c.currentStack) return;
            if (activeLockdownMap.has(c.currentStack)) {
                const lockdownList = activeLockdownMap.get(c.currentStack);
                lockdownList.forEach(l => {
                    lockdownAnomalies.push({
                        containerId: c.containerId,
                        stackId: c.currentStack,
                        reason: l.reason,
                        startTime: l.startTime,
                        endTime: l.endTime
                    });
                });
            }
        });

        const mismatchAnomalies = [];
        containers.forEach(c => {
            if (!c.currentStack) return;
            const stack = stackMap.get(c.currentStack);
            if (!stack) return;

            const hazard = c.hazardClass;
            const zone = stack.zoneType;

            let mismatch = false;
            let note = '';

            if (hazard === 'A' && zone !== 'A') {
                mismatch = true;
                note = 'A类危化品应存放于A类危化区';
            } else if (hazard === 'B' && zone !== 'A' && zone !== 'B') {
                mismatch = true;
                note = 'B类危化品应存放于A类或B类危化区';
            } else if (hazard === 'N' && (zone === 'A' || zone === 'B')) {
                mismatch = false;
            }

            if (mismatch) {
                mismatchAnomalies.push({
                    containerId: c.containerId,
                    hazardClass: hazard,
                    stackId: c.currentStack,
                    zoneType: zone,
                    note: note
                });
            }
        });

        return {
            distanceAnomalies,
            lockdownAnomalies,
            mismatchAnomalies
        };
    }

    function enterContainer(containerId) {
        const containers = getContainers();
        const container = containers.find(c => c.containerId === containerId);
        if (!container) return { success: false, message: '货箱不存在' };

        if (container.status !== 'declared') {
            return { success: false, message: `当前状态为${CONTAINER_STATUS[container.status]}，无法入场` };
        }

        container.status = 'entered';
        container.enterTime = new Date().toISOString();
        setContainers(containers);

        return { success: true, message: '入场成功' };
    }

    function releaseContainer(containerId) {
        const containers = getContainers();
        const container = containers.find(c => c.containerId === containerId);
        if (!container) return { success: false, message: '货箱不存在' };

        if (container.status === 'released') {
            return { success: false, message: '货箱已释放' };
        }

        container.status = 'released';
        container.releaseTime = new Date().toISOString();
        setContainers(containers);

        return { success: true, message: '释放成功' };
    }

    function saveReview(containerId, opinion, result) {
        const containers = getContainers();
        const container = containers.find(c => c.containerId === containerId);
        if (!container) return { success: false, message: '货箱不存在' };

        if (container.status === 'declared' || container.status === 'released') {
            return { success: false, message: '当前状态无法复核' };
        }

        const reviewRecords = getReviewRecords();
        reviewRecords[containerId] = {
            containerId,
            opinion,
            result,
            reviewTime: new Date().toISOString()
        };
        setReviewRecords(reviewRecords);

        container.status = 'reviewed';
        container.reviewTime = new Date().toISOString();
        container.reviewResult = result;
        setContainers(containers);

        return { success: true, message: '复核意见已保存' };
    }

    function generateReport() {
        const stacks = getStacks();
        const containers = getContainers();
        const declarations = getDeclarations();
        const lockdowns = getLockdowns();
        const reviewRecords = getReviewRecords();
        const anomalies = detectAnomalies();

        const activeContainers = containers.filter(c => c.status !== 'released');
        const enteredContainers = containers.filter(c => c.status === 'entered' || c.status === 'reviewed');
        const pendingDeclarations = declarations.filter(d => {
            const c = containers.find(cc => cc.containerId === d.containerId);
            return c && c.status === 'declared';
        });
        const activeLockdowns = lockdowns.filter(l => l.status === 'active');
        const reviewedToday = containers.filter(c => {
            if (c.status !== 'reviewed' || !c.reviewTime) return false;
            const reviewDate = new Date(c.reviewTime).toDateString();
            const today = new Date().toDateString();
            return reviewDate === today;
        });

        let reportHtml = '';
        reportHtml += '<div class="report-header">';
        reportHtml += '<h2>港口危化品堆场交班报告</h2>';
        reportHtml += `<p>交班时间：${formatDateTime(new Date().toISOString())}</p>`;
        reportHtml += '</div>';

        reportHtml += '<div class="report-section">';
        reportHtml += '<h4>一、总体概况</h4>';
        reportHtml += '<ul>';
        reportHtml += `<li>堆位总数：<strong>${stacks.length}</strong> 个</li>`;
        reportHtml += `<li>在港货箱：<strong>${activeContainers.length}</strong> 个</li>`;
        reportHtml += `<li>已入场堆存：<strong>${enteredContainers.length}</strong> 个</li>`;
        reportHtml += `<li>待入场申报：<strong>${pendingDeclarations.length}</strong> 个</li>`;
        reportHtml += `<li>今日已复核：<strong>${reviewedToday.length}</strong> 个</li>`;
        reportHtml += `<li>封控堆位数：<strong>${activeLockdowns.length}</strong> 个</li>`;
        reportHtml += '</ul>';
        reportHtml += '</div>';

        const totalAnomalies = anomalies.distanceAnomalies.length + anomalies.lockdownAnomalies.length + anomalies.mismatchAnomalies.length;
        reportHtml += '<div class="report-section">';
        reportHtml += '<h4>二、异常情况</h4>';
        if (totalAnomalies === 0) {
            reportHtml += '<p style="color: #38a169;">暂无异常</p>';
        } else {
            reportHtml += `<p class="warning-text">共发现 ${totalAnomalies} 项异常，请重点关注：</p>`;
            reportHtml += '<ul>';
            reportHtml += `<li>隔离距离不足：<strong>${anomalies.distanceAnomalies.length}</strong> 处</li>`;
            reportHtml += `<li>封控堆位误用：<strong>${anomalies.lockdownAnomalies.length}</strong> 处</li>`;
            reportHtml += `<li>类别不一致：<strong>${anomalies.mismatchAnomalies.length}</strong> 处</li>`;
            reportHtml += '</ul>';
        }
        reportHtml += '</div>';

        if (anomalies.distanceAnomalies.length > 0) {
            reportHtml += '<div class="report-section">';
            reportHtml += '<h4>三、隔离距离不足详情</h4>';
            reportHtml += '<table><thead><tr><th>箱号A</th><th>类别</th><th>堆位A</th><th>箱号B</th><th>类别</th><th>堆位B</th><th>距离</th></tr></thead><tbody>';
            anomalies.distanceAnomalies.forEach(a => {
                reportHtml += `<tr><td>${a.containerA}</td><td>${a.hazardA}类</td><td>${a.stackA}</td><td>${a.containerB}</td><td>${a.hazardB}类</td><td>${a.stackB}</td><td>${a.distance}</td></tr>`;
            });
            reportHtml += '</tbody></table>';
            reportHtml += '</div>';
        }

        if (anomalies.lockdownAnomalies.length > 0) {
            reportHtml += '<div class="report-section">';
            reportHtml += '<h4>四、封控堆位误用详情</h4>';
            reportHtml += '<table><thead><tr><th>箱号</th><th>占用堆位</th><th>封控原因</th><th>开始时间</th></tr></thead><tbody>';
            anomalies.lockdownAnomalies.forEach(a => {
                reportHtml += `<tr><td>${a.containerId}</td><td>${a.stackId}</td><td>${a.reason}</td><td>${formatDateTime(a.startTime)}</td></tr>`;
            });
            reportHtml += '</tbody></table>';
            reportHtml += '</div>';
        }

        if (anomalies.mismatchAnomalies.length > 0) {
            reportHtml += '<div class="report-section">';
            reportHtml += '<h4>五、类别不一致详情</h4>';
            reportHtml += '<table><thead><tr><th>箱号</th><th>申报类别</th><th>堆位</th><th>台账区域</th><th>说明</th></tr></thead><tbody>';
            anomalies.mismatchAnomalies.forEach(a => {
                reportHtml += `<tr><td>${a.containerId}</td><td>${a.hazardClass}类</td><td>${a.stackId}</td><td>${ZONE_TYPES[a.zoneType] || a.zoneType}</td><td>${a.note}</td></tr>`;
            });
            reportHtml += '</tbody></table>';
            reportHtml += '</div>';
        }

        reportHtml += '<div class="report-section">';
        reportHtml += '<h4>六、在港货箱清单</h4>';
        if (activeContainers.length === 0) {
            reportHtml += '<p>暂无在港货箱</p>';
        } else {
            reportHtml += '<table><thead><tr><th>箱号</th><th>货名</th><th>类别</th><th>堆位</th><th>状态</th><th>入场时间</th><th>复核意见</th></tr></thead><tbody>';
            activeContainers.forEach(c => {
                const review = reviewRecords[c.containerId];
                reportHtml += `<tr><td>${c.containerId}</td><td>${c.cargoName}</td><td>${c.hazardClass}类</td><td>${c.currentStack || '-'}</td><td>${CONTAINER_STATUS[c.status] || c.status}</td><td>${formatDateTime(c.enterTime)}</td><td>${review ? review.opinion : '-'}</td></tr>`;
            });
            reportHtml += '</tbody></table>';
        }
        reportHtml += '</div>';

        if (activeLockdowns.length > 0) {
            reportHtml += '<div class="report-section">';
            reportHtml += '<h4>七、生效中封控</h4>';
            reportHtml += '<table><thead><tr><th>封控编号</th><th>堆位</th><th>原因</th><th>开始时间</th></tr></thead><tbody>';
            activeLockdowns.forEach(l => {
                reportHtml += `<tr><td>${l.lockdownId}</td><td>${l.stackId}</td><td>${l.reason}</td><td>${formatDateTime(l.startTime)}</td></tr>`;
            });
            reportHtml += '</tbody></table>';
            reportHtml += '</div>';
        }

        reportHtml += '<div class="report-section">';
        reportHtml += '<h4>八、交班说明</h4>';
        reportHtml += '<ul>';
        reportHtml += '<li>请接班人员重点关注上述异常情况</li>';
        reportHtml += '<li>待入场申报请及时安排入位</li>';
        reportHtml += '<li>封控堆位严禁安排新的货箱入场</li>';
        reportHtml += '</ul>';
        reportHtml += '</div>';

        return reportHtml;
    }

    function downloadReport() {
        const reportHtml = generateReport();
        const fullHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>港口危化品堆场交班报告</title>
    <style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 30px; line-height: 1.6; color: #333; }
        h2 { text-align: center; color: #1a202c; margin-bottom: 5px; }
        h4 { color: #2c5282; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
        th, td { padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; }
        th { background: #f7fafc; }
        .report-header { text-align: center; margin-bottom: 24px; }
        .report-header p { color: #718096; margin: 0; }
        ul { margin-left: 20px; }
        .warning-text { color: #c53030; font-weight: bold; }
        strong { color: #2c5282; }
        .report-section { margin-bottom: 20px; }
    </style>
</head>
<body>
${reportHtml}
</body>
</html>
        `;

        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const dateStr = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') +
            '_' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0');
        a.href = url;
        a.download = `交班报告_${dateStr}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function renderStacks() {
        const stacks = getStacks();
        const searchTerm = document.getElementById('search-stacks').value.toLowerCase();
        const zoneFilter = document.getElementById('filter-zone-type').value;

        let filtered = stacks.filter(s => {
            const matchSearch = s.stackId.toLowerCase().includes(searchTerm) ||
                (s.name && s.name.toLowerCase().includes(searchTerm));
            const matchZone = !zoneFilter || s.zoneType === zoneFilter;
            return matchSearch && matchZone;
        });

        document.getElementById('stat-stacks').textContent = filtered.length;

        const tbody = document.querySelector('#table-stacks tbody');
        tbody.innerHTML = '';

        const activeContainers = getContainers().filter(c => c.status !== 'released');
        const stackOccupancy = {};
        activeContainers.forEach(c => {
            if (c.currentStack) {
                stackOccupancy[c.currentStack] = (stackOccupancy[c.currentStack] || 0) + 1;
            }
        });

        filtered.forEach(stack => {
            const tr = document.createElement('tr');
            const occupied = stackOccupancy[stack.stackId] || 0;
            const available = stack.capacity - occupied;
            const statusText = available > 0 ? `可用 ${available}/${stack.capacity}` : `已满 ${occupied}/${stack.capacity}`;
            const statusClass = available > 0 ? 'zone-n' : 'zone-a';

            tr.innerHTML = `
                <td><strong>${stack.stackId}</strong></td>
                <td>${stack.name || '-'}</td>
                <td>${stack.row}</td>
                <td>${stack.col}</td>
                <td><span class="badge zone-${stack.zoneType.toLowerCase()}">${ZONE_TYPES[stack.zoneType] || stack.zoneType}</span></td>
                <td>${stack.capacity}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
            `;
            tbody.appendChild(tr);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#a0aec0;padding:30px;">暂无数据</td></tr>';
        }
    }

    function renderDeclarations() {
        const declarations = getDeclarations();
        const containers = getContainers();
        const searchTerm = document.getElementById('search-declarations').value.toLowerCase();
        const statusFilter = document.getElementById('filter-declaration-status').value;

        const containerMap = new Map();
        containers.forEach(c => containerMap.set(c.containerId, c));

        let filtered = declarations.filter(d => {
            const container = containerMap.get(d.containerId);
            const status = container ? container.status : 'pending';

            const matchSearch = d.containerId.toLowerCase().includes(searchTerm) ||
                (d.cargoName && d.cargoName.toLowerCase().includes(searchTerm));
            const matchStatus = !statusFilter || status === statusFilter;
            return matchSearch && matchStatus;
        });

        document.getElementById('stat-declarations').textContent = filtered.length;

        const tbody = document.querySelector('#table-declarations tbody');
        tbody.innerHTML = '';

        filtered.sort((a, b) => new Date(b.declareTime) - new Date(a.declareTime));

        filtered.forEach(decl => {
            const container = containerMap.get(decl.containerId);
            const status = container ? container.status : 'declared';
            const statusText = CONTAINER_STATUS[status] || status;
            const statusClass = 'status-' + status;

            const canEnter = status === 'declared';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${decl.containerId}</strong></td>
                <td>${decl.cargoName || '-'}</td>
                <td><span class="badge zone-${decl.hazardClass.toLowerCase()}">${decl.hazardClass}类</span></td>
                <td>${decl.declaredStack || '-'}</td>
                <td>${formatDateTime(decl.declareTime)}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td class="action-buttons">
                    ${canEnter ? `<button class="btn btn-success btn-small" onclick="app.enterContainer('${decl.containerId}')">确认入场</button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#a0aec0;padding:30px;">暂无数据</td></tr>';
        }
    }

    function renderContainers() {
        const containers = getContainers();
        const reviewRecords = getReviewRecords();
        const searchTerm = document.getElementById('search-containers').value.toLowerCase();
        const statusFilter = document.getElementById('filter-container-status').value;

        let filtered = containers.filter(c => {
            const matchSearch = c.containerId.toLowerCase().includes(searchTerm) ||
                (c.cargoName && c.cargoName.toLowerCase().includes(searchTerm));
            const matchStatus = !statusFilter || c.status === statusFilter;
            return matchSearch && matchStatus;
        });

        document.getElementById('stat-containers').textContent = filtered.length;

        const tbody = document.querySelector('#table-containers tbody');
        tbody.innerHTML = '';

        filtered.sort((a, b) => {
            const timeA = a.enterTime || a.declareTime || '';
            const timeB = b.enterTime || b.declareTime || '';
            return new Date(timeB) - new Date(timeA);
        });

        filtered.forEach(c => {
            const review = reviewRecords[c.containerId];
            const reviewOpinion = review ? review.opinion : '-';
            const statusText = CONTAINER_STATUS[c.status] || c.status;
            const statusClass = 'status-' + c.status;

            const canReview = c.status === 'entered' || c.status === 'reviewed';
            const canRelease = c.status !== 'released' && c.status !== 'declared';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${c.containerId}</strong></td>
                <td>${c.cargoName || '-'}</td>
                <td><span class="badge zone-${c.hazardClass.toLowerCase()}">${c.hazardClass}类</span></td>
                <td>${c.currentStack || '-'}</td>
                <td>${formatDateTime(c.enterTime)}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${reviewOpinion}">${reviewOpinion}</td>
                <td class="action-buttons">
                    ${canReview ? `<button class="btn btn-warning btn-small" onclick="app.openReviewModal('${c.containerId}')">复核</button>` : ''}
                    ${canRelease ? `<button class="btn btn-danger btn-small" onclick="app.releaseContainer('${c.containerId}')">释放</button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#a0aec0;padding:30px;">暂无数据</td></tr>';
        }
    }

    function renderAnomalies() {
        const anomalies = detectAnomalies();

        document.getElementById('count-distance').textContent = anomalies.distanceAnomalies.length;
        document.getElementById('count-lockdown').textContent = anomalies.lockdownAnomalies.length;
        document.getElementById('count-mismatch').textContent = anomalies.mismatchAnomalies.length;

        document.getElementById('badge-distance').textContent = anomalies.distanceAnomalies.length;
        document.getElementById('badge-lockdown').textContent = anomalies.lockdownAnomalies.length;
        document.getElementById('badge-mismatch').textContent = anomalies.mismatchAnomalies.length;

        const distTbody = document.querySelector('#table-distance-anomalies tbody');
        distTbody.innerHTML = '';
        anomalies.distanceAnomalies.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${a.containerA}</strong></td>
                <td><span class="badge zone-${a.hazardA.toLowerCase()}">${a.hazardA}类</span></td>
                <td>${a.stackA}</td>
                <td><strong>${a.containerB}</strong></td>
                <td><span class="badge zone-${a.hazardB.toLowerCase()}">${a.hazardB}类</span></td>
                <td>${a.stackB}</td>
                <td style="color:#c53030;font-weight:bold;">${a.distance}</td>
                <td>${a.safeDistance}</td>
            `;
            distTbody.appendChild(tr);
        });
        if (anomalies.distanceAnomalies.length === 0) {
            distTbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#a0aec0;padding:30px;">暂无异常</td></tr>';
        }

        const lockTbody = document.querySelector('#table-lockdown-anomalies tbody');
        lockTbody.innerHTML = '';
        anomalies.lockdownAnomalies.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${a.containerId}</strong></td>
                <td>${a.stackId}</td>
                <td>${a.reason}</td>
                <td>${formatDateTime(a.startTime)}</td>
                <td>${a.endTime ? formatDateTime(a.endTime) : '-'}</td>
            `;
            lockTbody.appendChild(tr);
        });
        if (anomalies.lockdownAnomalies.length === 0) {
            lockTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#a0aec0;padding:30px;">暂无异常</td></tr>';
        }

        const misTbody = document.querySelector('#table-mismatch-anomalies tbody');
        misTbody.innerHTML = '';
        anomalies.mismatchAnomalies.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${a.containerId}</strong></td>
                <td><span class="badge zone-${a.hazardClass.toLowerCase()}">${a.hazardClass}类</span></td>
                <td>${a.stackId}</td>
                <td><span class="badge zone-${a.zoneType.toLowerCase()}">${ZONE_TYPES[a.zoneType] || a.zoneType}</span></td>
                <td>${a.note}</td>
            `;
            misTbody.appendChild(tr);
        });
        if (anomalies.mismatchAnomalies.length === 0) {
            misTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#a0aec0;padding:30px;">暂无异常</td></tr>';
        }
    }

    function renderLockdowns() {
        const lockdowns = getLockdowns();
        const statusFilter = document.getElementById('filter-lockdown-status').value;

        let filtered = lockdowns.filter(l => !statusFilter || l.status === statusFilter);
        document.getElementById('stat-lockdowns').textContent = filtered.length;

        const tbody = document.querySelector('#table-lockdowns tbody');
        tbody.innerHTML = '';

        filtered.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        filtered.forEach(l => {
            const statusText = LOCKDOWN_STATUS[l.status] || l.status;
            const statusClass = 'status-' + l.status;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${l.lockdownId}</strong></td>
                <td>${l.stackId}</td>
                <td>${l.reason}</td>
                <td>${formatDateTime(l.startTime)}</td>
                <td>${l.endTime ? formatDateTime(l.endTime) : '-'}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
            `;
            tbody.appendChild(tr);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#a0aec0;padding:30px;">暂无数据</td></tr>';
        }
    }

    function renderAll() {
        renderStacks();
        renderDeclarations();
        renderContainers();
        renderAnomalies();
        renderLockdowns();
        updateImportStatus();
    }

    function updateImportStatus() {
        const stacks = getStacks();
        const declarations = getDeclarations();
        const lockdowns = getLockdowns();

        const stacksEl = document.getElementById('status-stacks');
        const declEl = document.getElementById('status-declarations');
        const lockEl = document.getElementById('status-lockdowns');

        if (stacks.length > 0) {
            stacksEl.textContent = `已导入 ${stacks.length} 个堆位`;
            stacksEl.className = 'import-status success';
        } else {
            stacksEl.textContent = '未导入';
            stacksEl.className = 'import-status';
        }

        if (declarations.length > 0) {
            declEl.textContent = `已导入 ${declarations.length} 条申报`;
            declEl.className = 'import-status success';
        } else {
            declEl.textContent = '未导入';
            declEl.className = 'import-status';
        }

        if (lockdowns.length > 0) {
            lockEl.textContent = `已导入 ${lockdowns.length} 条封控`;
            lockEl.className = 'import-status success';
        } else {
            lockEl.textContent = '未导入';
            lockEl.className = 'import-status';
        }
    }

    function loadSampleData() {
        const sampleStacks = [
            { stackId: 'A01', name: 'A区01位', row: 1, col: 1, zoneType: 'A', capacity: 2 },
            { stackId: 'A02', name: 'A区02位', row: 1, col: 2, zoneType: 'A', capacity: 2 },
            { stackId: 'A03', name: 'A区03位', row: 1, col: 3, zoneType: 'A', capacity: 2 },
            { stackId: 'B01', name: 'B区01位', row: 2, col: 1, zoneType: 'B', capacity: 2 },
            { stackId: 'B02', name: 'B区02位', row: 2, col: 2, zoneType: 'B', capacity: 2 },
            { stackId: 'B03', name: 'B区03位', row: 2, col: 3, zoneType: 'B', capacity: 2 },
            { stackId: 'N01', name: '普通区01位', row: 3, col: 1, zoneType: 'N', capacity: 3 },
            { stackId: 'N02', name: '普通区02位', row: 3, col: 2, zoneType: 'N', capacity: 3 },
            { stackId: 'N03', name: '普通区03位', row: 3, col: 3, zoneType: 'N', capacity: 3 },
            { stackId: 'N04', name: '普通区04位', row: 4, col: 1, zoneType: 'N', capacity: 3 },
            { stackId: 'N05', name: '普通区05位', row: 4, col: 2, zoneType: 'N', capacity: 3 },
            { stackId: 'N06', name: '普通区06位', row: 4, col: 3, zoneType: 'N', capacity: 3 }
        ];

        const sampleDeclarations = [
            { containerId: 'CNTR001', cargoName: '甲醇', hazardClass: 'A', declaredStack: 'A01', declareTime: '2026-06-09T08:00:00', weight: 20 },
            { containerId: 'CNTR002', cargoName: '乙醇', hazardClass: 'B', declaredStack: 'B01', declareTime: '2026-06-09T08:30:00', weight: 18 },
            { containerId: 'CNTR003', cargoName: '丙酮', hazardClass: 'A', declaredStack: 'A02', declareTime: '2026-06-09T09:00:00', weight: 22 },
            { containerId: 'CNTR004', cargoName: '柴油', hazardClass: 'B', declaredStack: 'A03', declareTime: '2026-06-09T09:30:00', weight: 25 },
            { containerId: 'CNTR005', cargoName: '润滑油', hazardClass: 'N', declaredStack: 'N01', declareTime: '2026-06-09T10:00:00', weight: 15 },
            { containerId: 'CNTR006', cargoName: '苯乙烯', hazardClass: 'A', declaredStack: 'B02', declareTime: '2026-06-09T10:30:00', weight: 20 },
            { containerId: 'CNTR007', cargoName: '醋酸乙酯', hazardClass: 'B', declaredStack: 'N02', declareTime: '2026-06-09T11:00:00', weight: 16 }
        ];

        const sampleLockdowns = [
            { lockdownId: 'LD001', stackId: 'N03', reason: '设备检修', startTime: '2026-06-08T00:00:00', endTime: null, status: 'active' },
            { lockdownId: 'LD002', stackId: 'B03', reason: '安全检查', startTime: '2026-06-07T00:00:00', endTime: '2026-06-08T23:59:59', status: 'released' }
        ];

        setStacks(sampleStacks);
        setDeclarations(sampleDeclarations);
        setLockdowns(sampleLockdowns);

        const containers = [
            {
                containerId: 'CNTR001',
                cargoName: '甲醇',
                hazardClass: 'A',
                currentStack: 'A01',
                status: 'entered',
                declareTime: '2026-06-09T08:00:00',
                enterTime: '2026-06-09T09:00:00',
                reviewTime: null,
                releaseTime: null
            },
            {
                containerId: 'CNTR002',
                cargoName: '乙醇',
                hazardClass: 'B',
                currentStack: 'B01',
                status: 'reviewed',
                declareTime: '2026-06-09T08:30:00',
                enterTime: '2026-06-09T09:30:00',
                reviewTime: '2026-06-09T10:00:00',
                releaseTime: null
            },
            {
                containerId: 'CNTR003',
                cargoName: '丙酮',
                hazardClass: 'A',
                currentStack: 'A02',
                status: 'entered',
                declareTime: '2026-06-09T09:00:00',
                enterTime: '2026-06-09T10:00:00',
                reviewTime: null,
                releaseTime: null
            },
            {
                containerId: 'CNTR004',
                cargoName: '柴油',
                hazardClass: 'B',
                currentStack: 'A03',
                status: 'declared',
                declareTime: '2026-06-09T09:30:00',
                enterTime: null,
                reviewTime: null,
                releaseTime: null
            },
            {
                containerId: 'CNTR005',
                cargoName: '润滑油',
                hazardClass: 'N',
                currentStack: 'N01',
                status: 'entered',
                declareTime: '2026-06-09T10:00:00',
                enterTime: '2026-06-09T11:00:00',
                reviewTime: null,
                releaseTime: null
            },
            {
                containerId: 'CNTR006',
                cargoName: '苯乙烯',
                hazardClass: 'A',
                currentStack: 'B02',
                status: 'declared',
                declareTime: '2026-06-09T10:30:00',
                enterTime: null,
                reviewTime: null,
                releaseTime: null
            },
            {
                containerId: 'CNTR007',
                cargoName: '醋酸乙酯',
                hazardClass: 'B',
                currentStack: 'N02',
                status: 'declared',
                declareTime: '2026-06-09T11:00:00',
                enterTime: null,
                reviewTime: null,
                releaseTime: null
            }
        ];

        setContainers(containers);

        const reviewRecords = {
            'CNTR002': {
                containerId: 'CNTR002',
                opinion: '货箱完好，单证齐全，符合入库要求。',
                result: 'pass',
                reviewTime: '2026-06-09T10:00:00'
            }
        };
        setReviewRecords(reviewRecords);

        renderAll();
        alert('示例数据已加载！请切换到各标签页查看效果。');
    }

    let currentReviewContainerId = null;

    function openReviewModal(containerId) {
        const containers = getContainers();
        const container = containers.find(c => c.containerId === containerId);
        if (!container) return;

        const reviewRecords = getReviewRecords();
        const review = reviewRecords[containerId];

        currentReviewContainerId = containerId;
        document.getElementById('review-container-id').textContent = containerId;
        document.getElementById('review-current-status').textContent = CONTAINER_STATUS[container.status] || container.status;
        document.getElementById('review-opinion').value = review ? review.opinion : '';

        const resultRadios = document.querySelectorAll('input[name="review-result"]');
        resultRadios.forEach(radio => {
            radio.checked = (review && review.result === radio.value) || (!review && radio.value === 'pass');
        });

        document.getElementById('modal-review').classList.add('active');
    }

    function closeReviewModal() {
        document.getElementById('modal-review').classList.remove('active');
        currentReviewContainerId = null;
    }

    function handleSaveReview() {
        if (!currentReviewContainerId) return;

        const opinion = document.getElementById('review-opinion').value.trim();
        const resultRadio = document.querySelector('input[name="review-result"]:checked');
        const result = resultRadio ? resultRadio.value : 'pending';

        const res = saveReview(currentReviewContainerId, opinion, result);
        if (res.success) {
            closeReviewModal();
            renderAll();
        } else {
            alert(res.message);
        }
    }

    function handleEnterContainer(containerId) {
        const res = enterContainer(containerId);
        if (!res.success) {
            alert(res.message);
        } else {
            renderAll();
        }
    }

    function handleReleaseContainer(containerId) {
        if (!confirm(`确定要释放货箱 ${containerId} 吗？`)) return;
        const res = releaseContainer(containerId);
        if (!res.success) {
            alert(res.message);
        } else {
            renderAll();
        }
    }

    function showReport() {
        const reportHtml = generateReport();
        document.getElementById('report-content').innerHTML = reportHtml;
        document.getElementById('modal-report').classList.add('active');
    }

    function closeReport() {
        document.getElementById('modal-report').classList.remove('active');
    }

    function clearAllData() {
        if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return;
        if (!confirm('再次确认：真的要清空所有数据吗？')) return;

        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        renderAll();
        alert('所有数据已清空');
    }

    function handleFileStacks(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const result = importStacks(e.target.result);
            const statusEl = document.getElementById('status-stacks');
            if (result.success) {
                statusEl.textContent = `${result.message}（新增${result.added}，更新${result.updated}）`;
                statusEl.className = 'import-status success';
                renderAll();
            } else {
                statusEl.textContent = result.message;
                statusEl.className = 'import-status error';
            }
        };
        reader.readAsText(file);
    }

    function handleFileDeclarations(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const result = importDeclarations(e.target.result);
            const statusEl = document.getElementById('status-declarations');
            if (result.success) {
                statusEl.textContent = `${result.message}（新增${result.added}，更新${result.updated}）`;
                statusEl.className = 'import-status success';
                renderAll();
            } else {
                statusEl.textContent = result.message;
                statusEl.className = 'import-status error';
            }
        };
        reader.readAsText(file);
    }

    function handleFileLockdowns(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const result = importLockdowns(e.target.result);
            const statusEl = document.getElementById('status-lockdowns');
            if (result.success) {
                statusEl.textContent = `${result.message}（新增${result.added}，更新${result.updated}）`;
                statusEl.className = 'import-status success';
                renderAll();
            } else {
                statusEl.textContent = result.message;
                statusEl.className = 'import-status error';
            }
        };
        reader.readAsText(file);
    }

    function switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === 'tab-' + tabName);
        });

        if (tabName === 'anomalies') {
            renderAnomalies();
        }
    }

    function initEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        document.getElementById('file-stacks').addEventListener('change', handleFileStacks);
        document.getElementById('file-declarations').addEventListener('change', handleFileDeclarations);
        document.getElementById('file-lockdowns').addEventListener('change', handleFileLockdowns);

        document.getElementById('btn-load-sample').addEventListener('click', loadSampleData);
        document.getElementById('btn-export-report').addEventListener('click', showReport);
        document.getElementById('btn-clear-all').addEventListener('click', clearAllData);

        document.getElementById('search-stacks').addEventListener('input', renderStacks);
        document.getElementById('filter-zone-type').addEventListener('change', renderStacks);
        document.getElementById('search-declarations').addEventListener('input', renderDeclarations);
        document.getElementById('filter-declaration-status').addEventListener('change', renderDeclarations);
        document.getElementById('search-containers').addEventListener('input', renderContainers);
        document.getElementById('filter-container-status').addEventListener('change', renderContainers);
        document.getElementById('filter-lockdown-status').addEventListener('change', renderLockdowns);

        document.getElementById('btn-cancel-review').addEventListener('click', closeReviewModal);
        document.getElementById('btn-save-review').addEventListener('click', handleSaveReview);

        document.getElementById('btn-close-report').addEventListener('click', closeReport);
        document.getElementById('btn-download-report').addEventListener('click', downloadReport);

        document.getElementById('modal-review').addEventListener('click', function(e) {
            if (e.target === this) closeReviewModal();
        });
        document.getElementById('modal-report').addEventListener('click', function(e) {
            if (e.target === this) closeReport();
        });
    }

    function init() {
        initEventListeners();
        renderAll();
    }

    window.app = {
        openReviewModal: openReviewModal,
        enterContainer: handleEnterContainer,
        releaseContainer: handleReleaseContainer
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
