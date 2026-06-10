import { useState } from 'react';
import {
  Coffee,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Droplets,
  AlertTriangle,
  CheckCircle,
  Package,
} from 'lucide-react';
import Tag from '@/components/common/Tag';
import { CuppingRecord, SCORE_LABELS, ScoreKey } from '@/types';
import { useRecordsStore } from '@/store/useRecordsStore';
import { calculateAverageScore, shouldHoldSale } from '@/utils/validation';
import { cn } from '@/lib/utils';

interface RecordCardProps {
  record: CuppingRecord;
  index: number;
}

const RecordCard: React.FC<RecordCardProps> = ({ record, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { openForm, deleteRecord } = useRecordsStore();

  const avgScore = calculateAverageScore(record.scores);
  const hasDefects = record.defects.length > 0;
  const holdSale = shouldHoldSale(record);

  const getScoreColor = (score: number): string => {
    if (score >= 9) return 'text-emerald-600';
    if (score >= 8) return 'text-green-600';
    if (score >= 7) return 'text-amber-600';
    if (score >= 6) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number): string => {
    if (score >= 9) return 'bg-emerald-100';
    if (score >= 8) return 'bg-green-100';
    if (score >= 7) return 'bg-amber-100';
    if (score >= 6) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const scoreKeys: ScoreKey[] = ['aroma', 'acidity', 'sweetness', 'body', 'balance', 'overall'];

  const handleDelete = () => {
    if (window.confirm(`确定要删除批次 ${record.batch} 的记录吗？`)) {
      deleteRecord(record.id);
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-paper border border-coffee-100 overflow-hidden',
        'transition-all duration-300 hover:shadow-paper-hover hover:-translate-y-0.5',
        'animate-fade-in-up'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                getScoreBg(record.scores.overall)
              )}
            >
              <Coffee className={cn('w-6 h-6', getScoreColor(record.scores.overall))} />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-coffee-900 text-lg">
                {record.origin || '未命名产区'}
              </h3>
              <div className="flex items-center gap-3 text-sm text-coffee-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  {record.batch || '无批次'}
                </span>
                <span>{record.process}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="text-right">
              <span className={cn('text-2xl font-bold font-serif', getScoreColor(record.scores.overall))}>
                {record.scores.overall.toFixed(2)}
              </span>
              <span className="text-xs text-coffee-400 block">整体</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {record.status.isOnSale && (
            <Tag variant="success" size="sm">
              <CheckCircle className="w-3 h-3 mr-1" />
              已上架
            </Tag>
          )}
          {!record.status.isOnSale && (
            <Tag variant="outline" size="sm">
              未上架
            </Tag>
          )}
          {record.status.isRetest && (
            <Tag variant="warning" size="sm">
              <AlertTriangle className="w-3 h-3 mr-1" />
              需复测
            </Tag>
          )}
          {holdSale && !record.status.isRetest && (
            <Tag variant="danger" size="sm">
              <AlertTriangle className="w-3 h-3 mr-1" />
              建议暂缓
            </Tag>
          )}
          {hasDefects && (
            <Tag variant="warning" size="sm">
              {record.defects.length} 个缺陷
            </Tag>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-coffee-500 mb-4">
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {record.cupper || '未知'}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {record.cuppingDate || '未知日期'}
          </span>
          {record.brewParams.grinder && (
            <span className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5" />
              {record.brewParams.grinder}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {scoreKeys.slice(0, 3).map((key) => (
            <div
              key={key}
              className={cn(
                'px-2 py-1.5 rounded-lg text-center',
                getScoreBg(record.scores[key])
              )}
            >
              <div className={cn('font-bold font-serif', getScoreColor(record.scores[key]))}>
                {record.scores[key].toFixed(1)}
              </div>
              <div className="text-xs text-coffee-600">{SCORE_LABELS[key]}</div>
            </div>
          ))}
        </div>

        {record.flavorNotes && (
          <p className="text-sm text-coffee-600 line-clamp-2 mb-4">
            {record.flavorNotes}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-coffee-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-coffee-400">
              平均分 {avgScore.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => openForm(record)}
              className="p-2 text-coffee-500 hover:text-coffee-700 hover:bg-coffee-100 rounded-lg transition-colors"
              title="编辑"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-coffee-500 hover:text-coffee-700 hover:bg-coffee-100 rounded-lg transition-colors"
              title={isExpanded ? '收起' : '展开详情'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-coffee-100 space-y-4 animate-fade-in">
            <div>
              <h4 className="text-sm font-medium text-coffee-800 mb-2">详细评分</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {scoreKeys.map((key) => (
                  <div
                    key={key}
                    className={cn(
                      'px-3 py-2 rounded-lg text-center',
                      getScoreBg(record.scores[key])
                    )}
                  >
                    <div className={cn('font-bold font-serif text-lg', getScoreColor(record.scores[key]))}>
                      {record.scores[key].toFixed(2)}
                    </div>
                    <div className="text-xs text-coffee-600">{SCORE_LABELS[key]}</div>
                  </div>
                ))}
              </div>
            </div>

            {record.aromaNotes && (
              <div>
                <h4 className="text-sm font-medium text-coffee-800 mb-1">香气描述</h4>
                <p className="text-sm text-coffee-600">{record.aromaNotes}</p>
              </div>
            )}

            {record.flavorNotes && (
              <div>
                <h4 className="text-sm font-medium text-coffee-800 mb-1">风味描述</h4>
                <p className="text-sm text-coffee-600">{record.flavorNotes}</p>
              </div>
            )}

            {hasDefects && (
              <div>
                <h4 className="text-sm font-medium text-coffee-800 mb-2">缺陷</h4>
                <div className="flex flex-wrap gap-1.5">
                  {record.defects.map((defect) => (
                    <Tag key={defect} variant="warning" size="sm">
                      {defect}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-coffee-800 mb-2">萃取参数</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-coffee-400">磨豆机：</span>
                  <span className="text-coffee-700">{record.brewParams.grinder || '-'}</span>
                </div>
                <div>
                  <span className="text-coffee-400">研磨度：</span>
                  <span className="text-coffee-700">{record.brewParams.grindSize || '-'}</span>
                </div>
                <div>
                  <span className="text-coffee-400">水温：</span>
                  <span className="text-coffee-700">{record.brewParams.waterTemp || '-'}°C</span>
                </div>
                <div>
                  <span className="text-coffee-400">粉水比：</span>
                  <span className="text-coffee-700">{record.brewParams.ratio || '-'}</span>
                </div>
              </div>
            </div>

            {record.notes && (
              <div>
                <h4 className="text-sm font-medium text-coffee-800 mb-1">备注</h4>
                <p className="text-sm text-coffee-600">{record.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordCard;
