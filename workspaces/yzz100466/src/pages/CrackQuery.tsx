import { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import FormField from '../components/Form/FormField';
import SelectInput from '../components/Form/SelectInput';
import MeasurementTable from '../components/Table/MeasurementTable';
import RiskBadge from '../components/StatusBadge/RiskBadge';
import { Search, TrendingUp, Calendar, Ruler, AlertCircle, Info } from 'lucide-react';
import { analyzeGrowthTrend, formatRSquaredInterpretation } from '../services/trendAnalysis';
import { formatDate, formatWidth, formatGrowthRate } from '../utils/format';
import { formatPercent } from '../utils/format';

export default function CrackQuery() {
  const {
    bridges,
    cracks,
    getCracksByBridgeId,
    getMeasurementsByCrackId,
    getCrackByCode,
    analyzeCrack,
    threshold,
  } = useAppStore();

  const [selectedBridgeId, setSelectedBridgeId] = useState('');
  const [selectedCrackId, setSelectedCrackId] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [showDetails, setShowDetails] = useState(false);

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

  const currentCrack = useMemo(() => {
    if (!selectedCrackId) return null;
    return cracks.find((c) => c.id === selectedCrackId);
  }, [selectedCrackId, cracks]);

  const handleSearchByCode = () => {
    if (!searchCode.trim()) return;
    const crack = getCrackByCode(searchCode.trim().toUpperCase());
    if (crack) {
      setSelectedBridgeId(crack.bridgeId);
      setSelectedCrackId(crack.id);
      setShowDetails(true);
    }
  };

  const handleBridgeChange = (value: string) => {
    setSelectedBridgeId(value);
    setSelectedCrackId('');
    setShowDetails(false);
  };

  const handleCrackChange = (value: string) => {
    setSelectedCrackId(value);
    setShowDetails(!!value);
  };

  const statCards = [
    {
      label: '测量次数',
      value: measurements.length,
      unit: '次',
      icon: Calendar,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      label: '当前宽度',
      value: measurements.length > 0 ? measurements[measurements.length - 1].widthMm.toFixed(2) : '-',
      unit: 'mm',
      icon: Ruler,
      color: 'text-neutral-700',
      bg: 'bg-neutral-50',
    },
    {
      label: '增长速率',
      value: trendAnalysis ? trendAnalysis.growthRatePerQuarter.toFixed(3) : '-',
      unit: 'mm/季度',
      icon: TrendingUp,
      color: trendAnalysis && trendAnalysis.growthRatePerQuarter > threshold.warningRate ? 'text-danger-600' : 'text-success-600',
      bg: 'bg-neutral-50',
    },
    {
      label: '首次测量',
      value: measurements.length > 0 ? formatDate(measurements[0].measureDate) : '-',
      unit: '',
      icon: Calendar,
      color: 'text-neutral-600',
      bg: 'bg-neutral-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-800 mb-1">裂缝查询</h2>
        <p className="text-sm text-neutral-500">
          按桥梁或裂缝编号查询历史测量记录及增长趋势
        </p>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <FormField label="按裂缝编号查询">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchByCode()}
                  placeholder="输入裂缝编号，如 L-001"
                  className="input font-mono"
                />
                <button onClick={handleSearchByCode} className="btn-primary px-4">
                  <Search className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-neutral-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                支持曾用名查询，系统自动映射
              </p>
            </FormField>
          </div>

          <div className="md:col-span-1 flex items-center justify-center text-neutral-400 text-sm">
            或
          </div>

          <div className="md:col-span-3">
            <FormField label="选择桥梁">
              <SelectInput
                value={selectedBridgeId}
                onChange={handleBridgeChange}
                options={bridgeOptions}
                placeholder="请选择桥梁"
              />
            </FormField>
          </div>

          <div className="md:col-span-4">
            <FormField label="选择裂缝">
              <SelectInput
                value={selectedCrackId}
                onChange={handleCrackChange}
                options={crackOptions}
                placeholder={selectedBridgeId ? '请选择裂缝' : '请先选择桥梁'}
                disabled={!selectedBridgeId}
              />
            </FormField>
          </div>
        </div>
      </div>

      {showDetails && analysis && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card, idx) => (
              <div key={idx} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">{card.label}</p>
                    <p className={`text-2xl font-bold font-mono ${card.color}`}>
                      {card.value}
                      <span className="text-sm font-normal ml-1 text-neutral-500">{card.unit}</span>
                    </p>
                  </div>
                  <div className={`p-2 rounded ${card.bg}`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </div>
            ))}
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

            {trendAnalysis && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-neutral-50 rounded-lg">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">增长速率</p>
                  <p className="text-lg font-semibold font-mono">
                    {formatGrowthRate(trendAnalysis.growthRatePerQuarter)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    年增长: {formatGrowthRate(trendAnalysis.growthRatePerYear)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">趋势可信度</p>
                  <p className="text-lg font-semibold font-mono">R² = {formatPercent(trendAnalysis.rSquared)}</p>
                  <p className="text-xs text-neutral-500">{formatRSquaredInterpretation(trendAnalysis.rSquared)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">累计增长</p>
                  <p className="text-lg font-semibold font-mono">{formatWidth(trendAnalysis.totalGrowth)}</p>
                  <p className="text-xs text-neutral-500">
                    监测周期: {trendAnalysis.measurementPeriodDays} 天
                  </p>
                </div>
              </div>
            )}

            {analysis.warnings.length > 0 && (
              <div className="mb-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning-800 mb-2">预警信息</p>
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

            <h4 className="text-sm font-semibold text-neutral-700 mb-3">历史测量记录</h4>
            <MeasurementTable measurements={measurements} />
          </div>
        </>
      )}

      {showDetails && !analysis && (
        <div className="card p-12 text-center">
          <p className="text-neutral-500">该裂缝暂无测量记录</p>
        </div>
      )}
    </div>
  );
}
