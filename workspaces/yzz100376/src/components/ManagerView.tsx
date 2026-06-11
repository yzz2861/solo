import { useState } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Printer,
  AlertTriangle,
  Calculator,
  Info,
  Droplets,
} from 'lucide-react';
import { useRecipeStore } from '@/store';
import { roundTo, formatWeight } from '@/utils/calculator';

const adjustmentIcons: Record<string, typeof Droplets> = {
  water: Droplets,
  salt: Info,
  sugar: Info,
  fat: Info,
  yeast: Info,
  warning: AlertTriangle,
  info: Info,
};

const adjustmentColors: Record<string, string> = {
  water: 'bg-bakery-water/10 border-bakery-water/30 text-bakery-water',
  salt: 'bg-gray-100 border-gray-300 text-gray-700',
  sugar: 'bg-amber-50 border-amber-200 text-amber-700',
  fat: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  yeast: 'bg-green-50 border-green-200 text-green-700',
  warning: 'bg-bakery-orange/10 border-bakery-orange/30 text-bakery-orange',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
};

export function ManagerView() {
  const result = useRecipeStore((s) => s.result);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    inputs: true,
    calculations: false,
    adjustments: true,
    boundaries: true,
    recipe: true,
  });

  if (!result) {
    return (
      <div className="p-8 text-center text-bakery-brown/50">
        请输入配方数据
      </div>
    );
  }

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const { inputSnapshot } = result;
  const timestamp = new Date(inputSnapshot.timestamp);

  return (
    <div className="h-full flex flex-col">
      <div className="no-print flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-bakery-brown">
          <FileText className="w-5 h-5" />
          <span className="text-sm font-medium">店长留档版 · 含完整计算过程</span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-bakery-brown text-white text-sm rounded-lg hover:bg-bakery-brownLight transition-colors"
        >
          <Printer className="w-4 h-4" />
          打印存档
        </button>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-bakery-brown/20 p-6 print-area overflow-auto">
        <div className="text-center mb-6 pb-4 border-b-2 border-bakery-brown/10">
          <h1 className="font-serif text-2xl font-bold text-bakery-brownDark">
            📋 配方换算留档记录
          </h1>
          <p className="text-sm text-bakery-brown/60 mt-1">
            生成时间：{timestamp.toLocaleString('zh-CN')} · 编号：{timestamp.getTime().toString(36).toUpperCase()}
          </p>
        </div>

        <Section
          title="📝 输入参数快照"
          expanded={expandedSections.inputs}
          onToggle={() => toggleSection('inputs')}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-bold text-sm text-bakery-brown mb-2">基础配方</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-bakery-brown/50 text-xs">
                    <th className="text-left py-1">原料</th>
                    <th className="text-right py-1">用量</th>
                  </tr>
                </thead>
                <tbody>
                  {inputSnapshot.baseRecipe.map((ing) => (
                    <tr key={ing.id} className="border-t border-bakery-cream">
                      <td className="py-1 text-bakery-brownDark">{ing.name}</td>
                      <td className="text-right py-1 font-mono">
                        {ing.value}{ing.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="font-bold text-sm text-bakery-brown mb-2">环境参数</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-bakery-brown/70">目标出品量</span>
                  <span className="font-mono font-medium">{inputSnapshot.envParams.targetYield}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bakery-brown/70">面粉吸水率</span>
                  <span className="font-mono font-medium">{inputSnapshot.envParams.flourAbsorption}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bakery-brown/70">室内湿度</span>
                  <span className="font-mono font-medium">{inputSnapshot.envParams.roomHumidity}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bakery-brown/70">老面比例</span>
                  <span className="font-mono font-medium">{inputSnapshot.envParams.starterRatio}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bakery-brown/70">老面含水量</span>
                  <span className="font-mono font-medium">{inputSnapshot.envParams.starterHydration}%</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="🧮 计算过程"
          expanded={expandedSections.calculations}
          onToggle={() => toggleSection('calculations')}
          icon={<Calculator className="w-4 h-4" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bakery-cream text-bakery-brown">
                  <th className="text-left py-2 px-3 rounded-l-lg">步骤</th>
                  <th className="text-left py-2 px-3">计算公式</th>
                  <th className="text-right py-2 px-3 rounded-r-lg">结果</th>
                </tr>
              </thead>
              <tbody>
                {result.calculationSteps.map((step, i) => {
                  const isStarterStep = step.description.includes('老面') || step.description.includes('种面');
                  return (
                    <tr
                      key={i}
                      className={`border-b transition-colors ${
                        isStarterStep
                          ? 'bg-bakery-water/5 hover:bg-bakery-water/10 border-bakery-water/20'
                          : 'border-bakery-cream/50 hover:bg-bakery-cream/30'
                      }`}
                    >
                      <td className={`py-2 px-3 ${isStarterStep ? 'text-bakery-water font-medium' : 'text-bakery-brownDark'}`}>
                        {step.description}
                      </td>
                      <td className={`py-2 px-3 font-mono text-xs ${isStarterStep ? 'text-bakery-water/70' : 'text-bakery-brown/70'}`}>
                        {step.formula}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono font-bold ${
                        isStarterStep ? 'text-bakery-water' : 'text-bakery-orange'
                      }`}>
                        {step.result}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          title="💡 调整说明"
          expanded={expandedSections.adjustments}
          onToggle={() => toggleSection('adjustments')}
        >
          {result.adjustments.length === 0 ? (
            <p className="text-bakery-brown/50 text-sm">无需特殊调整</p>
          ) : (
            <div className="space-y-2">
              {result.adjustments.map((adj, i) => {
                const IconComp = adjustmentIcons[adj.type] || Info;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-3 rounded-lg border ${adjustmentColors[adj.type] || adjustmentColors.info}`}
                  >
                    <IconComp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{adj.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section
          title="⚠️ 边界警告（不建议放大的范围）"
          expanded={expandedSections.boundaries}
          onToggle={() => toggleSection('boundaries')}
          badge={result.boundaryWarnings.length > 0 ? result.boundaryWarnings.length.toString() : undefined}
        >
          {result.boundaryWarnings.length === 0 ? (
            <div className="flex items-center gap-2 text-bakery-green">
              <span>✅</span>
              <span className="text-sm">当前参数在安全范围内，可正常制作</span>
            </div>
          ) : (
            <ul className="space-y-2">
              {result.boundaryWarnings.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 p-3 bg-bakery-orange/10 border border-bakery-orange/30 rounded-lg text-sm text-bakery-brownDark"
                >
                  <AlertTriangle className="w-4 h-4 text-bakery-orange mt-0.5 flex-shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="🍞 最终换算配方"
          expanded={expandedSections.recipe}
          onToggle={() => toggleSection('recipe')}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              {result.finalRecipe.map((ing, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                    ing.category === 'water'
                      ? 'bg-bakery-waterLight/20 border border-bakery-water/30'
                      : 'bg-bakery-cream/50'
                  }`}
                >
                  <span className={`font-medium ${
                    ing.category === 'water' ? 'text-bakery-water' : 'text-bakery-brownDark'
                  }`}>
                    {ing.name}
                  </span>
                  <span className={`font-mono font-bold ${
                    ing.category === 'water' ? 'text-bakery-water' : 'text-bakery-brownDark'
                  }`}>
                    {formatWeight(ing.value)}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-bakery-cream/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-bakery-brown/70">面团总重</span>
                <span className="font-mono font-bold text-bakery-brownDark">{formatWeight(result.totalWeight)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-bakery-brown/70">总含水量（含老面）</span>
                <span className="font-mono font-bold text-bakery-water">{formatWeight(result.totalWater)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-bakery-brown/70">面团含水率</span>
                <span className="font-mono font-bold text-bakery-brownDark">
                  {roundTo((result.totalWater / result.totalWeight) * 100, 1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-bakery-brown/70">放大倍数</span>
                <span className="font-mono font-bold text-bakery-orange">{result.scaleFactor}×</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-bakery-brown/70">基准面粉量</span>
                <span className="font-mono font-bold text-bakery-brownDark">{formatWeight(result.baseFlourWeight)}</span>
              </div>
            </div>
          </div>
        </Section>

        <div className="mt-6 pt-4 border-t border-bakery-brown/10 flex justify-between items-center text-xs text-bakery-brown/40">
          <span>配方湿度换算工具 v1.0</span>
          <span>店长确认签字：_______________</span>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  expanded,
  onToggle,
  icon,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="mb-4 border border-bakery-cream rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-bakery-cream/50 hover:bg-bakery-cream transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-bakery-brown" />
          ) : (
            <ChevronRight className="w-4 h-4 text-bakery-brown" />
          )}
          {icon}
          <span className="font-bold text-bakery-brownDark">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 bg-bakery-orange text-white text-xs rounded-full">
              {badge}
            </span>
          )}
        </div>
      </button>
      {expanded && (
        <div className="p-4 animate-slide-up">{children}</div>
      )}
    </div>
  );
}
