import { useState, useMemo } from 'react';
import {
  Search,
  Eye,
  EyeOff,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  CheckCircle2,
  Phone,
  Calendar,
  Pill,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSmsStore } from '../../store/smsStore';
import { useDoctorStore } from '../../store/doctorStore';
import { CategoryBadge } from '../../components/CategoryBadge';
import { SeverityBadge } from '../../components/SeverityBadge';
import { exportService } from '../../services/exportService';
import { timelineService } from '../../services/timelineService';
import { privacyService } from '../../services/privacyService';
import type { AnalysisResult, SmsRecord, CategoryType, DoctorActionType } from '../../types';
import { CATEGORY_CONFIGS, SEVERITY_CONFIGS } from '../../types';

const getActionLabel = (action: DoctorActionType): string => {
  const labels: Record<DoctorActionType, string> = {
    reviewed: '已查看',
    callback: '电话回访',
    schedule_visit: '安排回诊',
    medication_adjust: '调整用药',
  };
  return labels[action];
};

const getActionIcon = (action: DoctorActionType) => {
  const icons = {
    reviewed: CheckCircle2,
    callback: Phone,
    schedule_visit: Calendar,
    medication_adjust: Pill,
  };
  return icons[action];
};

interface HistoryRecordProps {
  result: AnalysisResult;
  sms: SmsRecord | undefined;
  showPrivacy: boolean;
  index: number;
}

