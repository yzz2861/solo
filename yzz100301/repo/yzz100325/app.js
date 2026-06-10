const AppState = {
    equipment: new Map(),
    reservations: new Map(),
    outages: new Map(),
    conflicts: [],
    importHashes: {
        equipment: new Set(),
        reservations: new Set(),
        outages: new Set()
    },
    filters: {
        equipmentId: '',
        person: '',
        conflictType: 'all',
        status: 'all'
    },
    currentReviewId: null,
    selectedReservations: new Set()
};

const Utils = {
    generateHash(data) {
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    },

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
        
        return data;
    },

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    },

    parseDateTime(dateStr) {
        if (!dateStr) return null;
        
        const formats = [
            /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
            /^(\d{4})\/(\d{2})\/(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
            /^(\d{4})-(\d{2})-(\d{2})$/,
            /^(\d{4})\/(\d{2})\/(\d{2})$/
        ];
        
        for (const format of formats) {
            const match = dateStr.match(format);
            if (match) {
                const [, year, month, day, hours = '00', minutes = '00', seconds = '00'] = match;
                return new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day),
                    parseInt(hours),
                    parseInt(minutes),
                    parseInt(seconds || '00')
                );
            }
        }
        
        const parsed = Date.parse(dateStr);
        if (!isNaN(parsed)) {
            return new Date(parsed);
        }
        
        return null;
    },

    formatDateTime(date) {
        if (!date) return '-';
        const d = new Date(date);
        const pad = n => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    timeOverlap(start1, end1, start2, end2) {
        const s1 = new Date(start1).getTime();
        const e1 = new Date(end1).getTime();
        const s2 = new Date(start2).getTime();
        const e2 = new Date(end2).getTime();
        return s1 < e2 && s2 < e1;
    },

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    },

    downloadFile(content, filename, mimeType = 'text/csv;charset=utf-8') {
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

const DataImporter = {
    async importEquipment(file) {
        const text = await file.text();
        const data = Utils.parseCSV(text);
        
        let added = 0;
        let duplicates = 0;
        
        for (const row of data) {
            const id = row['设备编号'] || row['equipment_id'] || row['id'];
            if (!id) continue;
            
            const hash = Utils.generateHash(JSON.stringify(row));
            
            if (AppState.importHashes.equipment.has(hash)) {
                duplicates++;
                continue;
            }
            
            AppState.importHashes.equipment.add(hash);
            
            AppState.equipment.set(id, {
                id,
                name: row['设备名称'] || row['name'] || '',
                type: row['设备类型'] || row['type'] || '',
                lab: row['所在实验室'] || row['实验室'] || row['lab'] || '',
                qualification: row['资格要求'] || row['使用资格'] || row['qualification'] || '',
                status: row['状态'] || row['status'] || '可用'
            });
            
            added++;
        }
        
        return { added, duplicates };
    },

    async importReservations(file) {
        const text = await file.text();
        let data;
        
        try {
            data = JSON.parse(text);
            if (Array.isArray(data.reservations)) {
                data = data.reservations;
            } else if (Array.isArray(data.data)) {
                data = data.data;
            }
        } catch (e) {
            throw new Error('JSON 格式解析失败');
        }
        
        if (!Array.isArray(data)) {
            throw new Error('预约数据格式错误，需要数组格式');
        }
        
        let added = 0;
        let duplicates = 0;
        
        for (const row of data) {
            const id = row['预约ID'] || row['reservation_id'] || row['id'];
            if (!id) continue;
            
            const hash = Utils.generateHash(JSON.stringify(row));
            
            if (AppState.importHashes.reservations.has(hash)) {
                duplicates++;
                continue;
            }
            
            AppState.importHashes.reservations.add(hash);
            
            const startTime = Utils.parseDateTime(row['开始时间'] || row['start_time'] || row['start']);
            const endTime = Utils.parseDateTime(row['结束时间'] || row['end_time'] || row['end']);
            
            AppState.reservations.set(id, {
                id,
                equipmentId: row['设备编号'] || row['equipment_id'] || row['equipmentId'] || '',
                person: row['预约人'] || row['申请人'] || row['person'] || row['applicant'] || '',
                personType: row['预约人类型'] || row['人员类型'] || row['person_type'] || row['personType'] || '学生',
                startTime,
                endTime,
                purpose: row['用途'] || row['purpose'] || '',
                status: row['状态'] || row['status'] || 'pending',
                reviewComment: row['复核意见'] || row['review_comment'] || '',
                reviewStatus: row['复核状态'] || row['review_status'] || 'pending',
                conflicts: []
            });
            
            added++;
        }
        
        return { added, duplicates };
    },

    async importOutages(file) {
        const text = await file.text();
        const data = Utils.parseCSV(text);
        
        let added = 0;
        let duplicates = 0;
        
        for (const row of data) {
            const id = row['停用记录ID'] || row['记录ID'] || row['id'];
            const equipmentId = row['设备编号'] || row['equipment_id'] || row['equipmentId'];
            if (!id && !equipmentId) continue;
            
            const recordId = id || `${equipmentId}-${row['开始时间'] || row['start_time']}`;
            
            const hash = Utils.generateHash(JSON.stringify(row));
            
            if (AppState.importHashes.outages.has(hash)) {
                duplicates++;
                continue;
            }
            
            AppState.importHashes.outages.add(hash);
            
            const startTime = Utils.parseDateTime(row['开始时间'] || row['start_time'] || row['start']);
            const endTime = Utils.parseDateTime(row['结束时间'] || row['end_time'] || row['end']);
            
            AppState.outages.set(recordId, {
                id: recordId,
                equipmentId,
                startTime,
                endTime,
                reason: row['停用原因'] || row['原因'] || row['reason'] || '',
                status: row['状态'] || row['status'] || 'active'
            });
            
            added++;
        }
        
        return { added, duplicates };
    }
};

const ConflictDetector = {
    detectAll() {
        AppState.conflicts = [];
        
        this.detectTimeConflicts();
        this.detectOutageConflicts();
        this.detectQualificationConflicts();
        
        this.updateReservationConflicts();
        
        return AppState.conflicts;
    },

    detectTimeConflicts() {
        const reservations = Array.from(AppState.reservations.values());
        
        for (let i = 0; i < reservations.length; i++) {
            for (let j = i + 1; j < reservations.length; j++) {
                const r1 = reservations[i];
                const r2 = reservations[j];
                
                if (r1.equipmentId !== r2.equipmentId) continue;
                if (!r1.startTime || !r1.endTime || !r2.startTime || !r2.endTime) continue;
                
                if (Utils.timeOverlap(r1.startTime, r1.endTime, r2.startTime, r2.endTime)) {
                    AppState.conflicts.push({
                        id: `time-${r1.id}-${r2.id}`,
                        type: 'time',
                        typeName: '时段冲突',
                        equipmentId: r1.equipmentId,
                        reservationIds: [r1.id, r2.id],
                        person: `${r1.person} / ${r2.person}`,
                        detail: `预约 ${r1.id} 与预约 ${r2.id} 在同一设备上时间重叠`,
                        severity: 'high'
                    });
                }
            }
        }
    },

    detectOutageConflicts() {
        for (const reservation of AppState.reservations.values()) {
            if (!reservation.startTime || !reservation.endTime) continue;
            
            for (const outage of AppState.outages.values()) {
                if (outage.equipmentId !== reservation.equipmentId) continue;
                if (!outage.startTime || !outage.endTime) continue;
                
                if (Utils.timeOverlap(reservation.startTime, reservation.endTime, outage.startTime, outage.endTime)) {
                    AppState.conflicts.push({
                        id: `outage-${reservation.id}-${outage.id}`,
                        type: 'outage',
                        typeName: '停用冲突',
                        equipmentId: reservation.equipmentId,
                        reservationIds: [reservation.id],
                        person: reservation.person,
                        detail: `设备处于停用期（${Utils.formatDateTime(outage.startTime)} ~ ${Utils.formatDateTime(outage.endTime)}），原因：${outage.reason || '未说明'}`,
                        severity: 'high'
                    });
                }
            }
        }
    },

    detectQualificationConflicts() {
        for (const reservation of AppState.reservations.values()) {
            const equipment = AppState.equipment.get(reservation.equipmentId);
            if (!equipment || !equipment.qualification) continue;
            
            const personType = reservation.personType || '';
            const requiredQual = equipment.qualification || '';
            
            const qualified = this.checkQualification(personType, requiredQual);
            
            if (!qualified) {
                AppState.conflicts.push({
                    id: `qual-${reservation.id}`,
                    type: 'qualification',
                    typeName: '资格不匹配',
                    equipmentId: reservation.equipmentId,
                    reservationIds: [reservation.id],
                    person: reservation.person,
                    detail: `预约人类型"${personType}"不满足设备资格要求"${requiredQual}"`,
                    severity: 'medium'
                });
            }
        }
    },

    checkQualification(personType, requiredQual) {
        if (!requiredQual) return true;
        if (!personType) return false;
        
        const qualMap = {
            '教师': ['教师', '教授', '副教授', '讲师', '研究员'],
            '研究生': ['研究生', '硕士生', '博士生', '博士研究生', '硕士研究生'],
            '本科生': ['本科生', '学生', '大学生'],
            '全员': ['教师', '研究生', '本科生', '学生', '教授', '副教授', '讲师', '研究员', '硕士生', '博士生', '博士研究生', '硕士研究生', '大学生']
        };
        
        const requiredTypes = [];
        for (const [key, values] of Object.entries(qualMap)) {
            if (requiredQual.includes(key)) {
                requiredTypes.push(...values);
            }
        }
        
        if (requiredTypes.length === 0) return true;
        
        const personLower = personType.toLowerCase();
        return requiredTypes.some(type => personLower.includes(type.toLowerCase()));
    },

    updateReservationConflicts() {
        for (const reservation of AppState.reservations.values()) {
            reservation.conflicts = AppState.conflicts.filter(c => 
                c.reservationIds.includes(reservation.id)
            );
        }
    }
};

const UI = {
    init() {
        this.bindEvents();
        this.renderEquipmentTable();
        this.renderReservationTable();
        this.renderConflictTable();
        this.renderReviewTable();
        this.updateStats();
    },

    bindEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        document.getElementById('equipment-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            document.getElementById('equipment-info').textContent = file ? file.name : '未选择文件';
        });

        document.getElementById('reservation-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            document.getElementById('reservation-info').textContent = file ? file.name : '未选择文件';
        });

        document.getElementById('outage-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            document.getElementById('outage-info').textContent = file ? file.name : '未选择文件';
        });

        document.getElementById('btn-import').addEventListener('click', () => this.handleImport());
        document.getElementById('btn-clear').addEventListener('click', () => this.handleClear());

        document.getElementById('btn-filter').addEventListener('click', () => this.applyFilters());
        document.getElementById('btn-reset-filter').addEventListener('click', () => this.resetFilters());

        document.getElementById('btn-export-conflicts').addEventListener('click', () => this.exportConflicts());
        document.getElementById('btn-export-all').addEventListener('click', () => this.exportAllData());

        document.getElementById('select-all').addEventListener('change', (e) => {
            const checked = e.target.checked;
            document.querySelectorAll('.reservation-checkbox').forEach(cb => {
                cb.checked = checked;
                const id = cb.dataset.id;
                if (checked) {
                    AppState.selectedReservations.add(id);
                } else {
                    AppState.selectedReservations.delete(id);
                }
            });
        });

        document.getElementById('btn-batch-approve').addEventListener('click', () => this.batchApprove());
        document.getElementById('btn-batch-reject').addEventListener('click', () => this.batchReject());

        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-save').addEventListener('click', () => this.saveReview());

        document.getElementById('review-modal').addEventListener('click', (e) => {
            if (e.target.id === 'review-modal') {
                this.closeModal();
            }
        });
    },

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
    },

    async handleImport() {
        const equipmentFile = document.getElementById('equipment-file').files[0];
        const reservationFile = document.getElementById('reservation-file').files[0];
        const outageFile = document.getElementById('outage-file').files[0];

        if (!equipmentFile && !reservationFile && !outageFile) {
            Utils.showToast('请至少选择一个文件导入', 'warning');
            return;
        }

        try {
            let totalAdded = 0;
            let totalDuplicates = 0;

            if (equipmentFile) {
                const result = await DataImporter.importEquipment(equipmentFile);
                totalAdded += result.added;
                totalDuplicates += result.duplicates;
            }

            if (reservationFile) {
                const result = await DataImporter.importReservations(reservationFile);
                totalAdded += result.added;
                totalDuplicates += result.duplicates;
            }

            if (outageFile) {
                const result = await DataImporter.importOutages(outageFile);
                totalAdded += result.added;
                totalDuplicates += result.duplicates;
            }

            ConflictDetector.detectAll();
            this.refreshAll();

            let msg = `导入完成，新增 ${totalAdded} 条`;
            if (totalDuplicates > 0) {
                msg += `，跳过重复 ${totalDuplicates} 条`;
            }
            Utils.showToast(msg, 'success');

            document.getElementById('equipment-file').value = '';
            document.getElementById('reservation-file').value = '';
            document.getElementById('outage-file').value = '';
            document.getElementById('equipment-info').textContent = '未选择文件';
            document.getElementById('reservation-info').textContent = '未选择文件';
            document.getElementById('outage-info').textContent = '未选择文件';

        } catch (error) {
            Utils.showToast('导入失败: ' + error.message, 'error');
            console.error(error);
        }
    },

    handleClear() {
        if (!confirm('确定要清空所有数据吗？此操作不可撤销。')) return;
        
        AppState.equipment.clear();
        AppState.reservations.clear();
        AppState.outages.clear();
        AppState.conflicts = [];
        AppState.importHashes.equipment.clear();
        AppState.importHashes.reservations.clear();
        AppState.importHashes.outages.clear();
        AppState.selectedReservations.clear();
        
        this.refreshAll();
        Utils.showToast('数据已清空', 'success');
    },

    applyFilters() {
        AppState.filters.equipmentId = document.getElementById('filter-equipment-id').value.trim();
        AppState.filters.person = document.getElementById('filter-person').value.trim();
        AppState.filters.conflictType = document.getElementById('filter-conflict-type').value;
        AppState.filters.status = document.getElementById('filter-status').value;
        
        this.refreshAll();
        Utils.showToast('筛选已应用', 'success');
    },

    resetFilters() {
        document.getElementById('filter-equipment-id').value = '';
        document.getElementById('filter-person').value = '';
        document.getElementById('filter-conflict-type').value = 'all';
        document.getElementById('filter-status').value = 'all';
        
        AppState.filters = {
            equipmentId: '',
            person: '',
            conflictType: 'all',
            status: 'all'
        };
        
        this.refreshAll();
        Utils.showToast('筛选已重置', 'success');
    },

    refreshAll() {
        this.renderEquipmentTable();
        this.renderReservationTable();
        this.renderConflictTable();
        this.renderReviewTable();
        this.updateStats();
    },

    updateStats() {
        document.getElementById('stat-equipment').textContent = AppState.equipment.size;
        document.getElementById('stat-reservations').textContent = AppState.reservations.size;
        document.getElementById('stat-outages').textContent = AppState.outages.size;
        document.getElementById('stat-conflicts').textContent = AppState.conflicts.length;
        document.getElementById('conflict-badge').textContent = AppState.conflicts.length;
    },

    getFilteredEquipment() {
        let list = Array.from(AppState.equipment.values());
        
        if (AppState.filters.equipmentId) {
            const keyword = AppState.filters.equipmentId.toLowerCase();
            list = list.filter(e => e.id.toLowerCase().includes(keyword));
        }
        
        return list;
    },

    getFilteredReservations() {
        let list = Array.from(AppState.reservations.values());
        
        if (AppState.filters.equipmentId) {
            const keyword = AppState.filters.equipmentId.toLowerCase();
            list = list.filter(r => r.equipmentId.toLowerCase().includes(keyword));
        }
        
        if (AppState.filters.person) {
            const keyword = AppState.filters.person.toLowerCase();
            list = list.filter(r => r.person.toLowerCase().includes(keyword));
        }
        
        if (AppState.filters.status !== 'all') {
            list = list.filter(r => r.reviewStatus === AppState.filters.status);
        }
        
        return list;
    },

    getFilteredConflicts() {
        let list = [...AppState.conflicts];
        
        if (AppState.filters.conflictType !== 'all') {
            list = list.filter(c => c.type === AppState.filters.conflictType);
        }
        
        if (AppState.filters.equipmentId) {
            const keyword = AppState.filters.equipmentId.toLowerCase();
            list = list.filter(c => c.equipmentId.toLowerCase().includes(keyword));
        }
        
        if (AppState.filters.person) {
            const keyword = AppState.filters.person.toLowerCase();
            list = list.filter(c => c.person.toLowerCase().includes(keyword));
        }
        
        return list;
    },

    renderEquipmentTable() {
        const tbody = document.getElementById('equipment-table-body');
        const equipmentList = this.getFilteredEquipment();
        
        if (equipmentList.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="7">暂无设备数据</td></tr>';
            return;
        }
        
        const now = new Date();
        
        tbody.innerHTML = equipmentList.map(equip => {
            const reservations = Array.from(AppState.reservations.values())
                .filter(r => r.equipmentId === equip.id);
            
            const activeReservations = reservations.filter(r => {
                return r.startTime && r.endTime && r.startTime <= now && r.endTime >= now;
            });
            
            const hasOutage = Array.from(AppState.outages.values()).some(o => {
                return o.equipmentId === equip.id && o.startTime <= now && o.endTime >= now;
            });
            
            let statusClass = 'status-available';
            let statusText = '可用';
            
            if (hasOutage) {
                statusClass = 'status-outage';
                statusText = '停用中';
            } else if (activeReservations.length > 0) {
                statusClass = 'status-in-use';
                statusText = '使用中';
            }
            
            const currentResText = activeReservations.length > 0 
                ? activeReservations.map(r => r.person).join(', ')
                : '-';
            
            return `
                <tr>
                    <td><strong>${Utils.escapeHtml(equip.id)}</strong></td>
                    <td>${Utils.escapeHtml(equip.name)}</td>
                    <td>${Utils.escapeHtml(equip.type)}</td>
                    <td>${Utils.escapeHtml(equip.lab)}</td>
                    <td>${Utils.escapeHtml(equip.qualification) || '-'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${Utils.escapeHtml(currentResText)}</td>
                </tr>
            `;
        }).join('');
    },

    renderReservationTable() {
        const tbody = document.getElementById('reservation-table-body');
        const reservations = this.getFilteredReservations();
        
        if (reservations.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="8">暂无预约数据</td></tr>';
            return;
        }
        
        reservations.sort((a, b) => {
            if (a.startTime && b.startTime) {
                return new Date(a.startTime) - new Date(b.startTime);
            }
            return 0;
        });
        
        tbody.innerHTML = reservations.map(r => {
            const statusMap = {
                'pending': { class: 'status-pending', text: '待复核' },
                'approved': { class: 'status-approved', text: '已通过' },
                'rejected': { class: 'status-rejected', text: '已驳回' }
            };
            const status = statusMap[r.reviewStatus] || { class: 'status-pending', text: r.reviewStatus };
            
            return `
                <tr>
                    <td><strong>${Utils.escapeHtml(r.id)}</strong></td>
                    <td>${Utils.escapeHtml(r.equipmentId)}</td>
                    <td>${Utils.escapeHtml(r.person)}</td>
                    <td>${Utils.escapeHtml(r.personType)}</td>
                    <td>${Utils.formatDateTime(r.startTime)}</td>
                    <td>${Utils.formatDateTime(r.endTime)}</td>
                    <td>${Utils.escapeHtml(r.purpose) || '-'}</td>
                    <td><span class="status-badge ${status.class}">${status.text}</span></td>
                </tr>
            `;
        }).join('');
    },

    renderConflictTable() {
        const tbody = document.getElementById('conflict-table-body');
        const conflicts = this.getFilteredConflicts();
        
        const timeConflicts = AppState.conflicts.filter(c => c.type === 'time').length;
        const outageConflicts = AppState.conflicts.filter(c => c.type === 'outage').length;
        const qualConflicts = AppState.conflicts.filter(c => c.type === 'qualification').length;
        
        document.getElementById('time-conflict-count').textContent = timeConflicts;
        document.getElementById('outage-conflict-count').textContent = outageConflicts;
        document.getElementById('qualification-conflict-count').textContent = qualConflicts;
        
        if (conflicts.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">暂无冲突数据</td></tr>';
            return;
        }
        
        const typeClassMap = {
            'time': 'conflict-type-time',
            'outage': 'conflict-type-outage',
            'qualification': 'conflict-type-qualification'
        };
        
        const severityMap = {
            'high': { class: 'severity-high', text: '严重' },
            'medium': { class: 'severity-medium', text: '中等' },
            'low': { class: 'severity-low', text: '轻微' }
        };
        
        tbody.innerHTML = conflicts.map(c => {
            const severity = severityMap[c.severity] || severityMap.medium;
            
            return `
                <tr>
                    <td><span class="conflict-type-tag ${typeClassMap[c.type]}">${c.typeName}</span></td>
                    <td>${Utils.escapeHtml(c.equipmentId)}</td>
                    <td>${c.reservationIds.map(id => Utils.escapeHtml(id)).join(', ')}</td>
                    <td>${Utils.escapeHtml(c.person)}</td>
                    <td>${Utils.escapeHtml(c.detail)}</td>
                    <td><span class="${severity.class}">${severity.text}</span></td>
                </tr>
            `;
        }).join('');
    },

    renderReviewTable() {
        const tbody = document.getElementById('review-table-body');
        const reservations = this.getFilteredReservations();
        
        if (reservations.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="9">暂无预约数据</td></tr>';
            return;
        }
        
        reservations.sort((a, b) => {
            const statusOrder = { pending: 0, rejected: 1, approved: 2 };
            const orderA = statusOrder[a.reviewStatus] ?? 99;
            const orderB = statusOrder[b.reviewStatus] ?? 99;
            if (orderA !== orderB) return orderA - orderB;
            if (a.startTime && b.startTime) {
                return new Date(a.startTime) - new Date(b.startTime);
            }
            return 0;
        });
        
        tbody.innerHTML = reservations.map(r => {
            const conflictTags = r.conflicts.map(c => 
                `<span class="conflict-tag">${c.typeName}</span>`
            ).join('') || '<span style="color:#52c41a;font-size:12px;">无冲突</span>';
            
            const statusMap = {
                'pending': { class: 'status-pending', text: '待处理' },
                'approved': { class: 'status-approved', text: '已通过' },
                'rejected': { class: 'status-rejected', text: '已驳回' }
            };
            const status = statusMap[r.reviewStatus] || statusMap.pending;
            
            const checked = AppState.selectedReservations.has(r.id) ? 'checked' : '';
            
            return `
                <tr>
                    <td><input type="checkbox" class="reservation-checkbox" data-id="${Utils.escapeHtml(r.id)}" ${checked}></td>
                    <td><strong>${Utils.escapeHtml(r.id)}</strong></td>
                    <td>${Utils.escapeHtml(r.equipmentId)}</td>
                    <td>${Utils.escapeHtml(r.person)}</td>
                    <td>${Utils.formatDateTime(r.startTime)}<br><span style="color:#8c8c8c;">~ ${Utils.formatDateTime(r.endTime)}</span></td>
                    <td>${conflictTags}</td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${Utils.escapeHtml(r.reviewComment || '')}">${Utils.escapeHtml(r.reviewComment) || '-'}</td>
                    <td><span class="status-badge ${status.class}">${status.text}</span></td>
                    <td>
                        <button class="action-btn edit" onclick="UI.openReviewModal('${Utils.escapeHtml(r.id)}')">复核</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        document.querySelectorAll('.reservation-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    AppState.selectedReservations.add(id);
                } else {
                    AppState.selectedReservations.delete(id);
                }
            });
        });
    },

    openReviewModal(reservationId) {
        const reservation = AppState.reservations.get(reservationId);
        if (!reservation) return;
        
        AppState.currentReviewId = reservationId;
        
        document.getElementById('modal-reservation-id').textContent = reservation.id;
        document.getElementById('modal-equipment-id').textContent = reservation.equipmentId;
        document.getElementById('modal-person').textContent = reservation.person;
        document.getElementById('modal-time').textContent = 
            `${Utils.formatDateTime(reservation.startTime)} ~ ${Utils.formatDateTime(reservation.endTime)}`;
        
        const conflictsDiv = document.getElementById('modal-conflicts');
        if (reservation.conflicts.length > 0) {
            conflictsDiv.innerHTML = reservation.conflicts.map(c => 
                `<div>• [${c.typeName}] ${Utils.escapeHtml(c.detail)}</div>`
            ).join('');
        } else {
            conflictsDiv.textContent = '无冲突';
            conflictsDiv.style.color = '#52c41a';
        }
        
        document.getElementById('modal-review-comment').value = reservation.reviewComment || '';
        document.getElementById('modal-review-status').value = reservation.reviewStatus || 'pending';
        
        document.getElementById('review-modal').classList.add('active');
    },

    closeModal() {
        document.getElementById('review-modal').classList.remove('active');
        AppState.currentReviewId = null;
    },

    saveReview() {
        if (!AppState.currentReviewId) return;
        
        const reservation = AppState.reservations.get(AppState.currentReviewId);
        if (!reservation) return;
        
        reservation.reviewComment = document.getElementById('modal-review-comment').value;
        reservation.reviewStatus = document.getElementById('modal-review-status').value;
        
        this.closeModal();
        this.refreshAll();
        Utils.showToast('复核信息已保存', 'success');
    },

    batchApprove() {
        if (AppState.selectedReservations.size === 0) {
            Utils.showToast('请先选择要处理的预约', 'warning');
            return;
        }
        
        let count = 0;
        for (const id of AppState.selectedReservations) {
            const reservation = AppState.reservations.get(id);
            if (reservation) {
                reservation.reviewStatus = 'approved';
                if (!reservation.reviewComment) {
                    reservation.reviewComment = '批量通过';
                }
                count++;
            }
        }
        
        AppState.selectedReservations.clear();
        document.getElementById('select-all').checked = false;
        this.refreshAll();
        Utils.showToast(`已批量通过 ${count} 条预约`, 'success');
    },

    batchReject() {
        if (AppState.selectedReservations.size === 0) {
            Utils.showToast('请先选择要处理的预约', 'warning');
            return;
        }
        
        if (!confirm(`确定要驳回选中的 ${AppState.selectedReservations.size} 条预约吗？`)) {
            return;
        }
        
        let count = 0;
        for (const id of AppState.selectedReservations) {
            const reservation = AppState.reservations.get(id);
            if (reservation) {
                reservation.reviewStatus = 'rejected';
                if (!reservation.reviewComment) {
                    reservation.reviewComment = '批量驳回';
                }
                count++;
            }
        }
        
        AppState.selectedReservations.clear();
        document.getElementById('select-all').checked = false;
        this.refreshAll();
        Utils.showToast(`已批量驳回 ${count} 条预约`, 'success');
    },

    exportConflicts() {
        const conflicts = this.getFilteredConflicts();
        
        if (conflicts.length === 0) {
            Utils.showToast('暂无冲突数据可导出', 'warning');
            return;
        }
        
        const headers = ['冲突类型', '设备编号', '预约ID', '预约人', '冲突详情', '严重程度', '检测时间'];
        const now = new Date().toLocaleString('zh-CN');
        
        let csv = headers.join(',') + '\n';
        
        for (const c of conflicts) {
            const row = [
                c.typeName,
                c.equipmentId,
                c.reservationIds.join(' / '),
                c.person,
                `"${c.detail.replace(/"/g, '""')}"`,
                c.severity === 'high' ? '严重' : c.severity === 'medium' ? '中等' : '轻微',
                now
            ];
            csv += row.join(',') + '\n';
        }
        
        const filename = `预约冲突报告_${new Date().toISOString().slice(0, 10)}.csv`;
        Utils.downloadFile(csv, filename, 'text/csv;charset=utf-8');
        Utils.showToast('冲突报告已导出', 'success');
    },

    exportAllData() {
        const data = {
            exportTime: new Date().toISOString(),
            statistics: {
                equipmentCount: AppState.equipment.size,
                reservationCount: AppState.reservations.size,
                outageCount: AppState.outages.size,
                conflictCount: AppState.conflicts.length
            },
            equipment: Array.from(AppState.equipment.values()),
            reservations: Array.from(AppState.reservations.values()).map(r => ({
                ...r,
                startTime: r.startTime ? r.startTime.toISOString() : null,
                endTime: r.endTime ? r.endTime.toISOString() : null,
                conflictCount: r.conflicts.length
            })),
            outages: Array.from(AppState.outages.values()).map(o => ({
                ...o,
                startTime: o.startTime ? o.startTime.toISOString() : null,
                endTime: o.endTime ? o.endTime.toISOString() : null
            })),
            conflicts: AppState.conflicts
        };
        
        const filename = `实验室器材预约数据_${new Date().toISOString().slice(0, 10)}.json`;
        Utils.downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
        Utils.showToast('全部数据已导出', 'success');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
