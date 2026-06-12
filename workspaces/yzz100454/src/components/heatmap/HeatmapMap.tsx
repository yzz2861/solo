import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { HeatmapPoint } from '../../types';
import { getHeatColor, getHeatLabel } from '../../utils/heatmap';
import { AlertTriangle, Users, Sparkles, FileWarning, WifiOff } from 'lucide-react';

interface HeatmapMapProps {
  points: HeatmapPoint[];
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

function createCustomMarker(heatLevel: number, hasAnomaly: boolean) {
  const color = getHeatColor(heatLevel as 1 | 2 | 3 | 4 | 5);
  const size = 20 + heatLevel * 4;
  
  const pulseClass = hasAnomaly ? 'anomaly-pulse' : 'heat-pulse';
  
  const icon = L.divIcon({
    className: 'custom-heat-marker',
    html: `
      <div class="${pulseClass}" style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        ${hasAnomaly ? '<div style="width:8px;height:8px;background:#ef4444;border-radius:50%;position:absolute;top:-2px;right:-2px;border:2px solid white;"></div>' : ''}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  
  return icon;
}

const anomalyLabels: Record<string, string> = {
  'high_flow_low_clean': '高客流低保洁',
  'high_complaint_normal_inspection': '投诉多巡检正常',
  'missing_checkin': '连续缺打卡',
  'device_offline': '设备离线',
};

export default function HeatmapMap({ points }: HeatmapMapProps) {
  const [center, setCenter] = useState<[number, number]>([39.9042, 116.4074]);

  useEffect(() => {
    if (points.length > 0) {
      const avgLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
      const avgLng = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;
      setCenter([avgLat, avgLng]);
    }
  }, [points]);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-sm">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <MapController center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {points.map((point) => {
          const hasAnomaly = point.anomalies.length > 0;
          const icon = createCustomMarker(point.heatLevel, hasAnomaly);
          
          return (
            <Marker
              key={point.toiletId}
              position={[point.latitude, point.longitude]}
              icon={icon}
            >
              <Popup>
                <div className="min-w-[200px] p-1">
                  <h3 className="font-bold text-navy-900 text-base mb-2">
                    {point.toiletName}
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-navy-500 flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getHeatColor(point.heatLevel as 1 | 2 | 3 | 4 | 5) }}
                        />
                        热力等级
                      </span>
                      <span className="font-medium text-navy-700">
                        {getHeatLabel(point.heatLevel as 1 | 2 | 3 | 4 | 5)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-navy-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        客流人次
                      </span>
                      <span className="font-medium text-navy-700">
                        {point.passengerCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-navy-500 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        保洁次数
                      </span>
                      <span className="font-medium text-navy-700">
                        {point.cleaningCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-navy-500 flex items-center gap-1.5">
                        <FileWarning className="w-3.5 h-3.5" />
                        投诉数
                      </span>
                      <span className="font-medium text-navy-700">
                        {point.complaintCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-navy-500 flex items-center gap-1.5">
                        <WifiOff className="w-3.5 h-3.5" />
                        巡检次数
                      </span>
                      <span className="font-medium text-navy-700">
                        {point.inspectionCount}
                      </span>
                    </div>
                  </div>
                  
                  {point.anomalies.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-navy-100">
                      <p className="text-xs text-red-600 font-medium mb-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        异常提醒
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {point.anomalies.map((a) => (
                          <span
                            key={a}
                            className="px-2 py-0.5 text-xs bg-red-50 text-red-600 rounded-full"
                          >
                            {anomalyLabels[a]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
