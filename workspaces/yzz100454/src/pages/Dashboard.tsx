import { useEffect, useMemo, useRef } from 'react';
import { Users, Sparkles, FileWarning, MapPin, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store';
import { generateHeatmapPoints, getAnomalyDetails, calculateDailyStats } from '../utils/heatmap';
import StatCard from '../components/common/StatCard';
import HeatmapMap from '../components/heatmap/HeatmapMap';
import TimeSlider from '../components/heatmap/TimeSlider';
import HeatLegend from '../components/heatmap/HeatLegend';
import AnomalySidebar from '../components/heatmap/AnomalySidebar';

export default function Dashboard() {
  const {
    toilets,
    hourlyData,
    selectedDate,
    selectedHour,
    isPlaying,
    thresholdConfig,
    initMockData,
    setSelectedHour,
    setSelectedToiletId,
  } = useAppStore();

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (toilets.length === 0) {
      initMockData();
    }
  }, [toilets.length, initMockData]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setSelectedHour((prev) => (prev >= 22 ? 6 : prev + 1));
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, setSelectedHour]);

  const heatmapPoints = useMemo(() => {
    if (toilets.length === 0) return [];
    return generateHeatmapPoints(toilets, hourlyData, selectedDate, selectedHour);
  }, [toilets, hourlyData, selectedDate, selectedHour]);

  const anomalyDetails = useMemo(() => {
    if (toilets.length === 0) return [];
    return getAnomalyDetails(toilets, hourlyData, thresholdConfig);
  }, [toilets, hourlyData, thresholdConfig]);

  const dailyStats = useMemo(() => {
    if (toilets.length === 0) return null;
    return calculateDailyStats(toilets, hourlyData, selectedDate);
  }, [toilets, hourlyData, selectedDate]);

  const handleSelectToilet = (toiletId: string) => {
    setSelectedToiletId(toiletId);
  };

  const totalPassengers = dailyStats?.totalPassengers || 0;
  const totalCleanings = dailyStats?.totalCleanings || 0;
  const totalComplaints = dailyStats?.totalComplaints || 0;
  const offlineDevices = dailyStats?.offlineDevices || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">热力图总览</h1>
          <p className="text-navy-500 mt-1">实时监控公厕保洁状态，智能识别异常点位</p>
        </div>
        <button
          onClick={initMockData}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:bg-navy-50 transition-colors text-navy-600"
        >
          <RefreshCw className="w-4 h-4" />
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="公厕点位"
          value={toilets.length}
          icon={MapPin}
          color="blue"
          delay={100}
        />
        <StatCard
          title="今日客流"
          value={totalPassengers.toLocaleString()}
          icon={Users}
          color="green"
          trend={{ value: 12.5, isUp: true, label: '较昨日' }}
          delay={200}
        />
        <StatCard
          title="今日保洁"
          value={totalCleanings}
          icon={Sparkles}
          color="purple"
          trend={{ value: 5.2, isUp: true, label: '较昨日' }}
          delay={300}
        />
        <StatCard
          title="今日投诉"
          value={totalComplaints}
          icon={FileWarning}
          color="orange"
          trend={{ value: 8.3, isUp: false, label: '较昨日' }}
          delay={400}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="relative h-[500px]">
              <HeatmapMap points={heatmapPoints} />
              <div className="absolute top-4 right-4 z-[1000]">
                <HeatLegend />
              </div>
              <div className="absolute bottom-4 left-4 right-4 z-[1000]">
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3">
                  <TimeSlider />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-[500px]">
          <AnomalySidebar
            anomalies={anomalyDetails}
            onSelectToilet={handleSelectToilet}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-navy-800 mb-4">在线设备状态</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#22c55e"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${((toilets.length - offlineDevices) / toilets.length) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-navy-800">
                  {Math.round(((toilets.length - offlineDevices) / toilets.length) * 100)}%
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-navy-600">在线设备</span>
                <span className="text-sm font-semibold text-navy-800 ml-auto">
                  {toilets.length - offlineDevices}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-navy-600">离线设备</span>
                <span className="text-sm font-semibold text-navy-800 ml-auto">
                  {offlineDevices}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-navy-200" />
                <span className="text-sm text-navy-600">设备总数</span>
                <span className="text-sm font-semibold text-navy-800 ml-auto">
                  {toilets.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-navy-800 mb-4">异常类型分布</h3>
          <div className="space-y-3">
            {[
              { label: '高客流低保洁', count: anomalyDetails.filter(a => a.type === 'high_flow_low_clean').length, color: 'bg-orange-500' },
              { label: '投诉多巡检正常', count: anomalyDetails.filter(a => a.type === 'high_complaint_normal_inspection').length, color: 'bg-red-500' },
              { label: '连续缺打卡', count: anomalyDetails.filter(a => a.type === 'missing_checkin').length, color: 'bg-amber-500' },
              { label: '设备离线', count: anomalyDetails.filter(a => a.type === 'device_offline').length, color: 'bg-navy-500' },
            ].map((item, index) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-navy-600">{item.label}</span>
                  <span className="font-semibold text-navy-800">{item.count} 个点位</span>
                </div>
                <div className="h-2 bg-navy-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{
                      width: `${anomalyDetails.length > 0 ? (item.count / anomalyDetails.length) * 100 : 0}%`,
                      animationDelay: `${index * 100}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
