import { useState, useRef } from 'react';
import { Upload, Download, RefreshCw, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { useAnnotationStore } from '@/store/useAnnotationStore';
import { importDataFromFile, exportAllData } from '@/services/dataService';
import { cn } from '@/utils/cn';

export function DataManagementPanel() {
  const { patrolShifts, checkpoints, forbiddenZones, actions: sceneActions } = useSceneStore();
  const { annotations } = useAnnotationStore();
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      await importDataFromFile(file);
      sceneActions.reloadData();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '导入失败');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patrol-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReload = () => {
    sceneActions.reloadData();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const stats = [
    { label: '巡逻班次', value: patrolShifts.length, icon: Database },
    { label: '轨迹点数', value: patrolShifts.reduce((sum, s) => sum + s.trajectoryPoints.length, 0), icon: Database },
    { label: '告警数量', value: patrolShifts.reduce((sum, s) => sum + s.alarms.length, 0), icon: AlertCircle },
    { label: '检查点', value: checkpoints.length, icon: CheckCircle },
    { label: '禁区', value: forbiddenZones.length, icon: AlertCircle },
    { label: '标注', value: annotations.length, icon: Database },
  ];

  return (
    <div className="panel">
      <h3 className="font-display font-semibold text-lg mb-4 text-primary flex items-center gap-2">
        <Database size={20} />
        数据管理
      </h3>

      {showSuccess && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2 text-green-400">
          <CheckCircle size={16} />
          操作成功
        </div>
      )}

      {importError && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle size={16} />
          {importError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <stat.icon size={14} className="text-primary" />
            <div>
              <div className="text-xs text-white/50">{stat.label}</div>
              <div className="text-lg font-semibold">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
          id="data-import"
        />
        <label
          htmlFor="data-import"
          className={cn(
            "btn-secondary w-full flex items-center justify-center gap-2",
            isImporting && "opacity-50 cursor-not-allowed"
          )}
          onClick={(e) => isImporting && e.preventDefault()}
        >
          <Upload size={16} />
          {isImporting ? '导入中...' : '导入数据'}
        </label>

        <button
          onClick={handleExport}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Download size={16} />
          导出数据
        </button>

        <button
          onClick={handleReload}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} />
          重新加载
        </button>
      </div>

      <div className="mt-4 p-3 bg-background-dark/50 rounded-lg">
        <h4 className="text-sm font-medium text-white/70 mb-2">数据说明</h4>
        <ul className="text-xs text-white/50 space-y-1">
          <li>• 数据首次加载时从JSON文件读取</li>
          <li>• 导入后的数据保存在本地存储</li>
          <li>• 刷新页面后数据保持一致</li>
          <li>• 标注会自动关联到对应记录</li>
        </ul>
      </div>
    </div>
  );
}
