import { useState, useMemo } from 'react';
import { Printer, FileText, MapPin, Gauge, ClipboardCheck, AlertTriangle } from 'lucide-react';
import ModalBase from './ModalBase';
import { useLayoutStore } from '@/store/useLayoutStore';
import { cn } from '@/lib/utils';
import { buildReportHtml } from '@/utils/export';
import type { BaseEntity, FireDoorEntity } from '@/types';

type TabKey = 'position' | 'capacity' | 'review';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'position', label: '调整位置', icon: <MapPin className="h-4 w-4" /> },
  { key: 'capacity', label: '预计容量', icon: <Gauge className="h-4 w-4" /> },
  { key: 'review', label: '复核点', icon: <ClipboardCheck className="h-4 w-4" /> },
];

interface ReviewItem {
  id: string;
  category: string;
  content: string;
  checked: boolean;
}

/**
 * 厂务报告导出弹窗
 * - 三个标签页：调整位置 / 预计容量 / 复核点
 * - 支持打印厂务图和导出 HTML 报告
 */
export default function ExportReportModal() {
  const entities = useLayoutStore((s) => s.entities);
  const agvParams = useLayoutStore((s) => s.agvParams);
  const corridorParams = useLayoutStore((s) => s.corridorParams);
  const sim = useLayoutStore((s) => s.sim);
  const activeSchemeId = useLayoutStore((s) => s.activeSchemeId);
  const schemes = useLayoutStore((s) => s.schemes);
  const showExport = useLayoutStore((s) => s.showExport);
  const toggleExport = useLayoutStore((s) => s.toggleExport);

  const [activeTab, setActiveTab] = useState<TabKey>('position');
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(() => getDefaultReviewItems());

  // 获取当前激活的方案
  const activeScheme = useMemo(
    () => schemes.find((s) => s.id === activeSchemeId) || null,
    [schemes, activeSchemeId],
  );

  // 生成实体调整建议
  const entityAdjustments = useMemo(() => {
    return entities.map((entity) => {
      const suggestion = generateAdjustmentSuggestion(entity, sim.overflowWarnings);
      return {
        entity,
        suggestion,
      };
    });
  }, [entities, sim.overflowWarnings]);

  // 计算容量指标
  const capacityMetrics = useMemo(() => {
    const chargerCount = entities.filter((e) => e.type === 'charger').length;
    const waitCapacity = entities
      .filter((e) => e.type === 'waitZone')
      .reduce((sum, e) => sum + ((e as { capacity?: number }).capacity ?? 0), 0);

    // 充电周转率：每小时可充电车辆数 = 充电桩数 * (60 / 充电分钟数)
    const turnoverRate = chargerCount > 0
      ? (chargerCount * 60) / agvParams.chargeMinutes
      : 0;

    return {
      chargerCount,
      waitCapacity,
      peakVehicles: agvParams.peakCount,
      offPeakVehicles: agvParams.offPeakCount,
      turnoverRate: Number(turnoverRate.toFixed(1)),
    };
  }, [entities, agvParams]);

  // 切换复核点勾选状态
  const toggleReviewItem = (id: string) => {
    setReviewItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  // 打印厂务图
  const handlePrint = () => {
    window.print();
  };

  // 导出报告 HTML
  const handleExportHtml = () => {
    if (!activeScheme) {
      alert('请先保存一个方案后再导出报告');
      return;
    }

    const html = buildReportHtml(activeScheme, sim.overflowWarnings);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `厂务报告_${activeScheme.name}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 按类别分组复核点
  const groupedReviewItems = useMemo(() => {
    const groups: Record<string, ReviewItem[]> = {};
    for (const item of reviewItems) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return groups;
  }, [reviewItems]);

  const reviewProgress = useMemo(() => {
    const checked = reviewItems.filter((i) => i.checked).length;
    return { checked, total: reviewItems.length };
  }, [reviewItems]);

  return (
    <ModalBase
      open={showExport}
      onClose={toggleExport}
      title="厂务报告导出"
      width={800}
      className="max-h-[90vh]"
    >
      {/* 标签页 */}
      <div className="mb-4 flex gap-1 border-b border-slate-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.key
                ? 'text-blue-400 border-blue-400'
                : 'text-slate-400 border-transparent hover:text-slate-200',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.key === 'review' && (
              <span className="ml-1 text-xs text-slate-500">
                ({reviewProgress.checked}/{reviewProgress.total})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 标签页内容 */}
      <div className="flex-1 overflow-y-auto">
        {/* 调整位置 */}
        {activeTab === 'position' && (
          <div className="space-y-3">
            {entityAdjustments.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                暂无实体，请先在场景中添加实体
              </div>
            ) : (
              entityAdjustments.map(({ entity, suggestion }) => (
                <div
                  key={entity.id}
                  className={cn(
                    'rounded-lg border p-4 transition-colors',
                    suggestion
                      ? 'border-amber-500/30 bg-amber-500/10'
                      : 'border-slate-700 bg-slate-700/30',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-100">{entity.name}</span>
                        <span className="rounded bg-slate-600 px-2 py-0.5 text-xs text-slate-300">
                          {getEntityTypeLabel(entity.type)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        坐标: ({entity.position.x.toFixed(1)}, {entity.position.z.toFixed(1)}) m
                      </div>
                    </div>
                    {suggestion && (
                      <div className="flex items-start gap-1">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                      </div>
                    )}
                  </div>
                  {suggestion && (
                    <div className="mt-2 rounded-md bg-amber-500/20 px-3 py-2 text-sm text-amber-300">
                      <span className="font-medium">建议调整：</span>
                      {suggestion}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 预计容量 */}
        {activeTab === 'capacity' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                label="充电桩数"
                value={capacityMetrics.chargerCount}
                unit="个"
                color="blue"
              />
              <MetricCard
                label="等待区容量"
                value={capacityMetrics.waitCapacity}
                unit="辆"
                color="green"
              />
              <MetricCard
                label="高峰支持车辆"
                value={capacityMetrics.peakVehicles}
                unit="辆"
                color="red"
              />
              <MetricCard
                label="低峰支持车辆"
                value={capacityMetrics.offPeakVehicles}
                unit="辆"
                color="cyan"
              />
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-700/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-400">充电周转率</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-100">
                    {capacityMetrics.turnoverRate}
                    <span className="ml-1 text-sm font-normal text-slate-400">辆 / 小时</span>
                  </div>
                </div>
                <div className="text-right text-sm text-slate-500">
                  基于 {agvParams.chargeMinutes} 分钟充满计算
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-600">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                  style={{
                    width: `${Math.min(100, (capacityMetrics.turnoverRate / 30) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* AGV 和通道参数摘要 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-700 bg-slate-700/30 p-4">
                <h4 className="mb-3 font-medium text-slate-200">AGV 参数</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">车体长度</span>
                    <span className="text-slate-200">{agvParams.lengthMeters} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">车体宽度</span>
                    <span className="text-slate-200">{agvParams.widthMeters} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">转弯半径</span>
                    <span className="text-slate-200">{agvParams.turningRadius} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">充电时间</span>
                    <span className="text-slate-200">{agvParams.chargeMinutes} min</span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-700/30 p-4">
                <h4 className="mb-3 font-medium text-slate-200">通道参数</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">主通道宽度</span>
                    <span className="text-slate-200">{corridorParams.mainCorridorWidth} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">叉车通道</span>
                    <span className="text-slate-200">{corridorParams.forkliftWidth} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">消防净空</span>
                    <span className="text-slate-200">{corridorParams.fireClearance} m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 复核点 */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            {Object.entries(groupedReviewItems).map(([category, items]) => (
              <div key={category}>
                <h4 className="mb-3 font-medium text-slate-200">{category}</h4>
                <div className="space-y-2">
                  {items.map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                        item.checked
                          ? 'border-green-500/30 bg-green-500/10'
                          : 'border-slate-700 bg-slate-700/30 hover:border-slate-600',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleReviewItem(item.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-500 focus:ring-blue-500"
                      />
                      <span
                        className={cn(
                          'text-sm',
                          item.checked ? 'text-slate-400 line-through' : 'text-slate-200',
                        )}
                      >
                        {item.content}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* 复核进度 */}
            <div className="rounded-lg border border-slate-700 bg-slate-700/30 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">复核进度</span>
                <span className="text-slate-200">
                  {reviewProgress.checked} / {reviewProgress.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-600">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                  style={{
                    width: `${(reviewProgress.checked / reviewProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-700 pt-4">
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 font-medium text-slate-200 transition-colors hover:bg-slate-700"
        >
          <Printer className="h-4 w-4" />
          打印厂务图
        </button>
        <button
          type="button"
          onClick={handleExportHtml}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
        >
          <FileText className="h-4 w-4" />
          导出报告 HTML
        </button>
      </div>
    </ModalBase>
  );
}

// ---------------------------------------------------------------------------
// 辅助组件 & 函数
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: 'blue' | 'green' | 'red' | 'cyan';
}) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-400',
    red: 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400',
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-gradient-to-br p-4',
        colorClasses[color],
      )}
    >
      <div className="text-sm opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-semibold">
        {value}
        <span className="ml-1 text-sm font-normal opacity-70">{unit}</span>
      </div>
    </div>
  );
}

function getEntityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    charger: '充电桩',
    waitZone: '等待区',
    pedestrian: '行人通道',
    fireDoor: '消防门',
    agvPath: 'AGV路径',
    forbidden: '禁区',
  };
  return labels[type] || type;
}

/** 生成实体调整建议 */
function generateAdjustmentSuggestion(
  entity: BaseEntity,
  warnings: Array<{ entityId: string; entityName: string; message: string; position?: { x: number; z: number } }>,
): string | null {
  // 检查是否有相关警告
  const relatedWarnings = warnings.filter((w) => w.entityId === entity.id);
  if (relatedWarnings.length > 0) {
    return relatedWarnings[0].message;
  }

  // 消防门旁是否有排队/等待区
  if (entity.type === 'fireDoor') {
    const door = entity as unknown as FireDoorEntity;
    // 检查附近是否有等待区
    const nearbyWaitZones = (window as unknown as { __entities?: BaseEntity[] }).__entities?.filter(
      (e) => {
        if (e.type !== 'waitZone') return false;
        const dx = e.position.x - door.position.x;
        const dz = e.position.z - door.position.z;
        return Math.hypot(dx, dz) < (door.clearanceRadius ?? 2) + 2;
      },
    ) ?? [];

    if (nearbyWaitZones.length > 0) {
      // 简单判断方向，建议向西侧（x 减小方向）移动
      const westDistance = Math.abs(entity.position.x + 10);
      const eastDistance = Math.abs(10 - entity.position.x);
      const direction = westDistance < eastDistance ? '西侧' : '东侧';
      return `消防门旁有等待区排队风险，建议向${direction}移动2米`;
    }
  }

  return null;
}

/** 默认复核点列表 */
function getDefaultReviewItems(): ReviewItem[] {
  return [
    // EHS 相关
    { id: 'ehs-1', category: 'EHS 安全', content: '消防净空区域无任何障碍物遮挡', checked: false },
    { id: 'ehs-2', category: 'EHS 安全', content: '所有消防门保持畅通，净空半径符合规范', checked: false },
    { id: 'ehs-3', category: 'EHS 安全', content: '紧急疏散通道宽度满足要求（≥1.5m）', checked: false },
    { id: 'ehs-4', category: 'EHS 安全', content: 'AGV 路径与行人通道有物理隔离或明显标识', checked: false },
    { id: 'ehs-5', category: 'EHS 安全', content: '充电区域配备灭火装置及应急断电开关', checked: false },

    // 厂务相关
    { id: 'fac-1', category: '厂务设施', content: '主通道宽度满足双向通行要求（≥3m）', checked: false },
    { id: 'fac-2', category: '厂务设施', content: '转弯半径满足 AGV 车型要求（≥1.0m）', checked: false },
    { id: 'fac-3', category: '厂务设施', content: '地面承载能力满足 AGV 及货物重量要求', checked: false },
    { id: 'fac-4', category: '厂务设施', content: '充电桩电源容量及布线符合电气规范', checked: false },
    { id: 'fac-5', category: '厂务设施', content: '通风、照明等辅助设施配置到位', checked: false },

    // 风险评估
    { id: 'risk-1', category: '风险评估', content: '排队溢出风险已评估并制定应急预案', checked: false },
    { id: 'risk-2', category: '风险评估', content: 'AGV 与叉车交叉作业区域有安全措施', checked: false },
    { id: 'risk-3', category: '风险评估', content: '高峰期最大排队长度在可接受范围内', checked: false },
    { id: 'risk-4', category: '风险评估', content: '低峰期设备利用率合理，无资源浪费', checked: false },
  ];
}
