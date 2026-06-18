import { useState, useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Phone,
  Calendar,
  Pill,
  CheckCircle2,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  User,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSmsStore } from '../../store/smsStore';
import { useDoctorStore } from '../../store/doctorStore';
import { CategoryBadge } from '../../components/CategoryBadge';
import { SeverityBadge } from '../../components/SeverityBadge';
import { exportService } from '../../services/exportService';
import { timelineService } from '../../services/timelineService';
import type { AnalysisResult, SmsRecord, CategoryType, DoctorActionType } from '../../types';
import { CATEGORY_CONFIGS, SEVERITY_CONFIGS } from '../../types';

interface ProcessModalProps {
  result: AnalysisResult;
  sms: SmsRecord | undefined;
  onClose: () => void;
  onConfirm: (action: DoctorActionType, note: string) => void;
}

const ProcessModal = ({ result, sms, onClose, onConfirm }: ProcessModalProps) => {
  const [action, setAction] = useState<DoctorActionType>('reviewed');
  const [note, setNote] = useState('');

  const actionOptions: { value: DoctorActionType; label: string; icon: typeof CheckCircle2 }[] = [
    { value: 'reviewed', label: '已查看', icon: CheckCircle2 },
    { value: 'callback', label: '电话回访', icon: Phone },
    { value: 'schedule_visit', label: '安排回诊', icon: Calendar },
    { value: 'medication_adjust', label: '调整用药', icon: Pill },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
      >
        <h3 className="text-lg font-bold text-slate-800 mb-4">处理记录</h3>

        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CategoryBadge category={result.category} size="sm" />
            <SeverityBadge severity={result.severity} size="sm" />
          </div>
          <p className="text-slate-700 text-sm">{result.summary}</p>
          <p className="text-xs text-slate-500 mt-2">
            患者：{sms?.patientNameMasked} · {timelineService.formatDate(sms?.sendTime)}
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">处理方式</label>
          <div className="grid grid-cols-2 gap-3">
            {actionOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = action === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setAction(opt.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">处理备注</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="请输入处理备注（可选）..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(action, note)}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            确认处理
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface RecordCardProps {
  result: AnalysisResult;
  sms: SmsRecord | undefined;
  showPrivacy: boolean;
  index: number;
  isFirstAdverse: boolean;
  onProcess: (result: AnalysisResult) => void;
}

const RecordCard = ({ result, sms, showPrivacy, index, isFirstAdverse, onProcess }: RecordCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const { getActionsByResultId } = useDoctorStore();
  const actions = getActionsByResultId(result.id);
  const hasProcessed = actions.length > 0;

  const patientTimeline = useMemo(() => {
    if (!sms) return null;
    const allSms = useSmsStore.getState().smsRecords;
    const allResults = useSmsStore.getState().analysisResults;
    const timelines = timelineService.aggregateByPatient(allSms, allResults);
    return timelines.find((t) => t.patientId === sms.patientId) || null;
  }, [sms]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
        result.category === 'adverse_reaction' ? 'border-red-300' : 'border-slate-200'
      }`}
    >
      {isFirstAdverse && (
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 flex items-center gap-2">
          <AlertTriangle size={16} className="text-white" />
          <span className="text-white text-sm font-bold">⚠ 疑似不良反应 · 请优先处理</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                result.category === 'adverse_reaction'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {index + 1}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CategoryBadge category={result.category} size="sm" />
                <SeverityBadge severity={result.severity} size="sm" />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <User size={12} />
                <span>{showPrivacy ? sms?.patientName : sms?.patientNameMasked}</span>
                <span>·</span>
                <Clock size={12} />
                <span>{timelineService.formatDate(sms?.sendTime)}</span>
                {sms?.sender === 'family' && (
                  <>
                    <span>·</span>
                    <span className="text-purple-600">家属代发({sms.senderRelation})</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasProcessed && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                已处理
              </span>
            )}
            <button
              onClick={() => onProcess(result)}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              处理
            </button>
          </div>
        </div>

        <p className="text-slate-700 text-sm mb-4 leading-relaxed">{result.summary}</p>

        {result.isAmbiguous && result.ambiguousReason && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-700">模糊标记</p>
              <p className="text-xs text-amber-600">{result.ambiguousReason}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-3"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{expanded ? '收起详情' : '展开详情'}</span>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                    <MessageSquare size={12} />
                    原始短信
                  </p>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {showPrivacy ? sms?.content : sms?.content}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      接收时间：{timelineService.formatDateTime(sms?.sendTime)}
                    </p>
                  </div>
                </div>

                {result.evidence.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">原句依据</p>
                    <div className="space-y-2">
                      {result.evidence.map((ev, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">"</span>
                          <p className="text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg flex-1 italic">
                            {ev}
                          </p>
                          <span className="text-blue-500 mt-1">"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.keywords.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">关键词</p>
                    <div className="flex flex-wrap gap-2">
                      {result.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {sms?.nurseNote && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">护士备注</p>
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <p className="text-sm text-purple-700">{sms.nurseNote}</p>
                    </div>
                  </div>
                )}

                {result.reviewNote && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">审核备注</p>
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                      <p className="text-sm text-green-700">{result.reviewNote}</p>
                    </div>
                  </div>
                )}

                {patientTimeline && patientTimeline.records.length > 1 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">
                      患者历史记录（共{patientTimeline.records.length}条）
                    </p>
                    <div className="space-y-2">
                      {patientTimeline.records.slice(0, 5).map((record, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 bg-slate-50 rounded-lg p-2"
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              record.trend === 'improving'
                                ? 'bg-green-500'
                                : record.trend === 'worsening'
                                ? 'bg-red-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span className="text-xs text-slate-500 w-24">
                            {timelineService.formatDate(record.date)}
                          </span>
                          <CategoryBadge category={record.category} size="sm" showIcon={false} />
                          <SeverityBadge severity={record.severity} size="sm" />
                          <span className="text-xs text-slate-600 flex-1 truncate">
                            {record.summary}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      趋势：
                      <span
                        className={`font-medium ${
                          patientTimeline.records[0].trend === 'improving'
                            ? 'text-green-600'
                            : patientTimeline.records[0].trend === 'worsening'
                            ? 'text-red-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {patientTimeline.records[0].trend === 'improving'
                          ? '好转'
                          : patientTimeline.records[0].trend === 'worsening'
                          ? '加重'
                          : '稳定'}
                      </span>
                    </p>
                  </div>
                )}

                {hasProcessed && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">处理记录</p>
                    <div className="space-y-2">
                      {actions.map((act) => (
                        <div
                          key={act.id}
                          className="flex items-start gap-3 bg-green-50 rounded-lg p-3"
                        >
                          <CheckCircle2 size={16} className="text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm text-green-700 font-medium">
                              {act.action === 'reviewed'
                                ? '已查看'
                                : act.action === 'callback'
                                ? '电话回访'
                                : act.action === 'schedule_visit'
                                ? '安排回诊'
                                : '调整用药'}
                            </p>
                            {act.note && (
                              <p className="text-xs text-green-600 mt-1">{act.note}</p>
                            )}
                            <p className="text-xs text-green-500 mt-1">
                              {timelineService.formatDateTime(act.actionTime)}
                            </p>
                          </div>
                        </div>
                      ))}
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

export const DoctorWorkspace = () => {
  const { getConfirmed, getSmsById, getStatistics } = useSmsStore();
  const { addAction, hasAction } = useDoctorStore();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showProcessed, setShowProcessed] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [processingRecord, setProcessingRecord] = useState<AnalysisResult | null>(null);

  const stats = getStatistics();

  const sortedResults = useMemo(() => {
    let results = getConfirmed();
    results = exportService.sortBySeverity(results);

    if (categoryFilter !== 'all') {
      results = results.filter((r) => r.category === categoryFilter);
    }

    if (severityFilter !== 'all') {
      results = results.filter((r) => r.severity === severityFilter);
    }

    if (!showProcessed) {
      results = results.filter((r) => !hasAction(r.id));
    }

    return results;
  }, [getConfirmed, categoryFilter, severityFilter, showProcessed, hasAction]);

  const adverseCount = sortedResults.filter((r) => r.category === 'adverse_reaction').length;
  const unprocessedCount = sortedResults.filter((r) => !hasAction(r.id)).length;

  const handleProcess = (result: AnalysisResult) => {
    setProcessingRecord(result);
  };

  const handleConfirmProcess = (action: DoctorActionType, note: string) => {
    if (processingRecord) {
      addAction(processingRecord.id, action, note);
      setProcessingRecord(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">待处理清单</h1>
            <p className="text-sm text-slate-500">
              按严重程度排序，共 <span className="font-medium text-slate-700">{sortedResults.length}</span> 条记录，
              待处理 <span className="font-medium text-orange-600">{unprocessedCount}</span> 条
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

        <AnimatePresence>
          {showFilterPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
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
                    <label className="block text-sm font-medium text-slate-700 mb-3">严重程度</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSeverityFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          severityFilter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        全部
                      </button>
                      {SEVERITY_CONFIGS.map((config) => (
                        <button
                          key={config.key}
                          onClick={() => setSeverityFilter(config.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            severityFilter === config.key
                              ? 'text-white'
                              : 'hover:opacity-80'
                          }`}
                          style={{
                            backgroundColor:
                              severityFilter === config.key ? config.color : config.bgColor,
                            color: severityFilter === config.key ? 'white' : config.color,
                            border: `1px solid ${config.borderColor}`,
                          }}
                        >
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">显示选项</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showProcessed}
                          onChange={(e) => setShowProcessed(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-600">显示已处理</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">总记录</p>
            <p className="text-2xl font-bold text-slate-800">{stats.confirmed}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <p className="text-xs text-red-500 mb-1">不良反应</p>
            <p className="text-2xl font-bold text-red-600">{adverseCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <p className="text-xs text-red-500 mb-1">危急</p>
            <p className="text-2xl font-bold text-red-600">{stats.bySeverity.critical}</p>
          </div>
          <div className="bg-white rounded-xl border border-orange-200 p-4">
            <p className="text-xs text-orange-500 mb-1">高度</p>
            <p className="text-2xl font-bold text-orange-600">{stats.bySeverity.high}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">待处理</p>
            <p className="text-2xl font-bold text-slate-800">{unprocessedCount}</p>
          </div>
        </div>
      </div>

      {sortedResults.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">暂无待处理记录</h3>
          <p className="text-sm text-slate-500">所有记录已处理完毕，或护士尚未审核确认</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedResults.map((result, index) => {
            const sms = getSmsById(result.smsId);
            const isFirstAdverse =
              result.category === 'adverse_reaction' &&
              index === sortedResults.findIndex((r) => r.category === 'adverse_reaction');

            return (
              <RecordCard
                key={result.id}
                result={result}
                sms={sms}
                showPrivacy={showPrivacy}
                index={index}
                isFirstAdverse={isFirstAdverse}
                onProcess={handleProcess}
              />
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {processingRecord && (
          <ProcessModal
            result={processingRecord}
            sms={getSmsById(processingRecord.smsId)}
            onClose={() => setProcessingRecord(null)}
            onConfirm={handleConfirmProcess}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
