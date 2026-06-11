import { AlertTriangle, Info, AlertCircle, Target } from 'lucide-react';
import type { Risk } from '../../types/safety';
import { getRiskLevelColor, getRiskLevelLabel, getRiskTypeLabel } from '../../types/safety';
import { useProjectStore } from '../../store/useProjectStore';
import { DEVICE_TYPE_LABELS } from '../../constants/colors';

interface RiskItemProps {
  risk: Risk;
}

export function RiskItem({ risk }: RiskItemProps) {
  const { selectDevice } = useProjectStore();

  const levelColor = getRiskLevelColor(risk.level);

  const getIcon = () => {
    switch (risk.level) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" style={{ color: levelColor }} />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" style={{ color: levelColor }} />;
      case 'info':
        return <Info className="w-4 h-4" style={{ color: levelColor }} />;
    }
  };

  const handleClick = () => {
    if (risk.deviceId !== 'global') {
      selectDevice(risk.deviceId);
    }
  };

  return (
    <div
      className={`p-3 border-l-2 bg-[#1a1d23]/50 cursor-pointer hover:bg-[#2d323b] transition-colors`}
      style={{ borderColor: levelColor }}
      onClick={handleClick}
    >
      <div className="flex items-start gap-2">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-sm"
              style={{ backgroundColor: `${levelColor}20`, color: levelColor }}
            >
              {getRiskLevelLabel(risk.level)}
            </span>
            <span className="text-[10px] text-[#64748b]">
              {getRiskTypeLabel(risk.type)}
            </span>
            <span className="text-[10px] text-[#64748b]">
              {DEVICE_TYPE_LABELS[risk.deviceType] || risk.deviceType}
            </span>
          </div>
          <p className="text-xs text-[#f8fafc] break-words">
            {risk.description}
          </p>
          {risk.value !== undefined && risk.threshold !== undefined && (
            <p className="text-[10px] text-[#94a3b8] mt-1 font-mono">
              当前: {risk.value.toFixed(2)} / 阈值: {risk.threshold.toFixed(2)}
            </p>
          )}
          <p className="text-[10px] text-[#10b981] mt-1">
            <Target className="w-3 h-3 inline mr-1" />
            {risk.suggestion}
          </p>
        </div>
      </div>
    </div>
  );
}
