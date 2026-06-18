import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Edit3,
  Download,
  FileSpreadsheet,
  FileText,
  Square,
  CheckSquare,
  AlertTriangle,
  HelpCircle,
  User,
  Clock,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useSmsStore } from '../../store/smsStore';
import { useAuthStore } from '../../store/authStore';
import { exportService } from '../../services/exportService';
import { timelineService } from '../../services/timelineService';
import {
  CATEGORY_CONFIGS,
  SEVERITY_CONFIGS,
  type CategoryType,
  type SeverityLevel,
  type ReviewStatus,
  type AnalysisResult,
  type ExportOptions,
} from '../../types';
import { CategoryBadge } from '../../components/CategoryBadge';
import { SeverityBadge } from '../../components/SeverityBadge';

export const ReviewPage = () => {
  const {
    analysisResults,
    smsRecords,
    getPendingReview,
    selectedIds,
    toggleSelected,
    selectAll,
    clearSelected,
    updateAnalysisResult,
    updateReviewStatus,
    batchUpdateReviewStatus,
    getSmsById,
    getStatistics,
  } = useSmsStore();
  const { currentUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeOriginal: false,
    includeEvidence: true,
    format: 'excel',
    maskPrivacy: true,
  });
  const [showPrivacy, setShowPrivacy] = useState<Record<string, boolean>>({});

  const stats = getStatistics();
  const pendingResults = getPendingReview();

  const displayResults = useMemo(() => {
    return activeTab === 'pending' ? pendingResults : analysisResults;
  }, [activeTab, pendingResults, analysisResults]);

  const handleConfirm = (id: string, note?: string) => {
    updateReviewStatus(id, 'confirmed', note);
  };

  const handleModify = (id: string, updates: Partial<AnalysisResult>, note?: string) => {
    updateAnalysisResult(id, updates);
    updateReviewStatus(id, 'modified', note);
    setEditingId(null);
  };

  const handleBatchConfirm = () => {
    if (selectedIds.length === 0) return;
    batchUpdateReviewStatus(selectedIds, 'confirmed');
    clearSelected();
  };

  const handleExport = () => {
    const resultsToExport = analysisResults.filter(
      (r) => r.reviewStatus === 'confirmed' || r.reviewStatus === 'modified'
    );

    if (exportOptions.format === 'excel') {
      const blob = exportService.exportToExcel(resultsToExport, smsRecords, exportOptions);
      exportService.downloadBlob(blob, exportService.getExportFilename('excel'));
    } else {
      const blob = exportService.exportToPDF(resultsToExport, smsRecords, exportOptions);
      exportService.downloadBlob(blob, exportService.getExportFilename('pdf'));
    }

    setShowExportModal(false);
  };

  const togglePrivacy = (id: string) => {
    setShowPrivacy((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const confirmedCount = analysisResults.filter(
    (r) => r.reviewStatus === 'confirmed' || r.reviewStatus === 'modified'
  ).length;

  const canExport = confirmedCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              待审核
              <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                {pendingResults.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              全部
              <span className="ml-2 px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-xs">
                {analysisResults.length}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchConfirm}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Check size={16} />
              批量确认 ({selectedIds.length})
            </button>
          )}
          <button
            onClick={() => setShowExportModal(true)}
            disabled={!canExport}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              canExport
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download size={16} />
            导出清单
            {confirmedCount > 0 && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {confirmedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const allSelected = selectedIds.length === displayResults.length;
                if (allSelected) {
                  clearSelected();
                } else {
                  selectAll(displayResults.map((r) => r.id));
                }
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              {selectedIds.length === displayResults.length ? (
                <CheckSquare size={20} />
              ) : (
                <Square size={20} />
              )}
            </button>
            <span className="text-blue-700">
              已选择 <span className="font-bold">{selectedIds.length}</span> 条记录
            </span>
          </div>
          <button
            onClick={clearSelected}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            取消选择
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">记录列表</h3>
            <button
              onClick={() => {
                const allSelected = selectedIds.length === displayResults.length;
                if (allSelected) {
                  clearSelected();
                } else {
                  selectAll(displayResults.map((r) => r.id));
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {selectedIds.length === displayResults.length ? '取消全选' : '全选'}
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {displayResults.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Check className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p>暂无待审核记录</p>
              </div>
            ) : (
              displayResults.map((result) => {
                const sms = getSmsById(result.smsId);
                if (!sms) return null;
                const isSelected = selectedIds.includes(result.id);
                const isEditing = editingId === result.id;

                return (
                  <motion.div
                    key={result.id}
                    layout
                    className={`p-4 hover:bg-slate-50 transition-colors ${
                      result.reviewStatus !== 'pending' ? 'bg-slate-50/50' : ''
                    } ${isEditing ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelected(result.id);
                        }}
                        className="mt-1 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare size={18} className="text-blue-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-800">
                            {showPrivacy[result.id] ? sms.patientName : sms.patientNameMasked}
                          </span>
                          <button
                            onClick={() => togglePrivacy(result.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {showPrivacy[result.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          {sms.sender === 'family' && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                              家属
                            </span>
                          )}
                          {result.isAmbiguous && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded flex items-center gap-1">
                              <HelpCircle size={10} />
                              模糊
                            </span>
                          )}
                          {result.reviewStatus === 'confirmed' && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                              已确认
                            </span>
                          )}
                          {result.reviewStatus === 'modified' && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              已修改
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-slate-600 mb-2 line-clamp-2">{sms.content}</p>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-400">
                            {timelineService.formatDate(sms.sendTime)}
                          </span>
                          <CategoryBadge category={result.category} size="sm" />
                          <SeverityBadge severity={result.severity} size="sm" />
                        </div>
                      </div>

                      {result.reviewStatus === 'pending' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingId(isEditing ? null : result.id)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleConfirm(result.id)}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="确认"
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {isEditing && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <EditForm
                            result={result}
                            onCancel={() => setEditingId(null)}
                            onSave={(updates, note) => handleModify(result.id, updates, note)}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">审核统计</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-sm text-amber-600 mb-1">待审核</p>
                <p className="text-3xl font-bold text-amber-700">{stats.pending}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-sm text-green-600 mb-1">已确认</p>
                <p className="text-3xl font-bold text-green-700">{stats.confirmed}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600 mb-3">分类分布</p>
              <div className="space-y-2">
                {CATEGORY_CONFIGS.map((config) => (
                  <div key={config.key} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-sm text-slate-600 flex-1">{config.label}</span>
                    <span className="text-sm font-medium text-slate-800">
                      {stats.byCategory[config.key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700 font-medium">疑似不良反应</p>
              </div>
              <p className="text-3xl font-bold text-red-700">{stats.adverseReactions}</p>
              <p className="text-xs text-red-500 mt-1">将优先展示给医生处理</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-600 mb-2">导出说明</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li className="flex items-center gap-2">
                  <ChevronRight size={12} />
                  不良反应患者置顶优先展示
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={12} />
                  按严重程度自动排序
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={12} />
                  患者隐私信息已脱敏
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={12} />
                  保留原句作为判断依据
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-4">导出待处理清单</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    导出格式
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExportOptions({ ...exportOptions, format: 'excel' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-colors ${
                        exportOptions.format === 'excel'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <FileSpreadsheet size={20} />
                      Excel
                    </button>
                    <button
                      onClick={() => setExportOptions({ ...exportOptions, format: 'pdf' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-colors ${
                        exportOptions.format === 'pdf'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <FileText size={20} />
                      PDF
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeEvidence}
                      onChange={(e) =>
                        setExportOptions({ ...exportOptions, includeEvidence: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="text-sm text-slate-700">包含原句依据</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeOriginal}
                      onChange={(e) =>
                        setExportOptions({ ...exportOptions, includeOriginal: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="text-sm text-slate-700">包含完整原始短信</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.maskPrivacy}
                      onChange={(e) =>
                        setExportOptions({ ...exportOptions, maskPrivacy: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="text-sm text-slate-700">隐私信息脱敏（推荐）</span>
                  </label>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-700">
                    将导出 <span className="font-bold">{confirmedCount}</span> 条已确认记录
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleExport}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  导出
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface EditFormProps {
  result: AnalysisResult;
  onCancel: () => void;
  onSave: (updates: Partial<AnalysisResult>, note?: string) => void;
}

const EditForm = ({ result, onCancel, onSave }: EditFormProps) => {
  const [category, setCategory] = useState<CategoryType>(result.category);
  const [severity, setSeverity] = useState<SeverityLevel>(result.severity);
  const [note, setNote] = useState(result.reviewNote || '');

  return (
    <div className="mt-4 ml-7 p-4 bg-white rounded-xl border border-blue-200">
      <h4 className="text-sm font-medium text-slate-700 mb-3">修改分类和严重程度</h4>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">分类</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryType)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORY_CONFIGS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">严重程度</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SEVERITY_CONFIGS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-500 mb-1">审核备注</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="添加审核备注（可选）"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm transition-colors"
        >
          取消
        </button>
        <button
          onClick={() => onSave({ category, severity }, note)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Check size={14} />
          保存修改
        </button>
      </div>
    </div>
  );
};
