import { useCalculatorStore } from '@/store';
import { ORIENTATION_OPTIONS, USAGE_TYPE_OPTIONS, SAFETY_FACTOR_MIN, SAFETY_FACTOR_MAX } from '@/utils/constants';
import { formatWatt } from '@/utils/unitConverter';
import { FileText, Settings, Info, Shield } from 'lucide-react';

export default function ReportView() {
  const { reportView, setReportView, result, params } = useCalculatorStore();

  const orientationLabel =
    ORIENTATION_OPTIONS.find((o) => o.value === params.orientation)?.label || '';
  const usageTypeLabel =
    USAGE_TYPE_OPTIONS.find((o) => o.value === params.usageType)?.label || '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <FileText size={20} className="text-ice-500" />
          分析报告
        </h3>
        <div className="inline-flex bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setReportView('admin')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              reportView === 'admin'
                ? 'bg-white text-ice-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            行政版
          </button>
          <button
            onClick={() => setReportView('engineer')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              reportView === 'engineer'
                ? 'bg-white text-ice-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            工程师版
          </button>
        </div>
      </div>

      <div className="animate-fade-in">
        {reportView === 'admin' ? (
          <AdminReport />
        ) : (
          <EngineerReport
            orientationLabel={orientationLabel}
            usageTypeLabel={usageTypeLabel}
          />
        )}
      </div>
    </div>
  );
}

function AdminReport() {
  const { result, params } = useCalculatorStore();

  const reasons = [];
  if (result.buildingLoad > result.humanLoad && result.buildingLoad > result.equipmentLoad) {
    reasons.push(
      `房间围护结构负荷较大，${params.orientation === 'south' || params.orientation === 'west' ? '南向/西向日晒明显' : '墙体和窗户传热较多'}，建议选择偏大容量`
    );
  }
  if (params.peopleCount > 0) {
    const areaPerPerson = params.area / params.peopleCount;
    if (areaPerPerson < 5) {
      reasons.push('人员密度较高，人员散热量大，需确保制冷量充足');
    }
  }
  if (params.computerCount > 0) {
    reasons.push('设备散热不可忽视，电脑等电子设备会持续产生热量');
  }
  if (params.usageHours > 10) {
    reasons.push('使用时间较长，建议选择可靠性较好的机型');
  }
  if (reasons.length === 0) {
    reasons.push('各项参数均衡，选择适中容量即可满足需求');
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-ice-50/50 rounded-xl border border-ice-100">
        <h4 className="font-medium text-ice-700 mb-2 flex items-center gap-2">
          <Info size={18} />
          为什么选这个匹数？
        </h4>
        <ul className="space-y-2 text-sm text-slate-600">
          {reasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-ice-400 flex-shrink-0" />
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
        <h4 className="font-medium text-amber-700 mb-2 flex items-center gap-2">
          <Shield size={18} />
          选购建议
        </h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            优先选择能效等级高的机型，长期使用更省电
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            顶层或西晒房间建议选偏大的匹数
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            人数经常变动的会议室，可按最大人数估算
          </li>
        </ul>
      </div>

      <div className="text-xs text-slate-400 text-center pt-2">
        * 以上为初步估算，实际选型请结合现场情况咨询专业人员
      </div>
    </div>
  );
}

function EngineerReport({
  orientationLabel,
  usageTypeLabel,
}: {
  orientationLabel: string;
  usageTypeLabel: string;
}) {
  const { result, params } = useCalculatorStore();

  const paramRows = [
    { label: '房间面积', value: `${params.area} ${params.areaUnit === 'sqm' ? '㎡' : 'sqft'}` },
    { label: '层高', value: params.floorHeight ? `${params.floorHeight} m` : '默认 2.8 m' },
    { label: '朝向', value: `${orientationLabel}向` },
    { label: '窗墙比', value: `${(params.windowWallRatio * 100).toFixed(0)}%` },
    { label: '使用类型', value: usageTypeLabel },
    { label: '人员数量', value: `${params.peopleCount} 人` },
    { label: '电脑数量', value: `${params.computerCount} 台` },
    { label: '日使用时长', value: `${params.usageHours} h` },
  ];

  const breakdownRows = [
    { label: '朝向系数', value: result.breakdown.orientationFactor.toFixed(2) },
    { label: '窗户负荷', value: formatWatt(result.breakdown.windowFactor) },
    { label: '墙体负荷', value: formatWatt(result.breakdown.wallFactor) },
    { label: '屋顶负荷', value: formatWatt(result.breakdown.roofFactor) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
          <Settings size={16} />
          输入参数
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {paramRows.map((row) => (
            <div key={row.label} className="flex justify-between text-sm border-b border-dashed border-slate-200 pb-1">
              <span className="text-slate-500">{row.label}</span>
              <span className="text-slate-700 font-mono">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-600 mb-3">建筑围护分解</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {breakdownRows.map((row) => (
            <div key={row.label} className="flex justify-between text-sm border-b border-dashed border-slate-200 pb-1">
              <span className="text-slate-500">{row.label}</span>
              <span className="text-slate-700 font-mono">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-600 mb-3">负荷明细</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex justify-between text-sm border-b border-dashed border-slate-200 pb-1">
            <span className="text-slate-500">建筑围护负荷</span>
            <span className="text-slate-700 font-mono">{formatWatt(result.buildingLoad)}</span>
          </div>
          <div className="flex justify-between text-sm border-b border-dashed border-slate-200 pb-1">
            <span className="text-slate-500">人员散热负荷</span>
            <span className="text-slate-700 font-mono">{formatWatt(result.humanLoad)}</span>
          </div>
          <div className="flex justify-between text-sm border-b border-dashed border-slate-200 pb-1">
            <span className="text-slate-500">设备散热负荷</span>
            <span className="text-slate-700 font-mono">{formatWatt(result.equipmentLoad)}</span>
          </div>
          <div className="flex justify-between text-sm border-b border-dashed border-slate-200 pb-1">
            <span className="text-slate-500">照明负荷</span>
            <span className="text-slate-700 font-mono">{formatWatt(result.lightingLoad)}</span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-ice-50 rounded-lg">
        <div className="flex justify-between text-sm">
          <span className="text-ice-600 font-medium">保守系数范围</span>
          <span className="text-ice-700 font-mono">
            {SAFETY_FACTOR_MIN} ~ {SAFETY_FACTOR_MAX}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-ice-600 font-medium">推荐容量范围</span>
          <span className="text-ice-700 font-mono">
            {formatWatt(result.recommendedACMin)} ~ {formatWatt(result.recommendedACMax)}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-ice-600 font-medium">推荐匹数</span>
          <span className="text-ice-700 font-medium">{result.recommendedHP}</span>
        </div>
      </div>
    </div>
  );
}
