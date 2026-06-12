import { AlertTriangle, Users, FileWarning, Clock, WifiOff } from 'lucide-react';
import type { AnomalyDetail } from '../../types';

interface AnomalySidebarProps {
  anomalies: AnomalyDetail[];
  onSelectToilet: (toiletId: string) => void;
}

const anomalyIcons = {
  'high_flow_low_clean': { icon: Users, label: '高客流低保洁', color: 'text-orange-500 bg-orange-50' },
  'high_complaint_normal_inspection': { icon: FileWarning, label: '投诉多巡检正常', color: 'text-red-500 bg-red-50' },
  'missing_checkin': { icon: Clock, label: '连续缺打卡', color: 'text-amber-500 bg-amber-50' },
  'device_offline': { icon: WifiOff, label: '设备离线', color: 'text-navy-500 bg-navy-50' },
};

const severityColors = {
  high: 'bg-red-500',
  medium: 'bg-orange-500',
  low: 'bg-yellow-500',
};

export default function AnomalySidebar({ anomalies, onSelectToilet }: AnomalySidebarProps) {
  const groupedAnomalies = anomalies.reduce((acc, a) => {
    if (!acc[a.type]) {
      acc[a.type] = [];
    }
    acc[a.type].push(a);
    return acc;
  }, {} as Record<string, AnomalyDetail[]>);

  return (
    <div className="bg-white rounded-xl shadow-sm h-full flex flex-col">
      <div className="p-4 border-b border-navy-100">
        <h3 className="font-semibold text-navy-800 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
          异常点位
          <span className="ml-auto text-sm font-normal text-navy-400">
            {anomalies.length} 个
          </span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
        {Object.entries(groupedAnomalies).map(([type, items]) => {
          const config = anomalyIcons[type as keyof typeof anomalyIcons];
          const Icon = config.icon;

          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${config.color}`}>
                  <Icon className={`w-4 h-4 ${config.color.split(' ')[0]}`} />
                </div>
                <span className="text-sm font-medium text-navy-700">
                  {config.label}
                </span>
                <span className="ml-auto text-xs text-navy-400">
                  {items.length}个
                </span>
              </div>
              <div className="space-y-2">
                {items.slice(0, 5).map((anomaly) => (
                  <button
                    key={anomaly.toiletId}
                    onClick={() => onSelectToilet(anomaly.toiletId)}
                    className="w-full text-left p-2.5 rounded-lg bg-navy-50 hover:bg-navy-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${severityColors[anomaly.severity]}`}
                      />
                      <span className="text-sm font-medium text-navy-700 truncate flex-1">
                        {anomaly.toiletName}
                      </span>
                    </div>
                    <p className="text-xs text-navy-500 mt-1 ml-4">
                      {anomaly.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {anomalies.length === 0 && (
          <div className="text-center py-8 text-navy-400">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无异常点位</p>
          </div>
        )}
      </div>
    </div>
  );
}
