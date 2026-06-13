import { Measurement, ANOMALY_TYPE_LABELS, ANOMALY_TYPE_COLORS } from '../../types';
import { formatDate, formatWidth, formatTemperature } from '../../utils/format';
import { AlertCircle } from 'lucide-react';

interface MeasurementTableProps {
  measurements: Measurement[];
  showAnomalies?: boolean;
  compact?: boolean;
}

export default function MeasurementTable({
  measurements,
  showAnomalies = true,
  compact = false,
}: MeasurementTableProps) {
  const getRowClass = (m: Measurement) => {
    const hasSignificantAnomaly = m.anomalies.some(
      (a) => a.type === 'temp_diff' || a.type === 'width_fluctuation'
    );
    if (hasSignificantAnomaly) return 'warning-row';
    return '';
  };

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>测量日期</th>
            {!compact && <th>原始值</th>}
            <th>换算宽度</th>
            <th>温度</th>
            <th>照片编号</th>
            {!compact && <th>照片角度</th>}
            <th>测量人</th>
            {!compact && <th>测量工具</th>}
            {showAnomalies && <th>异常说明</th>}
          </tr>
        </thead>
        <tbody>
          {[...measurements]
            .sort(
              (a, b) =>
                new Date(b.measureDate).getTime() - new Date(a.measureDate).getTime()
            )
            .map((m) => (
              <tr key={m.id} className={getRowClass(m)}>
                <td className="font-mono text-sm">{formatDate(m.measureDate)}</td>
                {!compact && (
                  <td className="font-mono">
                    {m.widthRaw} {m.widthUnit}
                  </td>
                )}
                <td className="font-mono font-medium text-primary-700">
                  {formatWidth(m.widthMm)}
                </td>
                <td className="font-mono text-orange-600">
                  {formatTemperature(m.temperature)}
                </td>
                <td className="font-mono text-neutral-600">{m.photoId}</td>
                {!compact && <td>{m.photoAngle}</td>}
                <td>{m.surveyor}</td>
                {!compact && <td className="text-neutral-600">{m.tool}</td>}
                {showAnomalies && (
                  <td className="max-w-xs">
                    {m.anomalies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {m.anomalies.map((a, idx) => (
                          <span
                            key={a.id || idx}
                            className={`${ANOMALY_TYPE_COLORS[a.type]} cursor-help`}
                            title={a.description}
                          >
                            {a.type === 'temp_diff' || a.type === 'width_fluctuation' ? (
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                            ) : null}
                            {ANOMALY_TYPE_LABELS[a.type]}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-neutral-400 text-sm">-</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
      {measurements.length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          暂无测量记录
        </div>
      )}
    </div>
  );
}
