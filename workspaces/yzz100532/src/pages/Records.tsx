import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Award,
  Timer,
  Trophy,
  Calendar,
  User,
  ArrowRight,
  Lightbulb,
  MapPin,
} from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { HudPanel } from '@/components/ui/HudPanel';
import { IndustrialButton } from '@/components/ui/IndustrialButton';
import { StatCard } from '@/components/ui/StatCard';
import { WarningBadge } from '@/components/ui/WarningBadge';
import Empty from '@/components/Empty';
import { db } from '@/data/db';
import type { DrillRecord, Scenario, TunnelNode } from '@/types';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}分${secs}秒`;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-safety-green';
  if (score >= 80) return 'text-tech-cyan';
  if (score >= 70) return 'text-warning-orange';
  return 'text-alert-red';
};

export default function Records() {
  const [records, setRecords] = useState<DrillRecord[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [nodes, setNodes] = useState<TunnelNode[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterScenarioId, setFilterScenarioId] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [isScenarioDropdownOpen, setIsScenarioDropdownOpen] = useState(false);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [recordsData, scenariosData, nodesData] = await Promise.all([
      db.getAllRecords(),
      db.getAllScenarios(),
      db.getAllNodes(),
    ]);
    setRecords(recordsData);
    setScenarios(scenariosData);
    setNodes(nodesData);
  };

  const stats = useMemo(() => {
    if (records.length === 0) {
      return {
        total: 0,
        avgScore: 0,
        avgTime: 0,
        bestRecord: null as DrillRecord | null,
      };
    }

    const total = records.length;
    const avgScore = Math.round(
      records.reduce((sum, r) => sum + r.score, 0) / total
    );
    const avgTime = Math.round(
      records.reduce((sum, r) => sum + r.actualTime, 0) / total
    );
    const bestRecord = records.reduce((best, r) =>
      r.score > best.score ? r : best
    );

    return { total, avgScore, avgTime, bestRecord };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const scenario = scenarios.find((s) => s.id === r.scenarioId);
      const matchSearch =
        r.participantName.toLowerCase().includes(searchText.toLowerCase()) ||
        scenario?.name.toLowerCase().includes(searchText.toLowerCase());

      const matchScenario =
        filterScenarioId === 'all' || r.scenarioId === filterScenarioId;

      let matchDate = true;
      const recordDate = new Date(r.completedAt);
      const now = new Date();

      if (filterDateRange === 'today') {
        matchDate = recordDate.toDateString() === now.toDateString();
      } else if (filterDateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchDate = recordDate >= weekAgo;
      } else if (filterDateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchDate = recordDate >= monthAgo;
      }

      return matchSearch && matchScenario && matchDate;
    });
  }, [records, scenarios, searchText, filterScenarioId, filterDateRange]);

  const getScenarioName = (scenarioId: string) => {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    return scenario?.name || '未知方案';
  };

  const getNodeName = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node?.name || nodeId;
  };

  const toggleExpand = (recordId: string) => {
    setExpandedRecordId(expandedRecordId === recordId ? null : recordId);
  };

  const getChartData = (record: DrillRecord) => {
    const totalNodes = record.timestamps.length;
    if (totalNodes === 0) return [];

    const estimatedStep = record.estimatedTime / totalNodes;

    return record.timestamps.map((ts, index) => ({
      name: getNodeName(ts.nodeId),
      实际耗时: ts.time,
      预计耗时: Math.round(estimatedStep * (index + 1)),
    }));
  };

  const generateSuggestions = (record: DrillRecord) => {
    const suggestions: string[] = [];
    const timeDiff = record.actualTime - record.estimatedTime;

    if (timeDiff > 60) {
      suggestions.push(
        `实际耗时比预计多 ${Math.round(timeDiff / 60)} 分钟，建议优化路线选择`
      );
    } else if (timeDiff < -30) {
      suggestions.push('表现优秀，提前完成撤离，可作为标准参考路线');
    }

    if (record.score >= 90) {
      suggestions.push('演练评分优秀，操作规范，继续保持');
    } else if (record.score < 70) {
      suggestions.push('评分偏低，建议加强应急演练培训');
    }

    if (record.timestamps.length > 0) {
      const firstHalf = record.timestamps.slice(
        0,
        Math.floor(record.timestamps.length / 2)
      );
      const secondHalf = record.timestamps.slice(
        Math.floor(record.timestamps.length / 2)
      );
      const firstHalfTime =
        firstHalf[firstHalf.length - 1]?.time - firstHalf[0]?.time || 0;
      const secondHalfTime =
        secondHalf[secondHalf.length - 1]?.time - secondHalf[0]?.time || 0;

      if (secondHalfTime > firstHalfTime * 1.5) {
        suggestions.push('后半程速度明显下降，注意体能分配');
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('整体表现正常，继续保持训练');
    }

    return suggestions;
  };

  return (
    <PageLayout title="演练记录">
      <div className="h-full flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Clock size={24} />}
            value={stats.total}
            label="总演练次数"
            variant="cyan"
          />
          <StatCard
            icon={<Award size={24} />}
            value={`${stats.avgScore}分`}
            label="平均评分"
            variant="green"
          />
          <StatCard
            icon={<Timer size={24} />}
            value={formatDuration(stats.avgTime)}
            label="平均耗时"
            variant="orange"
          />
          <StatCard
            icon={<Trophy size={24} />}
            value={stats.bestRecord ? `${stats.bestRecord.score}分` : '-'}
            label="最佳记录"
            variant="red"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="按人员或方案名称搜索..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-mine-blue-dark/50 border border-metal-gray text-white placeholder-gray-500 focus:outline-none focus:border-tech-cyan focus:shadow-glow-cyan transition-all"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsScenarioDropdownOpen(!isScenarioDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-mine-blue-dark/50 border border-metal-gray text-white hover:border-tech-cyan transition-all min-w-40"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm flex-1 text-left">
                {filterScenarioId === 'all'
                  ? '全部方案'
                  : getScenarioName(filterScenarioId)}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {isScenarioDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-mine-blue-dark border border-metal-gray z-50 max-h-48 overflow-auto">
                <button
                  onClick={() => {
                    setFilterScenarioId('all');
                    setIsScenarioDropdownOpen(false);
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm hover:bg-tech-cyan/10 transition-colors',
                    filterScenarioId === 'all' ? 'text-tech-cyan' : 'text-white'
                  )}
                >
                  全部方案
                </button>
                {scenarios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setFilterScenarioId(s.id);
                      setIsScenarioDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-tech-cyan/10 transition-colors',
                      filterScenarioId === s.id ? 'text-tech-cyan' : 'text-white'
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-mine-blue-dark/50 border border-metal-gray text-white hover:border-tech-cyan transition-all min-w-36"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm flex-1 text-left">
                {filterDateRange === 'all'
                  ? '全部时间'
                  : filterDateRange === 'today'
                  ? '今天'
                  : filterDateRange === 'week'
                  ? '本周'
                  : '本月'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {isDateDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-mine-blue-dark border border-metal-gray z-50">
                {['all', 'today', 'week', 'month'].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setFilterDateRange(range);
                      setIsDateDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-tech-cyan/10 transition-colors',
                      filterDateRange === range ? 'text-tech-cyan' : 'text-white'
                    )}
                  >
                    {range === 'all'
                      ? '全部时间'
                      : range === 'today'
                      ? '今天'
                      : range === 'week'
                      ? '本周'
                      : '本月'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex-1 overflow-auto">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {filteredRecords.map((record, index) => {
                const isExpanded = expandedRecordId === record.id;
                const scenario = scenarios.find(
                  (s) => s.id === record.scenarioId
                );

                return (
                  <motion.div key={record.id} variants={itemVariants}>
                    <HudPanel
                      accentColor="cyan"
                      className={cn(
                        'cursor-pointer transition-all',
                        isExpanded && 'shadow-glow-cyan'
                      )}
                    >
                      <div
                        onClick={() => toggleExpand(record.id)}
                        className="flex items-center gap-4"
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-tech-cyan animate-pulse" />
                          {index < filteredRecords.length - 1 && (
                            <div className="w-0.5 h-8 bg-metal-gray/30 mt-1" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-base font-bold text-white truncate">
                              {getScenarioName(record.scenarioId)}
                            </h3>
                            <WarningBadge
                              level={
                                record.score >= 80
                                  ? 'info'
                                  : record.score >= 70
                                  ? 'warning'
                                  : 'danger'
                              }
                              pulse={false}
                            >
                              {record.score}分
                            </WarningBadge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {record.participantName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(record.completedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-tech-cyan">
                                实际：{formatDuration(record.actualTime)}
                              </span>
                              <ArrowRight className="w-3 h-3 mx-1" />
                              <span className="text-gray-500">
                                预计：{formatDuration(record.estimatedTime)}
                              </span>
                            </span>
                          </div>
                        </div>

                        <IndustrialButton
                          size="sm"
                          variant="default"
                          rightIcon={
                            isExpanded ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(record.id);
                          }}
                        >
                          详情
                        </IndustrialButton>
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-5 mt-4 border-t border-metal-gray/30">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <HudPanel
                                  title="路线耗时对比"
                                  accentColor="cyan"
                                  className="bg-mine-blue-dark/30"
                                >
                                  <div className="h-64">
                                    <ResponsiveContainer
                                      width="100%"
                                      height="100%"
                                    >
                                      <BarChart
                                        data={getChartData(record)}
                                        margin={{
                                          top: 10,
                                          right: 10,
                                          left: 0,
                                          bottom: 30,
                                        }}
                                      >
                                        <CartesianGrid
                                          strokeDasharray="3 3"
                                          stroke="#374151"
                                        />
                                        <XAxis
                                          dataKey="name"
                                          tick={{
                                            fill: '#9CA3AF',
                                            fontSize: 11,
                                          }}
                                          angle={-45}
                                          textAnchor="end"
                                          height={60}
                                        />
                                        <YAxis
                                          tick={{
                                            fill: '#9CA3AF',
                                            fontSize: 11,
                                          }}
                                          label={{
                                            value: '秒',
                                            angle: -90,
                                            position: 'insideLeft',
                                            fill: '#9CA3AF',
                                            fontSize: 11,
                                          }}
                                        />
                                        <Tooltip
                                          contentStyle={{
                                            backgroundColor:
                                              '#0F172A',
                                            border:
                                              '1px solid #06B6D4',
                                            borderRadius: 0,
                                          }}
                                          labelStyle={{
                                            color: '#fff',
                                          }}
                                        />
                                        <Legend
                                          wrapperStyle={{
                                            fontSize: 12,
                                            color: '#9CA3AF',
                                          }}
                                        />
                                        <Bar
                                          dataKey="实际耗时"
                                          fill="#06B6D4"
                                          radius={[4, 4, 0, 0]}
                                        />
                                        <Bar
                                          dataKey="预计耗时"
                                          fill="#6B7280"
                                          radius={[4, 4, 0, 0]}
                                        />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </HudPanel>

                                <div className="flex flex-col gap-4">
                                  <HudPanel
                                    title="途经节点时间戳"
                                    accentColor="orange"
                                    className="bg-mine-blue-dark/30"
                                  >
                                    <div className="max-h-48 overflow-auto space-y-2">
                                      {record.timestamps.map(
                                        (ts, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-center gap-3 text-sm"
                                          >
                                            <MapPin className="w-4 h-4 text-warning-orange shrink-0" />
                                            <span className="flex-1 text-white truncate">
                                              {getNodeName(ts.nodeId)}
                                            </span>
                                            <span className="text-tech-cyan font-mono">
                                              {formatDuration(ts.time)}
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </HudPanel>

                                  <HudPanel
                                    title="优化建议"
                                    accentColor="green"
                                    className="bg-mine-blue-dark/30 flex-1"
                                  >
                                    <div className="space-y-2">
                                      {generateSuggestions(record).map(
                                        (suggestion, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-start gap-2 text-sm"
                                          >
                                            <Lightbulb className="w-4 h-4 text-safety-green shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                              {suggestion}
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </HudPanel>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </HudPanel>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
