import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { ContractorReportData, AdjustmentSuggestion } from '@/types';
import { FormulaDisplay } from '@/components/display/FormulaDisplay';
import { cn } from '@/lib/utils';

interface ContractorReportProps {
  data: ContractorReportData;
  className?: string;
}

export function ContractorReport({ data, className }: ContractorReportProps) {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set());

  const toggleSuggestion = (index: number) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSuggestions(newExpanded);
  };

  const priorityConfig = {
    high: {
      label: '高优先级',
      color: 'text-red-700',
      bg: 'bg-red-100',
      border: 'border-red-400',
      icon: AlertTriangle,
    },
    medium: {
      label: '中优先级',
      color: 'text-amber-700',
      bg: 'bg-amber-100',
      border: 'border-amber-400',
      icon: Info,
    },
    low: {
      label: '低优先级',
      color: 'text-emerald-700',
      bg: 'bg-emerald-100',
      border: 'border-emerald-400',
      icon: CheckCircle,
    },
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="bg-blue-900 text-white p-6">
        <h2 className="text-2xl font-bold mb-2">施工队技术报告</h2>
        <p className="text-blue-200 text-sm">雨棚排水坡度核算 · 施工调整方案</p>
      </div>

      <div className="border-2 border-blue-700 p-4 bg-blue-50">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">评估结论</h3>
        <p className="text-zinc-800">{data.summary}</p>
      </div>

      <div>
        <h3 className="text-lg font-bold text-zinc-800 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-700 text-white flex items-center justify-center text-sm">1</span>
          计算过程
        </h3>
        <FormulaDisplay steps={data.calculationSteps} />
      </div>

      <div>
        <h3 className="text-lg font-bold text-zinc-800 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-700 text-white flex items-center justify-center text-sm">2</span>
          调整方案
          <span className="text-sm font-normal text-zinc-500 ml-2">
            共 {data.suggestions.length} 项建议
          </span>
        </h3>
        <div className="space-y-3">
          {data.suggestions.map((suggestion, index) => (
            <SuggestionItem
              key={index}
              suggestion={suggestion}
              index={index}
              isExpanded={expandedSuggestions.has(index)}
              onToggle={() => toggleSuggestion(index)}
              priorityConfig={priorityConfig}
            />
          ))}
        </div>
      </div>

      <div className="border-t-2 border-zinc-300 pt-6">
        <h3 className="text-lg font-bold text-zinc-800 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-700 text-white flex items-center justify-center text-sm">3</span>
          施工要求
        </h3>
        <div className="bg-zinc-50 border border-zinc-200 p-4 space-y-2 text-sm">
          <p className="flex items-start gap-2">
            <span className="text-blue-700 font-bold">•</span>
            严格按照本报告调整方案施工，确保排水坡度、排水口数量和口径符合要求
          </p>
          <p className="flex items-start gap-2">
            <span className="text-blue-700 font-bold">•</span>
            排水口安装完成后必须做通水试验，确保排水通畅
          </p>
          <p className="flex items-start gap-2">
            <span className="text-blue-700 font-bold">•</span>
            施工完成后进行闭水试验，确认无积水
          </p>
          <p className="flex items-start gap-2">
            <span className="text-blue-700 font-bold">•</span>
            本报告作为技术交底依据，施工队签收后生效
          </p>
        </div>
      </div>
    </div>
  );
}

interface SuggestionItemProps {
  suggestion: AdjustmentSuggestion;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  priorityConfig: Record<string, {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

function SuggestionItem({
  suggestion,
  index,
  isExpanded,
  onToggle,
  priorityConfig,
}: SuggestionItemProps) {
  const cfg = priorityConfig[suggestion.priority];
  const Icon = cfg.icon;

  return (
    <div className={cn('border-l-4', cfg.border, 'bg-white')}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 hover:bg-zinc-50 transition-colors text-left"
      >
        <span className="text-zinc-400 font-mono text-sm w-6">
          {index + 1}.
        </span>
        <Icon className={cn('w-5 h-5 flex-shrink-0', cfg.color)} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-800">{suggestion.title}</span>
            <span className={cn('text-xs px-2 py-0.5', cfg.bg, cfg.color)}>
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-zinc-600 mt-1">{suggestion.description}</p>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-zinc-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-zinc-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 ml-11">
          <div className="p-3 bg-zinc-50 border border-zinc-200 text-sm text-zinc-700 whitespace-pre-line">
            {suggestion.details}
          </div>
        </div>
      )}
    </div>
  );
}
