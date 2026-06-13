import { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { analyzeGrowthTrend } from '../services/trendAnalysis';
import GrowthTrendChart from '../components/Chart/GrowthTrendChart';
import MeasurementTable from '../components/Table/MeasurementTable';
import RiskBadge from '../components/StatusBadge/RiskBadge';
import FormField from '../components/Form/FormField';
import SelectInput from '../components/Form/SelectInput';
import { ChartDataPoint, AnalysisResult } from '../types';
import {
  Download,
  TrendingUp,
  AlertTriangle,
  Target,
  Clock,
  BarChart3,
  FileText,
  Thermometer,
  Ruler,
} from 'lucide-react';
import { formatDate, formatWidth, formatGrowthRate, downloadCSV } from '../utils/format';
import { formatPercent } from '../utils/format';
import { formatRSquaredInterpretation } from '../services/trendAnalysis';

export default function EngineerReport() {
  const { bridges, cracks, getCracksByBridgeId, getMeasurementsByCrackId, analyzeCrack, threshold } = useAppStore();

  const [selectedBridgeId, setSelectedBridgeId] = useState('');
  const [selectedCrackId, setSelectedCrackId] = useState('');

  const bridgeOptions = useMemo(
    () => bridges.map((b) => ({ value: b.id, label: `${b.name} (${b.location})` })),
    [bridges]
  );

  const crackOptions = useMemo(() => {
    if (!selectedBridgeId) return [];
    return getCracksByBridgeId(selectedBridgeId).map((c) => ({
      value: c.id,
      label: `${c.code} - ${c.location}`,
    }));
  }, [selectedBridgeId, getCracksByBridgeId]);

  const measurements = useMemo(() => {
    if (!selectedCrackId) return [];
    return getMeasurementsByCrackId(selectedCrackId);
  }, [selectedCrackId, getMeasurementsByCrackId]);

  const analysis = useMemo(() => {
    if (!selectedCrackId) return null;
    return analyzeCrack(selectedCrackId);
  }, [selectedCrackId, analyzeCrack]);

  const trendAnalysis = useMemo(() => {
    if (measurements.length < 2) return null;
    return analyzeGrowthTrend(measurements);
  }, [measurements]);

  const chartData = useMemo((): ChartDataPoint[] => {
    if (measurements.length === 0) return [];
    
    return measurements.map((m, idx) => ({
      date: m.measureDate,
      width: m.widthMm,
      temperature: m.temperature,
      trend: trendAnalysis?.trendLinePoints[idx]?.y,
    }));
  }, [measurements, trendAnalysis]);

  const currentCrack = useMemo(() => {
    if (!selectedCrackId) return null;
    return cracks.find((c) => c.id === selectedCrackId);
  }, [selectedCrackId, cracks]);

  const currentBridge = useMemo(() => {
    if (!selectedBridgeId) return null;
    return bridges.find((b) => b.id === selectedBridgeId);
  }, [selectedBridgeId, bridges]);

  const allAnalysis = useMemo(() => {
    if (!selectedBridgeId) return [];
    const bridgeCracks = getCracksByBridgeId(selectedBridgeId);
    return bridgeCracks
      .map((c) => analyzeCrack(c.id))
      .filter((r): r is AnalysisResult => r !== null)
      .sort((a, b) => {
        const order = { danger: 0, warning: 1, normal: 2 };
        return order[a.riskLevel] - order[b.riskLevel];
      });
  }, [selectedBridgeId, getCracksByBridgeId, analyzeCrack]);

  const handleExportCSV = () => {
    if (measurements.length === 0) return;
    
    const exportData = measurements.map((m) => ({
      '测量日期': m.measureDate,
      '原始值': `${m.widthRaw} ${m.widthUnit}`,
      '换算宽度(mm)': m.widthMm.toFixed(2),
      '温度(℃)': m.temperature.toFixed(1),
      '照片编号': m.photoId,
      '照片角度': m.photoAngle,
      '测量人': m.surveyor,
      '复核人': m.rechecker,
      '测量工具': m.tool,
      '异常说明': m.anomalies.map((a) => a.description).join('; '),
      '备注': m.notes,
    }));
    
    const filename = `${currentBridge?.name || '桥梁'}_${currentCrack?.code || '裂缝'}_测量记录_${new Date().toISOString().split('T')[0]}`;
    downloadCSV(exportData, filename);
  };

  const handleExportReport = () => {
    if (!analysis) return;
    
    const reportData = [
      { 项目: '桥梁名称', 值: analysis.bridgeName },
      { 项目: '裂缝编号', 值: analysis.crackCode },
      { 项目: '裂缝位置', 值: analysis.location },
      { 项目: '风险等级', 值: analysis.riskLevel === 'normal' ? '正常' : analysis.riskLevel === 'warning' ? '需复查' : '需封控' },
      { 项目: '当前宽度', 值: `${analysis.currentWidth.toFixed(2)} mm` },
      { 项目: '增长速率', 值: `${analysis.growthRate.toFixed(3)} mm/季度` },
      { 项目: '趋势可信度', 值: `R² = ${formatPercent(analysis.rSquared)}` },
      { 项目: '预测下季度宽度', 值: `${analysis.predictedWidth.toFixed(2)} mm` },
      { 项目: '首次测量日期', 值: analysis.firstMeasureDate },
      { 项目: '最近测量日期', 值: analysis.lastMeasureDate },
      { 项目: '测量次数', 值: `${analysis.measureCount} 次` },
      { 项目: '预警信息', 值: analysis.warnings.join('; ') },
    ];
    
    const filename = `${analysis.bridgeName}_${analysis.crackCode}_分析报告_${new Date().toISOString().split('T')[0]}`;
    downloadCSV(reportData, filename);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 mb-1">工程师报告</h2>
          <p className="text-sm text-neutral-500">
            查看详细数据分析、增长曲线和趋势预测
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={measurements.length === 0}
            className="btn-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            导出数据
          </button>
          <button
            onClick={handleExportReport}
            disabled={!analysis}
            className="btn-primary"
          >
            <FileText className="w-4 h-4 mr-2" />
            导出报告
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="选择桥梁">
            <SelectInput
              value={selectedBridgeId}
              onChange={setSelectedBridgeId}
              options={bridgeOptions}
              placeholder="请选择桥梁"
            />
          </FormField>
          <FormField label="选择裂缝">
            <SelectInput
              value={selectedCrackId}
              onChange={setSelectedCrackId}
              options={crackOptions}
              placeholder={selectedBridgeId ? '请选择裂缝' : '请先选择桥梁'}
              disabled={!selectedBridgeId}
            />
          </FormField>
        </div>
      </div>

      {selectedBridgeId && !selectedCrackId && allAnalysis.length > 0 && (
        <div className="card p-6">
          <h3 className="text-base font-semibold text-neutral-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            桥梁裂缝风险概览
          </h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>裂缝编号</th>
                  <th>位置</th>
                  <th>当前宽度</th>
                  <th>增长速率</th>
                  <th>测量次数</th>
                  <th>风险等级</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {allAnalysis.map((a) => (
                  <tr key={a.crackId} className={a.riskLevel === 'danger' ? 'danger-row' : a.riskLevel === 'warning' ? 'warning-row' : ''}>
                    <td className="font-mono font-medium">{a.crackCode}</td>
                    <td>{a.location}</td>
                    <td className="font-mono">{formatWidth(a.currentWidth)}</td>
                    <td className="font-mono">
                      <span className={a.growthRate > threshold.warningRate ? 'text-danger-600' : ''}>
                        {formatGrowthRate(a.growthRate)}
                      </span>
                    </td>
                    <td>{a.measureCount} 次</td>
                    <td>
                      <RiskBadge level={a.riskLevel} size="sm" />
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedCrackId(a.crackId)}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {analysis && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">当前宽度</p>
                  <p className="text-2xl font-bold font-mono text-primary-700">
                    {formatWidth(analysis.currentWidth)}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    阈值: {formatWidth(threshold.dangerWidth)}
                  </p>
                </div>
                <div className="p-2 rounded bg-primary-50">
                  <Ruler className="w-5 h-5 text-primary-600" />
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">增长速率</p>
                  <p className={`text-2xl font-bold font-mono ${analysis.growthRate > threshold.warningRate ? 'text-danger-600' : 'text-success-600'}`}>
                    {formatGrowthRate(analysis.growthRate)}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    阈值: {formatGrowthRate(threshold.dangerRate)}
                  </p>
                </div>
                <div className="p-2 rounded bg-neutral-50">
                  <TrendingUp className="w-5 h-5 text-neutral-600" />
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">趋势可信度</p>
                  <p className="text-2xl font-bold font-mono text-neutral-700">
                    R² = {formatPercent(analysis.rSquared)}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {formatRSquaredInterpretation(analysis.rSquared)}
                  </p>
                </div>
                <div className="p-2 rounded bg-neutral-50">
                  <Target className="w-5 h-5 text-neutral-600" />
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">预测下季度</p>
                  <p className="text-2xl font-bold font-mono text-primary-700">
                    {formatWidth(analysis.predictedWidth)}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    监测: {analysis.measureCount} 次
                  </p>
                </div>
                <div className="p-2 rounded bg-neutral-50">
                  <Clock className="w-5 h-5 text-neutral-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-neutral-800">
                  {currentCrack?.code} - {currentCrack?.location}
                </h3>
                <p className="text-sm text-neutral-500 mt-1">{currentCrack?.description}</p>
              </div>
              <RiskBadge level={analysis.riskLevel} />
            </div>

            {analysis.warnings.length > 0 && (
              <div className="mb-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning-800 mb-2">需要关注的问题</p>
                    <ul className="space-y-1">
                      {analysis.warnings.map((warning, idx) => (
                        <li key={idx} className="text-sm text-warning-700 flex items-start gap-1.5">
                          <span className="text-warning-500 mt-1">•</span>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              增长趋势曲线
            </h4>
            <GrowthTrendChart
              data={chartData}
              warningThreshold={threshold.warningWidth}
              dangerThreshold={threshold.dangerWidth}
              height={380}
            />

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-xs text-neutral-500 mb-1">监测周期</p>
                <p className="text-sm font-medium">
                  {formatDate(analysis.firstMeasureDate)} ~ {formatDate(analysis.lastMeasureDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">累计增长</p>
                <p className="text-sm font-medium font-mono">
                  {trendAnalysis ? formatWidth(trendAnalysis.totalGrowth) : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">年增长预测</p>
                <p className="text-sm font-medium font-mono">
                  {trendAnalysis ? formatGrowthRate(trendAnalysis.growthRatePerYear) : '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h4 className="text-sm font-semibold text-neutral-700 mb-4">详细测量记录</h4>
            <MeasurementTable measurements={measurements} />
          </div>
        </>
      )}

      {!selectedBridgeId && !selectedCrackId && (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500">请选择桥梁查看裂缝分析报告</p>
        </div>
      )}
    </div>
  );
}
