import { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AnalysisResult } from '../types';
import RiskBadge from '../components/StatusBadge/RiskBadge';
import {
  AlertTriangle,
  OctagonAlert,
  CheckCircle2,
  Download,
  MapPin,
  TrendingUp,
  Ruler,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { formatWidth, formatGrowthRate, downloadCSV, formatDate } from '../utils/format';

interface BridgeSummary {
  bridgeId: string;
  bridgeName: string;
  totalCracks: number;
  normalCount: number;
  warningCount: number;
  dangerCount: number;
  cracks: AnalysisResult[];
}

export default function ManagementReport() {
  const { analyzeAllCracks, threshold, bridges } = useAppStore();
  const [expandedBridge, setExpandedBridge] = useState<string | null>(null);

  const allAnalysis = useMemo(() => analyzeAllCracks(), [analyzeAllCracks]);

  const bridgeSummaries = useMemo((): BridgeSummary[] => {
    const summaryMap = new Map<string, BridgeSummary>();

    allAnalysis.forEach((analysis) => {
      const bridgeId = analysis.bridgeId;
      if (!summaryMap.has(bridgeId)) {
        summaryMap.set(bridgeId, {
          bridgeId,
          bridgeName: analysis.bridgeName,
          totalCracks: 0,
          normalCount: 0,
          warningCount: 0,
          dangerCount: 0,
          cracks: [],
        });
      }

      const summary = summaryMap.get(bridgeId)!;
      summary.totalCracks++;
      summary.cracks.push(analysis);

      if (analysis.riskLevel === 'normal') summary.normalCount++;
      else if (analysis.riskLevel === 'warning') summary.warningCount++;
      else if (analysis.riskLevel === 'danger') summary.dangerCount++;
    });

    return Array.from(summaryMap.values()).sort((a, b) => {
      const priorityA = a.dangerCount * 100 + a.warningCount * 10;
      const priorityB = b.dangerCount * 100 + b.warningCount * 10;
      return priorityB - priorityA;
    });
  }, [allAnalysis]);

  const warningCracks = useMemo(
    () => allAnalysis.filter((a) => a.riskLevel === 'warning'),
    [allAnalysis]
  );

  const dangerCracks = useMemo(
    () => allAnalysis.filter((a) => a.riskLevel === 'danger'),
    [allAnalysis]
  );

  const normalCracks = useMemo(
    () => allAnalysis.filter((a) => a.riskLevel === 'normal'),
    [allAnalysis]
  );

  const toggleBridge = (bridgeId: string) => {
    setExpandedBridge(expandedBridge === bridgeId ? null : bridgeId);
  };

  const handleExportReport = () => {
    const exportData = allAnalysis
      .sort((a, b) => {
        const order = { danger: 0, warning: 1, normal: 2 };
        return order[a.riskLevel] - order[b.riskLevel];
      })
      .map((a) => ({
        桥梁名称: a.bridgeName,
        裂缝编号: a.crackCode,
        裂缝位置: a.location,
        风险等级: a.riskLevel === 'normal' ? '正常' : a.riskLevel === 'warning' ? '需复查' : '需封控',
        当前宽度_mm: a.currentWidth.toFixed(2),
        增长速率_mm季度: a.growthRate.toFixed(3),
        趋势可信度_R2: a.rSquared.toFixed(4),
        预测下季度宽度_mm: a.predictedWidth.toFixed(2),
        首次测量: a.firstMeasureDate,
        最近测量: a.lastMeasureDate,
        测量次数: a.measureCount,
        预警信息: a.warnings.join('; '),
      }));

    const filename = `桥梁裂缝风险评估报告_${new Date().toISOString().split('T')[0]}`;
    downloadCSV(exportData, filename);
  };

  const handleExportActionList = (type: 'warning' | 'danger') => {
    const cracks = type === 'warning' ? warningCracks : dangerCracks;
    const exportData = cracks.map((a) => ({
      桥梁名称: a.bridgeName,
      裂缝编号: a.crackCode,
      裂缝位置: a.location,
      当前宽度: `${a.currentWidth.toFixed(2)} mm`,
      增长速率: `${a.growthRate.toFixed(3)} mm/季度`,
      风险等级: type === 'warning' ? '需复查' : '需封控',
      最近测量日期: a.lastMeasureDate,
      预警信息: a.warnings.join('; '),
      建议措施: type === 'danger' ? '立即封控，安排专家检测' : '增加监测频率，重点关注',
    }));

    const filename = `${type === 'warning' ? '需复查' : '需封控'}_裂缝清单_${new Date().toISOString().split('T')[0]}`;
    downloadCSV(exportData, filename);
  };

  const statCards = [
    {
      label: '需封控',
      value: dangerCracks.length,
      unit: '条',
      icon: OctagonAlert,
      bgColor: 'bg-danger-50',
      textColor: 'text-danger-600',
      borderColor: 'border-danger-200',
    },
    {
      label: '需复查',
      value: warningCracks.length,
      unit: '条',
      icon: AlertTriangle,
      bgColor: 'bg-warning-50',
      textColor: 'text-warning-600',
      borderColor: 'border-warning-200',
    },
    {
      label: '正常监控',
      value: normalCracks.length,
      unit: '条',
      icon: CheckCircle2,
      bgColor: 'bg-success-50',
      textColor: 'text-success-600',
      borderColor: 'border-success-200',
    },
    {
      label: '监测桥梁',
      value: bridges.length,
      unit: '座',
      icon: MapPin,
      bgColor: 'bg-primary-50',
      textColor: 'text-primary-600',
      borderColor: 'border-primary-200',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 mb-1">管理处报告</h2>
          <p className="text-sm text-neutral-500">
            查看各桥梁风险概览、需复查和需封控裂缝清单
          </p>
        </div>
        <button onClick={handleExportReport} className="btn-primary">
          <Download className="w-4 h-4 mr-2" />
          导出完整报告
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className={`card p-5 border-l-4 ${card.borderColor}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-2">{card.label}</p>
                <p className={`text-3xl font-bold ${card.textColor}`}>
                  {card.value}
                  <span className="text-base font-normal ml-1 text-neutral-500">
                    {card.unit}
                  </span>
                </p>
              </div>
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-6 h-6 ${card.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 border-l-4 border-danger-400">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-danger-50">
                <OctagonAlert className="w-5 h-5 text-danger-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-800">需封控裂缝</h3>
                <p className="text-xs text-neutral-500">增长速率或宽度超过封控阈值</p>
              </div>
            </div>
            <button
              onClick={() => handleExportActionList('danger')}
              disabled={dangerCracks.length === 0}
              className="btn-danger text-xs py-1.5 px-3"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              导出清单
            </button>
          </div>

          {dangerCracks.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {dangerCracks.map((crack) => (
                <div
                  key={crack.crackId}
                  className="p-4 bg-danger-50 rounded-lg border border-danger-100"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono font-semibold text-neutral-800">
                        {crack.crackCode}
                      </span>
                      <span className="text-sm text-neutral-500 ml-2">
                        {crack.bridgeName}
                      </span>
                    </div>
                    <RiskBadge level="danger" size="sm" />
                  </div>
                  <p className="text-sm text-neutral-600 mb-3">
                    <MapPin className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    {crack.location}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-neutral-500">当前宽度</span>
                      <p className="font-mono font-medium text-danger-700">
                        {formatWidth(crack.currentWidth)}
                      </p>
                    </div>
                    <div>
                      <span className="text-neutral-500">增长速率</span>
                      <p className="font-mono font-medium text-danger-700">
                        {formatGrowthRate(crack.growthRate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-neutral-500">最近测量</span>
                      <p className="font-medium">
                        {formatDate(crack.lastMeasureDate)}
                      </p>
                    </div>
                  </div>
                  {crack.warnings.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-danger-200">
                      <p className="text-xs text-danger-700 font-medium">预警:</p>
                      <p className="text-xs text-danger-600 mt-1">
                        {crack.warnings[0]}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <CheckCircle2 className="w-10 h-10 text-success-400 mx-auto mb-2" />
              <p>暂无需封控的裂缝</p>
            </div>
          )}
        </div>

        <div className="card p-6 border-l-4 border-warning-400">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning-50">
                <AlertTriangle className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-800">需复查裂缝</h3>
                <p className="text-xs text-neutral-500">接近阈值，需增加监测频率</p>
              </div>
            </div>
            <button
              onClick={() => handleExportActionList('warning')}
              disabled={warningCracks.length === 0}
              className="btn-warning text-xs py-1.5 px-3"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              导出清单
            </button>
          </div>

          {warningCracks.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {warningCracks.map((crack) => (
                <div
                  key={crack.crackId}
                  className="p-4 bg-warning-50 rounded-lg border border-warning-100"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono font-semibold text-neutral-800">
                        {crack.crackCode}
                      </span>
                      <span className="text-sm text-neutral-500 ml-2">
                        {crack.bridgeName}
                      </span>
                    </div>
                    <RiskBadge level="warning" size="sm" />
                  </div>
                  <p className="text-sm text-neutral-600 mb-3">
                    <MapPin className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    {crack.location}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-neutral-500">当前宽度</span>
                      <p className="font-mono font-medium text-warning-700">
                        {formatWidth(crack.currentWidth)}
                      </p>
                    </div>
                    <div>
                      <span className="text-neutral-500">增长速率</span>
                      <p className="font-mono font-medium text-warning-700">
                        {formatGrowthRate(crack.growthRate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-neutral-500">最近测量</span>
                      <p className="font-medium">
                        {formatDate(crack.lastMeasureDate)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <CheckCircle2 className="w-10 h-10 text-success-400 mx-auto mb-2" />
              <p>暂无需复查的裂缝</p>
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary-600" />
          各桥梁风险分布
        </h3>
        <div className="space-y-3">
          {bridgeSummaries.map((summary) => (
            <div key={summary.bridgeId} className="border border-neutral-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleBridge(summary.bridgeId)}
                className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {expandedBridge === summary.bridgeId ? (
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-neutral-400" />
                  )}
                  <div>
                    <p className="font-medium text-neutral-800">{summary.bridgeName}</p>
                    <p className="text-sm text-neutral-500">
                      共 {summary.totalCracks} 条裂缝
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {summary.dangerCount > 0 && (
                    <span className="badge-danger">
                      <OctagonAlert className="w-3 h-3 inline mr-1" />
                      需封控 {summary.dangerCount}
                    </span>
                  )}
                  {summary.warningCount > 0 && (
                    <span className="badge-warning">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      需复查 {summary.warningCount}
                    </span>
                  )}
                  {summary.normalCount > 0 && (
                    <span className="badge-success">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                      正常 {summary.normalCount}
                    </span>
                  )}
                </div>
              </button>

              {expandedBridge === summary.bridgeId && (
                <div className="border-t border-neutral-200 p-4 bg-neutral-50">
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>裂缝编号</th>
                          <th>位置</th>
                          <th>当前宽度</th>
                          <th>增长速率</th>
                          <th>风险等级</th>
                          <th>最近测量</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.cracks
                          .sort((a, b) => {
                            const order = { danger: 0, warning: 1, normal: 2 };
                            return order[a.riskLevel] - order[b.riskLevel];
                          })
                          .map((crack) => (
                            <tr
                              key={crack.crackId}
                              className={
                                crack.riskLevel === 'danger'
                                  ? 'danger-row'
                                  : crack.riskLevel === 'warning'
                                  ? 'warning-row'
                                  : ''
                              }
                            >
                              <td className="font-mono font-medium">{crack.crackCode}</td>
                              <td>{crack.location}</td>
                              <td className="font-mono">{formatWidth(crack.currentWidth)}</td>
                              <td className="font-mono">
                                <span className={crack.growthRate > threshold.warningRate ? 'text-danger-600' : ''}>
                                  {formatGrowthRate(crack.growthRate)}
                                </span>
                              </td>
                              <td>
                                <RiskBadge level={crack.riskLevel} size="sm" />
                              </td>
                              <td className="font-mono text-sm">
                                {formatDate(crack.lastMeasureDate)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
