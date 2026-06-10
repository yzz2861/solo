import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createExhibitStore } from './utils/exhibitStore.js';
import Header from './components/Header.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import FilterBar from './components/FilterBar.jsx';
import ExhibitTable from './components/ExhibitTable.jsx';
import ExhibitDetail from './components/ExhibitDetail.jsx';
import Toast from './components/Toast.jsx';
import './styles/App.css';

const store = createExhibitStore();

export default function App() {
  const [exhibits, setExhibits] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filters, setFilters] = useState({
    status: 'all',
    warningType: 'all',
    level: 'all',
    search: '',
  });
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({
    total: 0, contracted: 0, checkedOut: 0, onDisplay: 0,
    returned: 0, reviewed: 0, overdue: 0, abnormal: 0, handlerMismatch: 0,
  });

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setExhibits(store.getExhibits());
      setStats(store.getStatistics());
    });
    return unsubscribe;
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const handleLoadDemo = useCallback(() => {
    const contractCSV = `展品编号,展品名称,类别,等级,借出日期,应还日期,经手人,借展方,合同编号
EX001,青铜鼎,青铜器,一级,2026-05-01,2026-06-30,张明,省博物馆,HT202605001
EX002,玉如意,玉器,二级,2026-05-01,2026-06-30,张明,省博物馆,HT202605001
EX003,青花瓷瓶,瓷器,一级,2026-05-05,2026-07-05,李华,市美术馆,HT202605002
EX004,书画卷轴,书画,二级,2026-05-05,2026-07-05,李华,市美术馆,HT202605002
EX005,唐三彩马,陶器,三级,2026-05-10,2026-06-10,王芳,民俗博物馆,HT202605003
EX006,金缕玉衣,玉器,一级,2026-05-10,2026-08-10,王芳,民俗博物馆,HT202605003
EX007,钱币一组,杂项,一般,2026-05-15,2026-07-15,赵强,钱币博物馆,HT202605004
EX008,木雕佛像,木器,三级,2026-05-15,2026-07-15,赵强,钱币博物馆,HT202605004`;

    const checkoutCSV = `展品编号,展品名称,出库日期,出库人,存放位置
EX001,青铜鼎,2026-05-02,张明,A区-01柜
EX002,玉如意,2026-05-02,张明,A区-02柜
EX003,青花瓷瓶,2026-05-06,李华,B区-01柜
EX004,书画卷轴,2026-05-06,李华,B区-02柜
EX005,唐三彩马,2026-05-11,王芳,C区-01柜
EX006,金缕玉衣,2026-05-11,王芳,C区-02柜`;

    const returnJSON = JSON.stringify([
      { exhibitId: "EX001", exhibitName: "青铜鼎", returnDate: "2026-06-28", acceptanceLevel: "完好", handler: "张明", condition: "展品完好无损，与出库时状态一致" },
      { exhibitId: "EX002", exhibitName: "玉如意", returnDate: "2026-06-28", acceptanceLevel: "轻微损伤", handler: "张明", condition: "底部有细微划痕，需进一步检查" },
      { exhibitId: "EX003", exhibitName: "青花瓷瓶", returnDate: "2026-07-03", acceptanceLevel: "完好", handler: "李华", condition: "完好无损" },
      { exhibitId: "EX005", exhibitName: "唐三彩马", returnDate: "2026-06-12", acceptanceLevel: "严重损伤", handler: "刘伟", condition: "马耳部位有破损，需修复" },
    ]);

    store.importContracts(contractCSV);
    store.importCheckouts(checkoutCSV);
    store.importReturns(returnJSON);

    store.setReviewOpinion('EX001', {
      opinion: '展品状态良好，同意归档',
      reviewer: '张管理员',
      result: '通过',
    });

    showToast('演示数据已加载', 'success');
  }, [showToast]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleImport = useCallback(async (type) => {
    if (!window.electronAPI) {
      showToast('请在桌面应用中使用导入功能', 'warning');
      return;
    }

    const fileTypes = {
      contract: {
        filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
        title: '选择合同清单 CSV 文件',
      },
      checkout: {
        filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
        title: '选择出库扫描 CSV 文件',
      },
      return: {
        filters: [{ name: 'JSON 文件', extensions: ['json'] }],
        title: '选择回馆验收 JSON 文件',
      },
    };

    try {
      const result = await window.electronAPI.openFileDialog({
        title: fileTypes[type].title,
        filters: fileTypes[type].filters,
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) return;

      const fileResult = await window.electronAPI.readFile(result.filePaths[0]);
      if (!fileResult.success) {
        showToast(`读取文件失败：${fileResult.error}`, 'error');
        return;
      }

      let importResult;
      if (type === 'contract') {
        importResult = store.importContracts(fileResult.content);
      } else if (type === 'checkout') {
        importResult = store.importCheckouts(fileResult.content);
      } else if (type === 'return') {
        importResult = store.importReturns(fileResult.content);
      }

      showToast(importResult.message, importResult.success ? 'success' : 'warning');
    } catch (error) {
      showToast(`导入失败：${error.message}`, 'error');
    }
  }, [showToast]);

  const filteredExhibits = useMemo(() => {
    return store.getFilteredExhibits(filters);
  }, [exhibits, filters]);

  const selectedExhibit = useMemo(() => {
    return exhibits.find(e => e.exhibitId === selectedId) || null;
  }, [exhibits, selectedId]);

  const handleSaveReview = useCallback((exhibitId, opinion) => {
    store.setReviewOpinion(exhibitId, opinion);
    showToast('复核意见已保存', 'success');
  }, [showToast]);

  const handleExport = useCallback(async (format) => {
    if (!window.electronAPI) {
      showToast('请在桌面应用中使用导出功能', 'warning');
      return;
    }

    const hasSelection = selectedIds.size > 0;
    const idsToExport = hasSelection ? Array.from(selectedIds) : null;

    try {
      const dateStr = new Date().toISOString().split('T')[0];

      if (format === 'csv') {
        const csvContent = store.exportReport(idsToExport);
        const result = await window.electronAPI.saveFileDialog({
          title: '导出借展交接报告',
          defaultPath: `借展交接报告_${dateStr}.csv`,
          filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
        });

        if (result.canceled) return;

        const writeResult = await window.electronAPI.writeFile(result.filePath, '\uFEFF' + csvContent);
        if (writeResult.success) {
          showToast('报告导出成功', 'success');
        } else {
          showToast(`导出失败：${writeResult.error}`, 'error');
        }
      } else if (format === 'html') {
        const htmlContent = store.generateReportHTML(idsToExport);
        const result = await window.electronAPI.saveFileDialog({
          title: '导出借展交接报告',
          defaultPath: `借展交接报告_${dateStr}.html`,
          filters: [{ name: 'HTML 文件', extensions: ['html'] }],
        });

        if (result.canceled) return;

        const writeResult = await window.electronAPI.writeFile(result.filePath, htmlContent);
        if (writeResult.success) {
          showToast('报告导出成功', 'success');
        } else {
          showToast(`导出失败：${writeResult.error}`, 'error');
        }
      }
    } catch (error) {
      showToast(`导出失败：${error.message}`, 'error');
    }
  }, [showToast, selectedIds]);

  const handleToggleSelect = useCallback((exhibitId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(exhibitId)) {
        next.delete(exhibitId);
      } else {
        next.add(exhibitId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredExhibits.length && filteredExhibits.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredExhibits.map(e => e.exhibitId)));
    }
  }, [filteredExhibits, selectedIds.size]);

  return (
    <div className="app">
      <Header
        onImport={handleImport}
        onExport={handleExport}
        onLoadDemo={handleLoadDemo}
        exhibitCount={filteredExhibits.length}
        selectedCount={selectedIds.size}
      />

      <div className="main-content">
        <div className="left-panel">
          <StatsPanel stats={stats} />
          <FilterBar
            filters={filters}
            onChange={setFilters}
            stats={stats}
          />
          <ExhibitTable
            exhibits={filteredExhibits}
            selectedId={selectedId}
            selectedIds={selectedIds}
            onSelect={setSelectedId}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
          />
        </div>

        <div className="right-panel">
          <ExhibitDetail
            exhibit={selectedExhibit}
            onSaveReview={handleSaveReview}
          />
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
