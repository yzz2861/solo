import { useEffect } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import ModalBase from './ModalBase';
import { useLayoutStore } from '@/store/useLayoutStore';
import { cn } from '@/lib/utils';
import type { LayoutScheme } from '@/types';

interface CompareMetric {
  key: string;
  label: string;
  unit: string;
  /** 取值函数 */
  getValue: (scheme: LayoutScheme) => number;
  /** 是否越小越好 */
  lowerIsBetter: boolean;
}

/** 对比指标定义 */
const COMPARE_METRICS: CompareMetric[] = [
  {
    key: 'landUsage',
    label: '占地',
    unit: 'm²',
    getValue: (s) => s.metrics.landUsage,
    lowerIsBetter: true,
  },
  {
    key: 'chargerCount',
    label: '充电桩数',
    unit: '个',
    getValue: (s) => s.metrics.chargerCount,
    lowerIsBetter: false,
  },
  {
    key: 'waitCapacity',
    label: '等待容量',
    unit: '辆',
    getValue: (s) => s.metrics.waitCapacity,
    lowerIsBetter: false,
  },
  {
    key: 'riskScore',
    label: '风险评分',
    unit: '分',
    getValue: (s) => s.metrics.riskScore,
    lowerIsBetter: true,
  },
  {
    key: 'maxQueueLength',
    label: '预估最大排队',
    unit: '辆',
    getValue: (s) => s.metrics.maxQueueLength,
    lowerIsBetter: true,
  },
  {
    key: 'agvLength',
    label: 'AGV长',
    unit: 'm',
    getValue: (s) => s.agvParams.lengthMeters,
    lowerIsBetter: true,
  },
  {
    key: 'agvWidth',
    label: 'AGV宽',
    unit: 'm',
    getValue: (s) => s.agvParams.widthMeters,
    lowerIsBetter: true,
  },
  {
    key: 'mainCorridorWidth',
    label: '主通道宽',
    unit: 'm',
    getValue: (s) => s.corridorParams.mainCorridorWidth,
    lowerIsBetter: false,
  },
];

/**
 * 方案对比弹窗
 * - 左右两列下拉选择方案
 * - 对比指标表格，差异列用颜色标示优劣
 */
export default function CompareModal() {
  const schemes = useLayoutStore((s) => s.schemes);
  const comparisonIds = useLayoutStore((s) => s.comparisonIds);
  const showComparison = useLayoutStore((s) => s.showComparison);
  const toggleComparison = useLayoutStore((s) => s.toggleComparison);
  const setComparisonIds = useLayoutStore((s) => s.setComparisonIds);

  // 初始化默认选中前两个方案
  useEffect(() => {
    if (showComparison && !comparisonIds && schemes.length >= 2) {
      setComparisonIds([schemes[0].id, schemes[1].id]);
    }
  }, [showComparison, comparisonIds, schemes, setComparisonIds]);

  const schemeA = comparisonIds ? schemes.find((s) => s.id === comparisonIds[0]) : undefined;
  const schemeB = comparisonIds ? schemes.find((s) => s.id === comparisonIds[1]) : undefined;

  const handleSelectA = (id: string) => {
    const bId = comparisonIds?.[1] ?? schemes.find((s) => s.id !== id)?.id;
    if (bId) {
      setComparisonIds([id, bId]);
    }
  };

  const handleSelectB = (id: string) => {
    const aId = comparisonIds?.[0] ?? schemes.find((s) => s.id !== id)?.id;
    if (aId) {
      setComparisonIds([aId, id]);
    }
  };

  /** 计算差异并判断优劣 */
  const getDiffInfo = (metric: CompareMetric) => {
    if (!schemeA || !schemeB) return { diff: 0, isBetterA: null, isBetterB: null };

    const valA = metric.getValue(schemeA);
    const valB = metric.getValue(schemeB);
    const diff = valB - valA;

    if (diff === 0) {
      return { diff: 0, isBetterA: false, isBetterB: false };
    }

    if (metric.lowerIsBetter) {
      // 越小越好
      return {
        diff,
        isBetterA: valA < valB,
        isBetterB: valB < valA,
      };
    } else {
      // 越大越好
      return {
        diff,
        isBetterA: valA > valB,
        isBetterB: valB > valA,
      };
    }
  };

  /** 格式化数值 */
  const formatValue = (value: number) => {
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(2);
  };

  return (
    <ModalBase
      open={showComparison}
      onClose={toggleComparison}
      title="方案对比"
      width={900}
    >
      {schemes.length < 2 ? (
        <div className="py-12 text-center text-slate-400">
          请先保存至少 2 个方案再进行对比
        </div>
      ) : (
        <>
          {/* 方案选择区 */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-400">方案 A</label>
              <select
                value={comparisonIds?.[0] ?? ''}
                onChange={(e) => handleSelectA(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="" disabled>
                  请选择方案
                </option>
                {schemes.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === comparisonIds?.[1]}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">方案 B</label>
              <select
                value={comparisonIds?.[1] ?? ''}
                onChange={(e) => handleSelectB(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="" disabled>
                  请选择方案
                </option>
                {schemes.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === comparisonIds?.[0]}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 对比表格 */}
          <div className="overflow-hidden rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="w-[160px] px-4 py-3 text-left font-medium text-slate-300">
                    指标
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-blue-400">
                    {schemeA?.name || '方案 A'}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-purple-400">
                    {schemeB?.name || '方案 B'}
                  </th>
                  <th className="w-[140px] px-4 py-3 text-center font-medium text-slate-300">
                    差异 (B-A)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {COMPARE_METRICS.map((metric) => {
                  const valA = schemeA ? metric.getValue(schemeA) : 0;
                  const valB = schemeB ? metric.getValue(schemeB) : 0;
                  const { diff, isBetterA, isBetterB } = getDiffInfo(metric);

                  return (
                    <tr key={metric.key} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-300">
                        {metric.label}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-medium tabular-nums',
                          isBetterA && 'text-green-400',
                          isBetterB && 'text-slate-400',
                        )}
                      >
                        {formatValue(valA)}
                        <span className="ml-1 text-xs text-slate-500">{metric.unit}</span>
                        {isBetterA && (
                          <ArrowDown className="ml-1 inline h-3 w-3 text-green-400" />
                        )}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-medium tabular-nums',
                          isBetterB && 'text-green-400',
                          isBetterA && 'text-slate-400',
                        )}
                      >
                        {formatValue(valB)}
                        <span className="ml-1 text-xs text-slate-500">{metric.unit}</span>
                        {isBetterB && (
                          <ArrowDown className="ml-1 inline h-3 w-3 text-green-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {diff === 0 ? (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Minus className="h-3 w-3" />
                            持平
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
                              diff > 0
                                ? isBetterB
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                                : isBetterA
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400',
                            )}
                          >
                            {diff > 0 ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            {Math.abs(diff).toFixed(2)} {metric.unit}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 图例说明 */}
          <div className="mt-4 flex items-center justify-end gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-green-500/30" />
              <span>较优</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-red-500/30" />
              <span>较差</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowDown className="h-3 w-3" />
              <span>该指标越小越好</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <span>该指标越大越好</span>
            </div>
          </div>
        </>
      )}
    </ModalBase>
  );
}
