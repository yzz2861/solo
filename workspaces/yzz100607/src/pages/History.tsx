import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash2,
  Download,
  RefreshCw,
  Eye,
  FileText,
  Wrench,
  Home,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Search,
} from 'lucide-react';
import { useHistory } from '@/hooks/useHistory';
import type { CalculationRecord, RiskLevel } from '@/types';
import { cn } from '@/lib/utils';

export default function History() {
  const navigate = useNavigate();
  const { records, loadRecord, removeRecord, rework, exportDisclosure } = useHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'all'>('all');

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === 'all' || record.result.riskLevel === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const handleLoad = (id: string) => {
    loadRecord(id);
    navigate('/');
  };

  const handleRework = (id: string) => {
    rework(id);
    navigate('/');
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      removeRecord(id);
    }
  };

  const handleViewContractor = (id: string) => {
    loadRecord(id);
    navigate('/report/contractor');
  };

  const handleViewOwner = (id: string) => {
    loadRecord(id);
    navigate('/report/owner');
  };

  const handleExport = (id: string) => {
    exportDisclosure(id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-800 mb-2">历史记录</h2>
        <p className="text-zinc-500">查看和管理历次计算记录，支持返工重新计算</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索项目名称或记录编号..."
            className="w-full h-10 pl-10 pr-3 text-sm border-2 border-zinc-300 focus:outline-none focus:border-blue-700 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'safe', 'warning', 'danger'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilterRisk(level)}
              className={cn(
                'px-3 py-1.5 text-sm border-2 transition-colors',
                filterRisk === level
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
              )}
            >
              {level === 'all' ? '全部' : level === 'safe' ? '安全' : level === 'warning' ? '临界' : '危险'}
            </button>
          ))}
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-zinc-300">
          <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-500 mb-2">暂无记录</p>
          <p className="text-sm text-zinc-400">在计算页面保存记录后会显示在这里</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onLoad={() => handleLoad(record.id)}
              onRework={() => handleRework(record.id)}
              onDelete={() => handleDelete(record.id)}
              onViewContractor={() => handleViewContractor(record.id)}
              onViewOwner={() => handleViewOwner(record.id)}
              onExport={() => handleExport(record.id)}
            />
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-zinc-50 border border-zinc-200 text-sm text-zinc-500">
        <p>提示：</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>点击「返工重算」可基于原有记录创建新的计算方案</li>
          <li>「导出交底单」可生成包含雨强和口径参数的技术交底单</li>
          <li>记录保存在浏览器本地，清除浏览器数据会丢失记录</li>
          <li>最多保存 50 条记录</li>
        </ul>
      </div>
    </div>
  );
}

interface RecordCardProps {
  record: CalculationRecord;
  onLoad: () => void;
  onRework: () => void;
  onDelete: () => void;
  onViewContractor: () => void;
  onViewOwner: () => void;
  onExport: () => void;
}

function RecordCard({
  record,
  onLoad,
  onRework,
  onDelete,
  onViewContractor,
  onViewOwner,
  onExport,
}: RecordCardProps) {
  const [expanded, setExpanded] = useState(false);

  const riskConfig = {
    safe: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: '安全' },
    warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: '临界' },
    danger: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: '危险' },
  };

  const slopeConfig = {
    excellent: { label: '优秀', color: 'text-emerald-600' },
    good: { label: '良好', color: 'text-blue-600' },
    poor: { label: '不足', color: 'text-amber-600' },
    zero: { label: '为零', color: 'text-red-600' },
  };

  const risk = riskConfig[record.result.riskLevel];
  const slope = slopeConfig[record.result.slopeStatus];
  const RiskIcon = risk.icon;

  const date = new Date(record.createdAt);
  const dateStr = date.toLocaleDateString('zh-CN');
  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={cn('border-2', risk.border, 'bg-white hover:shadow-md transition-shadow')}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn('p-2', risk.bg)}>
              <RiskIcon className={cn('w-6 h-6', risk.color)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-zinc-800">
                  {record.projectName || '未命名项目'}
                </h3>
                <span className={cn('text-xs px-2 py-0.5', risk.bg, risk.color)}>
                  {risk.label}
                </span>
                {record.parentId && (
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-600">
                    返工方案
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                编号：{record.id} · {dateStr} {timeStr}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span className="text-zinc-600">
                  尺寸：{record.length}{record.lengthUnit} × {record.width}{record.widthUnit}
                </span>
                <span className="text-zinc-600">
                  坡度：<span className={slope.color}>{record.slope}‰ ({slope.label})</span>
                </span>
                <span className="text-zinc-600">
                  雨强：{record.rainfallIntensity}{record.rainfallUnit}
                </span>
                <span className="text-zinc-600">
                  排水：{record.drainCount}个×{record.drainDiameter}mm
                </span>
                <span className="text-zinc-600">
                  积水系数：<span className={risk.color}>{record.result.积水系数.toFixed(2)}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              title="展开详情"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-zinc-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-zinc-50">
                <div className="text-xs text-zinc-500">汇水面积</div>
                <div className="font-semibold">{record.result.areaM2.toFixed(2)} m²</div>
              </div>
              <div className="p-3 bg-zinc-50">
                <div className="text-xs text-zinc-500">雨水量</div>
                <div className="font-semibold">{record.result.rainwaterVolume.toFixed(2)} L/s</div>
              </div>
              <div className="p-3 bg-zinc-50">
                <div className="text-xs text-zinc-500">排水能力</div>
                <div className="font-semibold">{record.result.drainCapacity.toFixed(2)} L/s</div>
              </div>
              <div className="p-3 bg-zinc-50">
                <div className="text-xs text-zinc-500">排水裕量</div>
                <div className="font-semibold">
                  {((record.result.drainCapacity / record.result.rainwaterVolume) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            {record.result.warnings.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200">
                <div className="text-xs font-semibold text-amber-700 mb-2">提示信息：</div>
                <ul className="text-xs text-amber-700 space-y-1">
                  {record.result.warnings.map((w, i) => (
                    <li key={i}>• {w.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={onLoad}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border-2 border-blue-700 text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            加载参数
          </button>
          <button
            onClick={onViewContractor}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border-2 border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Wrench className="w-3.5 h-3.5" />
            施工队报告
          </button>
          <button
            onClick={onViewOwner}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border-2 border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            业主报告
          </button>
          <button
            onClick={onRework}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            返工重算
          </button>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border-2 border-amber-500 text-amber-600 hover:bg-amber-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            导出交底单
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border-2 border-red-300 text-red-600 hover:bg-red-50 transition-colors ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
