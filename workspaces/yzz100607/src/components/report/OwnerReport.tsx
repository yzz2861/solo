import { CheckCircle, AlertTriangle, AlertCircle, FileText } from 'lucide-react';
import type { OwnerReportData } from '@/types';
import { cn } from '@/lib/utils';

interface OwnerReportProps {
  data: OwnerReportData;
  className?: string;
}

export function OwnerReport({ data, className }: OwnerReportProps) {
  const config = {
    safe: {
      icon: CheckCircle,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      titleColor: 'text-emerald-700',
      accentBg: 'bg-emerald-700',
      borderColor: 'border-emerald-200',
      statusText: '排水系统运行正常',
      statusDetail: '在设计降雨条件下无积水风险',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-700',
      accentBg: 'bg-amber-600',
      borderColor: 'border-amber-200',
      statusText: '排水系统存在一定风险',
      statusDetail: '建议施工单位采取优化措施',
    },
    danger: {
      icon: AlertCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-700',
      accentBg: 'bg-red-600',
      borderColor: 'border-red-200',
      statusText: '排水系统存在积水风险',
      statusDetail: '施工单位必须进行整改',
    },
  };

  const cfg = config[data.riskLevel];
  const Icon = cfg.icon;

  return (
    <div className={cn('max-w-2xl mx-auto', className)}>
      <div className={cn('p-8 text-white', cfg.accentBg)}>
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8" />
          <h2 className="text-2xl font-bold">雨棚排水评估报告</h2>
        </div>
        <p className="text-sm opacity-80">业主版 · 积水风险评估</p>
      </div>

      <div className={cn('border-2', cfg.borderColor, 'border-t-0')}>
        <div className="p-8 text-center">
          <div className={cn('inline-flex p-6 rounded-full mb-6', cfg.iconBg)}>
            <Icon className={cn('w-16 h-16', cfg.iconColor)} />
          </div>
          <h1 className={cn('text-3xl font-bold mb-3', cfg.titleColor)}>
            {data.summary}
          </h1>
          <p className="text-lg text-zinc-600 mb-2">{cfg.statusText}</p>
          <p className="text-zinc-500">{cfg.statusDetail}</p>
        </div>

        <div className="px-8 pb-8">
          <div className="bg-zinc-50 border border-zinc-200 p-6">
            <h3 className="text-sm font-semibold text-zinc-800 mb-4">评估说明</h3>
            <p className="text-sm text-zinc-600 leading-relaxed mb-4">
              {data.riskDescription}
            </p>
            <div className="text-sm text-zinc-600 space-y-2">
              <p>评估依据：</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-500">
                <li>设计暴雨强度</li>
                <li>雨棚汇水面积</li>
                <li>排水坡度</li>
                <li>排水口数量及口径</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-200 px-8 py-4 bg-zinc-50">
          <div className="flex justify-between text-sm text-zinc-500">
            <div>
              <span className="text-zinc-400">报告编号：</span>
              <span className="font-mono">{data.recordId}</span>
            </div>
            <div>
              <span className="text-zinc-400">生成时间：</span>
              <span>{data.timestamp}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-200 px-8 py-6">
          <div className="text-xs text-zinc-400 text-center">
            <p>本报告由雨棚排水坡度核算系统自动生成</p>
            <p className="mt-1">如有疑问请咨询施工单位或技术人员</p>
          </div>
        </div>
      </div>
    </div>
  );
}
