import { AlertTriangle, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValidationWarning } from '@/types';

interface ValidationAlertProps {
  warnings: ValidationWarning[];
  className?: string;
}

const ValidationAlert: React.FC<ValidationAlertProps> = ({ warnings, className }) => {
  if (warnings.length === 0) return null;

  const errors = warnings.filter((w) => w.severity === 'error');
  const warningItems = warnings.filter((w) => w.severity === 'warning');

  const getTypeLabel = (type: ValidationWarning['type']) => {
    switch (type) {
      case 'score_range':
        return '分数范围';
      case 'batch_conflict':
        return '批次冲突';
      case 'defect_spelling':
        return '术语规范';
      default:
        return '提醒';
    }
  };

  const getTypeIcon = (type: ValidationWarning['type'], severity: ValidationWarning['severity']) => {
    if (severity === 'error') {
      return <AlertCircle className="w-4 h-4 flex-shrink-0" />;
    }
    if (type === 'defect_spelling') {
      return <Lightbulb className="w-4 h-4 flex-shrink-0" />;
    }
    return <AlertTriangle className="w-4 h-4 flex-shrink-0" />;
  };

  return (
    <div className={cn('space-y-2', className)}>
      {errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg animate-shake">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                发现 {errors.length} 个错误需要修正
              </p>
              <ul className="mt-1 space-y-1">
                {errors.map((warning, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-red-700">
                    {getTypeIcon(warning.type, warning.severity)}
                    <span>
                      <span className="font-medium">[{getTypeLabel(warning.type)}]</span>{' '}
                      {warning.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {warningItems.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {warningItems.length} 个提醒建议
              </p>
              <ul className="mt-1 space-y-1">
                {warningItems.map((warning, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-amber-700">
                    {getTypeIcon(warning.type, warning.severity)}
                    <span>
                      <span className="font-medium">[{getTypeLabel(warning.type)}]</span>{' '}
                      {warning.message}
                      {warning.details && (
                        <span className="block mt-0.5 text-amber-600">
                          {warning.details}
                        </span>
                      )}
                      {warning.suggestions && warning.suggestions.length > 0 && (
                        <span className="block mt-0.5">
                          建议使用：
                          <span className="font-medium text-amber-800">
                            {warning.suggestions.join('、')}
                          </span>
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {warnings.length === 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-sm font-medium text-green-800">数据校验通过</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationAlert;
