import { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  Package,
  AlertCircle,
  Expand,
  FileText,
} from 'lucide-react';
import { Modal } from './Modal';
import { useSceneStore } from '@/store/useSceneStore';
import { cn } from '@/lib/utils';
import type { RectificationItem } from '@/types/scene';
import { formatDistance } from '@/utils/units';

interface ExportReportProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportReport({ isOpen, onClose }: ExportReportProps) {
  const { generateRectificationReport, exportReportText, getPathStats, displaySettings } =
    useSceneStore();
  const [copied, setCopied] = useState(false);
  const items = generateRectificationReport();
  const stats = getPathStats();
  const unit = displaySettings.unit;

  const handleCopy = async () => {
    const text = exportReportText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = exportReportText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `整改清单_${new Date().toLocaleDateString('zh-CN')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getItemIcon = (type: RectificationItem['type']) => {
    switch (type) {
      case 'move_shelf':
        return Package;
      case 'add_warning_line':
        return AlertTriangle;
      case 'adjust_path':
        return ArrowRight;
      case 'widen_aisle':
        return Expand;
      default:
        return AlertCircle;
    }
  };

  const getTypeLabel = (type: RectificationItem['type']) => {
    const labels: Record<RectificationItem['type'], string> = {
      move_shelf: '移货架',
      add_warning_line: '加警示线',
      adjust_path: '调路径',
      remove_obstacle: '清障碍',
      widen_aisle: '扩通道',
    };
    return labels[type];
  };

  const priorityColors = {
    high: {
      bg: 'bg-red-500/10 border-red-500/30',
      text: 'text-red-400',
      label: '高优先级',
    },
    medium: {
      bg: 'bg-yellow-500/10 border-yellow-500/30',
      text: 'text-yellow-400',
      label: '中优先级',
    },
    low: {
      bg: 'bg-blue-500/10 border-blue-500/30',
      text: 'text-blue-400',
      label: '低优先级',
    },
  };

  const highCount = items.filter((i) => i.priority === 'high').length;
  const mediumCount = items.filter((i) => i.priority === 'medium').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="整改清单" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <p className="text-xs text-slate-400">路径总长</p>
            <p className="text-lg font-bold text-slate-200 font-mono">
              {formatDistance(stats.totalLength, unit, 1)}
            </p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/30">
            <p className="text-xs text-red-400">高优先级</p>
            <p className="text-lg font-bold text-red-400 font-mono">{highCount} 项</p>
          </div>
          <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
            <p className="text-xs text-yellow-400">中优先级</p>
            <p className="text-lg font-bold text-yellow-400 font-mono">{mediumCount} 项</p>
          </div>
        </div>

        <div className="border-t border-slate-700/50 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-200">整改项明细</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '已复制' : '复制'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                下载
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-10 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
              <FileText className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
              <p className="text-sm text-emerald-400 font-medium">无需整改</p>
              <p className="text-xs text-slate-500 mt-1">当前方案安全达标</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {items.map((item, idx) => {
                const Icon = getItemIcon(item.type);
                const priority = priorityColors[item.priority];

                return (
                  <div
                    key={idx}
                    className={cn(
                      'p-3 rounded-xl border transition-all',
                      priority.bg,
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          item.priority === 'high' && 'bg-red-500/20',
                          item.priority === 'medium' && 'bg-yellow-500/20',
                          item.priority === 'low' && 'bg-blue-500/20',
                        )}
                      >
                        <Icon className={cn('w-4 h-4', priority.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200">
                            {idx + 1}. {getTypeLabel(item.type)}
                          </span>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 text-xs rounded',
                              item.priority === 'high' && 'bg-red-500/20 text-red-400',
                              item.priority === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                              item.priority === 'low' && 'bg-blue-500/20 text-blue-400',
                            )}
                          >
                            {priority.label}
                          </span>
                        </div>
                        <p className={cn('text-xs mt-0.5', priority.text)}>
                          位置: {item.location}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-2 text-xs text-slate-500">
          <p>
            说明：本清单由系统自动生成，供仓储经理参考。实际整改请结合现场情况由专业人员评估。
          </p>
        </div>
      </div>
    </Modal>
  );
}
