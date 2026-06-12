import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Thermometer } from 'lucide-react';
import { usePlanStore } from '@/store';
import { formatWatt } from '@/utils/unitConverter';
import { USAGE_TYPE_LABELS, USAGE_TYPE_ICONS } from '@/components/plans/PlanIcons';
import { ORIENTATION_OPTIONS } from '@/utils/constants';

export default function Compare() {
  const { plans, deletePlan } = usePlanStore();

  if (plans.length === 0) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-lg border-b border-slate-200/50">
          <div className="container max-w-5xl h-16 flex items-center gap-4">
            <Link
              to="/"
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-bold text-slate-800">方案对比</h1>
          </div>
        </header>

        <main className="container max-w-5xl py-12">
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              还没有保存的方案
            </h2>
            <p className="text-slate-500 mb-6">
              先在计算器中调整参数并保存方案，再来对比吧
            </p>
            <Link to="/" className="btn-primary inline-flex items-center gap-2">
              去添加方案
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const getOrientationLabel = (val: string) => {
    return ORIENTATION_OPTIONS.find((o) => o.value === val)?.label || val;
  };

  interface ParamRow {
    label: string;
    key: string;
    format: (val: unknown, params?: unknown) => string;
  }

  interface ResultRow {
    label: string;
    key: string;
    format: (val: unknown) => string;
    highlight?: boolean;
  }

  const rows: ParamRow[] = [
    { label: '使用类型', key: 'usageType', format: (v) => USAGE_TYPE_LABELS[(v as string) as keyof typeof USAGE_TYPE_LABELS] || (v as string) },
    { label: '面积', key: 'area', format: (v, p) => `${v as number} ${(p as { areaUnit: string }).areaUnit === 'sqm' ? '㎡' : 'sqft'}` },
    { label: '层高', key: 'floorHeight', format: (v) => (v ? `${v as number} m` : '默认') },
    { label: '朝向', key: 'orientation', format: (v) => `${getOrientationLabel(v as string)}向` },
    { label: '窗墙比', key: 'windowWallRatio', format: (v) => `${((v as number) * 100).toFixed(0)}%` },
    { label: '人数', key: 'peopleCount', format: (v) => `${v as number} 人` },
    { label: '电脑数', key: 'computerCount', format: (v) => `${v as number} 台` },
    { label: '日使用时长', key: 'usageHours', format: (v) => `${v as number} 小时` },
  ];

  const resultRows: ResultRow[] = [
    { label: '建筑围护负荷', key: 'buildingLoad', format: (v) => formatWatt(v as number) },
    { label: '人员散热负荷', key: 'humanLoad', format: (v) => formatWatt(v as number) },
    { label: '设备散热负荷', key: 'equipmentLoad', format: (v) => formatWatt(v as number) },
    { label: '照明负荷', key: 'lightingLoad', format: (v) => formatWatt(v as number) },
    { label: '总冷负荷', key: 'totalCoolingLoad', format: (v) => formatWatt(v as number), highlight: true },
    { label: '推荐匹数', key: 'recommendedHP', format: (v) => v as string, highlight: true },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-lg border-b border-slate-200/50">
        <div className="container max-w-6xl h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-800">方案对比</h1>
              <p className="text-xs text-slate-500">
                共 {plans.length} 个方案
              </p>
            </div>
          </div>
          <Link to="/" className="btn-primary text-sm">
            + 新增方案
          </Link>
        </div>
      </header>

      <main className="container max-w-6xl py-6 lg:py-8">
        <div className="card p-6 overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 w-36">
                  项目
                </th>
                {plans.map((plan) => {
                  const IconComponent = USAGE_TYPE_ICONS[plan.params.usageType];
                  return (
                    <th
                      key={plan.id}
                      className="text-center py-3 px-4 min-w-[160px]"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-ice-100 text-ice-600 flex items-center justify-center">
                          <IconComponent size={20} />
                        </div>
                        <span className="font-semibold text-slate-800">
                          {plan.name}
                        </span>
                        <button
                          onClick={() => deletePlan(plan.id)}
                          className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          删除
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={plans.length + 1}
                  className="py-2 px-4 text-xs font-medium text-slate-400 bg-slate-50/50"
                >
                  基本参数
                </td>
              </tr>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-slate-100">
                  <td className="py-2.5 px-4 text-sm text-slate-600">
                    {row.label}
                  </td>
                  {plans.map((plan) => {
                    const val = (plan.params as any)[row.key];
                    return (
                      <td key={plan.id} className="py-2.5 px-4 text-sm text-center">
                        <span className="font-mono text-slate-700">
                          {row.format(val, plan.params)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}

              <tr>
                <td
                  colSpan={plans.length + 1}
                  className="py-2 px-4 text-xs font-medium text-slate-400 bg-slate-50/50"
                >
                  计算结果
                </td>
              </tr>
              {resultRows.map((row) => (
                <tr
                  key={row.key}
                  className={`border-b border-slate-100 ${
                    row.highlight ? 'bg-ice-50/30' : ''
                  }`}
                >
                  <td
                    className={`py-2.5 px-4 text-sm ${
                      row.highlight ? 'font-medium text-ice-700' : 'text-slate-600'
                    }`}
                  >
                    {row.highlight && <Thermometer size={14} className="inline mr-1 -mt-0.5" />}
                    {row.label}
                  </td>
                  {plans.map((plan) => {
                    const val = (plan.result as any)[row.key];
                    return (
                      <td key={plan.id} className="py-2.5 px-4 text-sm text-center">
                        <span
                          className={`font-mono ${
                            row.highlight
                              ? 'font-semibold text-ice-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {row.format(val)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          * 对比数据仅用于初步参考，实际选型请咨询专业工程师
        </div>
      </main>
    </div>
  );
}