const HistoryRecord = ({ result, sms, showPrivacy, index }: HistoryRecordProps) => {
  const [expanded, setExpanded] = useState(false);
  const { getActionsByResultId } = useDoctorStore();
  const actions = getActionsByResultId(result.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CategoryBadge category={result.category} size="sm" />
              <SeverityBadge severity={result.severity} size="sm" />
              {actions.length > 0 && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  已处理
                </span>
              )}
            </div>

            <p className="text-slate-700 text-sm mb-3 leading-relaxed">{result.summary}</p>

            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <User size={12} />
                {showPrivacy ? sms?.patientName : sms?.patientNameMasked}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {timelineService.formatDate(sms?.sendTime)}
              </span>
              {sms?.sender === 'family' && (
                <span className="text-purple-600">家属代发({sms.senderRelation})</span>
              )}
            </div>

            {actions.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                {actions.map((act) => {
                  const Icon = getActionIcon(act.action);
                  return (
                    <div
                      key={act.id}
                      className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-md text-xs text-green-700"
                    >
                      <Icon size={12} />
                      <span>{getActionLabel(act.action)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-100 mt-4 pt-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">原始短信</p>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700">
                      {showPrivacy ? sms?.content : privacyService.maskAll(sms?.content || '')}
                    </p>
                  </div>
                </div>

                {result.evidence.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">原句依据</p>
                    <div className="space-y-1">
                      {result.evidence.map((ev, i) => (
                        <p key={i} className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg italic">
                          "{ev}"
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {actions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">处理记录</p>
                    <div className="space-y-2">
                      {actions.map((act) => {
                        const Icon = getActionIcon(act.action);
                        return (
                          <div
                            key={act.id}
                            className="flex items-start gap-3 bg-green-50 rounded-lg p-3"
                          >
                            <Icon size={16} className="text-green-500 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-green-700 font-medium">
                                {getActionLabel(act.action)}
                              </p>
                              {act.note && (
                                <p className="text-xs text-green-600 mt-1">{act.note}</p>
                              )}
                              <p className="text-xs text-green-500 mt-1">
                                {timelineService.formatDateTime(act.actionTime)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const HistoryPage = () => {
  const { getConfirmed, getSmsById, getStatistics } = useSmsStore();
  const { getCompletedActions, hasAction } = useDoctorStore();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryType | 'all'>('all');
  const [actionFilter, setActionFilter] = useState<DoctorActionType | 'all'>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const stats = getStatistics();
  const completedActions = getCompletedActions();

  const filteredResults = useMemo(() => {
    let results = getConfirmed();
    results = exportService.sortBySeverity(results);

    results = results.filter((r) => hasAction(r.id));

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter((r) => {
        const sms = getSmsById(r.smsId);
        return (
          r.summary.toLowerCase().includes(query) ||
          sms?.content.toLowerCase().includes(query) ||
          sms?.patientName.toLowerCase().includes(query)
        );
      });
    }

    if (categoryFilter !== 'all') {
      results = results.filter((r) => r.category === categoryFilter);
    }

    if (actionFilter !== 'all') {
      results = results.filter((r) => {
        const actions = getCompletedActions().filter((a) => a.resultId === r.id);
        return actions.some((a) => a.action === actionFilter);
      });
    }

    if (dateRange !== 'all') {
      const now = new Date();
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      results = results.filter((r) => {
        const sms = getSmsById(r.smsId);
        return sms && new Date(sms.sendTime) >= cutoff;
      });
    }

    return results;
  }, [getConfirmed, getSmsById, searchQuery, categoryFilter, actionFilter, dateRange, hasAction, getCompletedActions]);

  const handleExport = () => {
    const smsList = useSmsStore.getState().smsRecords;
    const resultsToExport = filteredResults;
    const blob = exportService.exportToExcel(resultsToExport, smsList, {
      includeOriginal: true,
      includeEvidence: true,
      format: 'excel',
      maskPrivacy: !showPrivacy,
    });
    exportService.downloadBlob(blob, exportService.getExportFilename('excel'));
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">历史记录</h1>
            <p className="text-sm text-slate-500">
              已处理记录共 <span className="font-medium text-slate-700">{completedActions.length}</span> 条，
              当前筛选 <span className="font-medium text-blue-600">{filteredResults.length}</span> 条
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPrivacy(!showPrivacy)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                showPrivacy
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {showPrivacy ? <EyeOff size={16} /> : <Eye size={16} />}
              {showPrivacy ? '隐藏隐私' : '显示隐私'}
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Download size={16} />
              导出
            </button>

            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                showFilterPanel
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Filter size={16} />
              筛选
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">总记录</p>
            <p className="text-2xl font-bold text-slate-800">{stats.confirmed}</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4">
            <p className="text-xs text-green-500 mb-1">已处理</p>
            <p className="text-2xl font-bold text-green-600">{completedActions.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-purple-200 p-4">
            <p className="text-xs text-purple-500 mb-1">电话回访</p>
            <p className="text-2xl font-bold text-purple-600">
              {completedActions.filter((a) => a.action === 'callback').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4">
            <p className="text-xs text-blue-500 mb-1">安排回诊</p>
            <p className="text-2xl font-bold text-blue-600">
              {completedActions.filter((a) => a.action === 'schedule_visit').length}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索患者姓名、短信内容或摘要..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <AnimatePresence>
          {showFilterPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">分类筛选</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setCategoryFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          categoryFilter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        全部
                      </button>
                      {CATEGORY_CONFIGS.map((config) => (
                        <button
                          key={config.key}
                          onClick={() => setCategoryFilter(config.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            categoryFilter === config.key
                              ? 'text-white'
                              : 'hover:opacity-80'
                          }`}
                          style={{
                            backgroundColor:
                              categoryFilter === config.key ? config.color : config.bgColor,
                            color: categoryFilter === config.key ? 'white' : config.color,
                            border: `1px solid ${config.borderColor}`,
                          }}
                        >
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">处理方式</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActionFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          actionFilter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        全部
                      </button>
                      {(['reviewed', 'callback', 'schedule_visit', 'medication_adjust'] as DoctorActionType[]).map((act) => {
                        const Icon = getActionIcon(act);
                        return (
                          <button
                            key={act}
                            onClick={() => setActionFilter(act)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              actionFilter === act
                                ? 'bg-green-600 text-white'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            <Icon size={12} />
                            {getActionLabel(act)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">时间范围</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: '7d', label: '近7天' },
                        { value: '30d', label: '近30天' },
                        { value: '90d', label: '近90天' },
                        { value: 'all', label: '全部' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setDateRange(opt.value as typeof dateRange)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            dateRange === opt.value
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {filteredResults.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">暂无匹配记录</h3>
          <p className="text-sm text-slate-500">请尝试调整筛选条件或搜索关键词</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResults.map((result, index) => {
            const sms = getSmsById(result.smsId);
            return (
              <HistoryRecord
                key={result.id}
                result={result}
                sms={sms}
                showPrivacy={showPrivacy}
                index={index}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
