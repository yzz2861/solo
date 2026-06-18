import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  Clock,
  MessageCircle,
  Users,
} from 'lucide-react';
import { useSmsStore } from '../../store/smsStore';
import { timelineService } from '../../services/timelineService';
import { CATEGORY_CONFIGS, SEVERITY_CONFIGS, type CategoryType, type PatientTimeline } from '../../types';
import { CategoryBadge } from '../../components/CategoryBadge';
import { SeverityBadge } from '../../components/SeverityBadge';

export const AnalysisPage = () => {
  const { smsRecords, analysisResults, getStatistics, getByCategory } = useSmsStore();
  const [activeCategory, setActiveCategory] = useState<CategoryType | 'all'>('all');
  const [expandedTimeline, setExpandedTimeline] = useState<string | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  const stats = getStatistics();

  const timelines = useMemo(() => {
    return timelineService.aggregateByPatient(smsRecords, analysisResults);
  }, [smsRecords, analysisResults]);

  const filteredResults = useMemo(() => {
    if (activeCategory === 'all') return analysisResults;
    return getByCategory(activeCategory);
  }, [activeCategory, analysisResults, getByCategory]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'worsening':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-blue-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'improving':
        return { text: '好转', color: 'text-green-600 bg-green-50' };
      case 'worsening':
        return { text: '加重', color: 'text-red-600 bg-red-50' };
      case 'stable':
        return { text: '稳定', color: 'text-blue-600 bg-blue-50' };
      default:
        return { text: '未知', color: 'text-slate-500 bg-slate-50' };
    }
  };

  const highlightKeywords = (text: string, keywords: string[]) => {
    if (!keywords.length) return text;
    
    let result = text;
    const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
    return result.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
  };

  const categoryTabs = [
    { key: 'all', label: '全部', count: stats.total },
    ...CATEGORY_CONFIGS.map((c) => ({
      key: c.key,
      label: c.label,
      count: stats.byCategory[c.key],
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        {CATEGORY_CONFIGS.map((config) => {
          const count = stats.byCategory[config.key];
          return (
            <motion.div
              key={config.key}
              whileHover={{ y: -2 }}
              className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: config.bgColor }}
                >
                  <FileText className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <span
                  className="text-2xl font-bold"
                  style={{ color: config.color }}
                >
                  {count}
                </span>
              </div>
              <p className="text-sm text-slate-600">{config.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="font-medium text-slate-700">严重程度分布</span>
          </div>
          <div className="space-y-2">
            {SEVERITY_CONFIGS.map((config) => (
              <div key={config.key} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-sm text-slate-600 flex-1">{config.label}</span>
                <span className="text-sm font-medium text-slate-800">
                  {stats.bySeverity[config.key]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-slate-700">患者时间线</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 mb-1">{timelines.length}</p>
          <p className="text-sm text-slate-500">位患者有连续反馈记录</p>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">趋势分布</p>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded">
                好转 {timelines.filter((t) => t.records[t.records.length - 1]?.trend === 'improving').length}
              </span>
              <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded">
                加重 {timelines.filter((t) => t.records[t.records.length - 1]?.trend === 'worsening').length}
              </span>
              <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                稳定 {timelines.filter((t) => t.records[t.records.length - 1]?.trend === 'stable').length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-amber-500" />
            <span className="font-medium text-slate-700">待确认模糊项</span>
          </div>
          <p className="text-3xl font-bold text-amber-600 mb-1">
            {analysisResults.filter((r) => r.isAmbiguous).length}
          </p>
          <p className="text-sm text-slate-500">条记录需要人工核实判断</p>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">置信度分布</p>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-green-500 h-full"
                style={{ width: `${(analysisResults.filter((r) => r.confidence >= 0.8).length / Math.max(analysisResults.length, 1)) * 100}%` }}
              />
              <div
                className="bg-yellow-500 h-full"
                style={{ width: `${(analysisResults.filter((r) => r.confidence >= 0.5 && r.confidence < 0.8).length / Math.max(analysisResults.length, 1)) * 100}%` }}
              />
              <div
                className="bg-red-500 h-full"
                style={{ width: `${(analysisResults.filter((r) => r.confidence < 0.5).length / Math.max(analysisResults.length, 1)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-slate-400">
              <span>高 ≥0.8</span>
              <span>中 0.5-0.8</span>
              <span>低 &lt;0.5</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100">
          <div className="flex">
            {categoryTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveCategory(tab.key as CategoryType | 'all')}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeCategory === tab.key
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeCategory === tab.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {filteredResults.map((result) => {
              const sms = useSmsStore.getState().getSmsById(result.smsId);
              if (!sms) return null;
              const isExpanded = expandedResult === result.id;
              const categoryConfig = CATEGORY_CONFIGS.find((c) => c.key === result.category);
              const severityConfig = SEVERITY_CONFIGS.find((c) => c.key === result.severity);

              return (
                <motion.div
                  key={result.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div
                    className="flex items-start gap-4 cursor-pointer"
                    onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: categoryConfig?.bgColor }}
                    >
                      <User className="w-5 h-5" style={{ color: categoryConfig?.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-800">{sms.patientNameMasked}</span>
                        {sms.sender === 'family' && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                            家属代发
                          </span>
                        )}
                        {result.isAmbiguous && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" />
                            模糊待查
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">{sms.content}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {timelineService.formatDate(sms.sendTime)}
                        </div>
                        <CategoryBadge category={result.category} size="sm" />
                        <SeverityBadge severity={result.severity} size="sm" />
                        <span className="text-xs text-slate-400">
                          置信度 {Math.round(result.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div
                        className="px-3 py-1 rounded-lg text-sm font-medium"
                        style={{
                          backgroundColor: categoryConfig?.bgColor,
                          color: categoryConfig?.color,
                        }}
                      >
                        {result.summary}
                      </div>
                      <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 ml-14 p-4 bg-slate-50 rounded-xl">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                                <MessageCircle className="w-3 h-3 inline mr-1" />
                                原句依据
                              </p>
                              <div className="space-y-2">
                                {result.evidence.map((ev, idx) => (
                                  <blockquote
                                    key={idx}
                                    className="text-sm text-slate-700 pl-3 border-l-2 border-blue-300 bg-white p-2 rounded"
                                    dangerouslySetInnerHTML={{
                                      __html: highlightKeywords(ev, result.keywords),
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                                分析详情
                              </p>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">分类</span>
                                  <CategoryBadge category={result.category} size="sm" />
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">严重程度</span>
                                  <SeverityBadge severity={result.severity} size="sm" />
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">置信度</span>
                                  <span
                                    className={`font-medium ${
                                      result.confidence >= 0.8
                                        ? 'text-green-600'
                                        : result.confidence >= 0.5
                                        ? 'text-yellow-600'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {Math.round(result.confidence * 100)}%
                                  </span>
                                </div>
                                {result.isAmbiguous && (
                                  <div className="p-2 bg-amber-50 rounded text-amber-700 text-sm">
                                    <HelpCircle className="w-4 h-4 inline mr-1" />
                                    {result.ambiguousReason}
                                  </div>
                                )}
                                {sms.nurseNote && (
                                  <div className="p-2 bg-blue-50 rounded text-blue-700 text-sm">
                                    <span className="font-medium">护士备注：</span>
                                    {sms.nurseNote}
                                  </div>
                                )}
                                <div>
                                  <span className="text-slate-500 text-xs">关键词：</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {result.keywords.map((kw, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded"
                                      >
                                        {kw}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {timelines.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">患者时间线</h3>
            <p className="text-sm text-slate-500">同一患者多天连续反馈记录</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {timelines
              .filter((t) => t.records.length > 1)
              .map((timeline) => (
                <PatientTimelineComponent
                  key={timeline.patientId}
                  timeline={timeline}
                  isExpanded={expandedTimeline === timeline.patientId}
                  onToggle={() =>
                    setExpandedTimeline(
                      expandedTimeline === timeline.patientId ? null : timeline.patientId
                    )
                  }
                  getTrendIcon={getTrendIcon}
                  getTrendLabel={getTrendLabel}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface TimelineProps {
  timeline: PatientTimeline;
  isExpanded: boolean;
  onToggle: () => void;
  getTrendIcon: (trend: string) => React.ReactNode;
  getTrendLabel: (trend: string) => { text: string; color: string };
}

const PatientTimelineComponent = ({
  timeline,
  isExpanded,
  onToggle,
  getTrendIcon,
  getTrendLabel,
}: TimelineProps) => {
  const latestRecord = timeline.records[timeline.records.length - 1];
  const trendInfo = getTrendLabel(latestRecord.trend);

  return (
    <div className="p-4">
      <div
        className="flex items-center gap-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800">{timeline.patientNameMasked}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${trendInfo.color}`}>
              {getTrendIcon(latestRecord.trend)}
              <span className="ml-1">{trendInfo.text}</span>
            </span>
          </div>
          <p className="text-sm text-slate-500">
            共 {timeline.records.length} 天反馈记录
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CategoryBadge category={latestRecord.category} size="sm" />
          <SeverityBadge severity={latestRecord.severity} size="sm" />
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 ml-5 pl-8 border-l-2 border-slate-200 relative">
              {timeline.records.map((record, idx) => {
                const categoryConfig = CATEGORY_CONFIGS.find((c) => c.key === record.category);
                const recordTrend = getTrendLabel(record.trend);
                return (
                  <div key={idx} className="mb-6 relative last:mb-0">
                    <div
                      className="absolute -left-[42px] w-6 h-6 rounded-full border-4 border-white flex items-center justify-center"
                      style={{ backgroundColor: categoryConfig?.color }}
                    />
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-slate-500">
                          {timelineService.formatDate(record.date)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${recordTrend.color}`}>
                          {recordTrend.text}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{record.summary}</p>
                      <div className="flex items-center gap-2">
                        <CategoryBadge category={record.category} size="sm" />
                        <SeverityBadge severity={record.severity} size="sm" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
