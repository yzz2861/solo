import { useMemo, useState } from 'react';
import { AlertTriangle, AlertCircle, Info, MapPin, Clock, Copy, XCircle, Tag, Search } from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { useDetection } from '@/hooks/useDetection';
import { useAnnotationStore } from '@/store/useAnnotationStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { severityToHex } from '@/utils/colors';
import { formatTime } from '@/utils/time';
import { cn } from '@/utils/cn';
import type { DetectionResult } from '@/types';

const detectionTypeConfig = {
  missing: {
    icon: XCircle,
    label: '坐标缺失',
    description: 'GPS信号中断',
  },
  duplicate: {
    icon: Copy,
    label: '重复记录',
    description: '同一时间多条记录',
  },
  proximity: {
    icon: AlertTriangle,
    label: '区域贴近',
    description: '靠近危险区域',
  },
  abnormalStay: {
    icon: Clock,
    label: '异常停留',
    description: '停留时间过长',
  },
};

export function DetectionPanel() {
  const { selectedShiftId } = useSceneStore();
  const { detections, isRunning, stats } = useDetection(selectedShiftId);
  const { annotations, isAnnotationMode, actions: { toggleAnnotationMode } } = useAnnotationStore();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDetections = useMemo(() => {
    return detections.filter(d => {
      if (filterType !== 'all' && d.type !== filterType) return false;
      if (filterSeverity !== 'all' && d.severity !== filterSeverity) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return d.description.toLowerCase().includes(query);
      }
      return true;
    });
  }, [detections, filterType, filterSeverity, searchQuery]);

  const groupedDetections = useMemo(() => {
    const groups: { [key: string]: DetectionResult[] } = {};
    filteredDetections.forEach(d => {
      if (!groups[d.type]) groups[d.type] = [];
      groups[d.type].push(d);
    });
    return groups;
  }, [filteredDetections]);

  const hasAnnotation = (detectionId: string) => {
    return annotations.some(a => a.targetId === detectionId);
  };

  const handleJumpToDetection = (detection: DetectionResult) => {
    const { actions: { selectPoint } } = useSceneStore.getState();
    if (detection.pointId) {
      selectPoint(detection.pointId);
    }
    const { playbackStartTime, actions: { seek } } = usePlaybackStore.getState();
    if (playbackStartTime) {
      const targetTime = new Date(detection.timestamp).getTime();
      const startTime = new Date(playbackStartTime).getTime();
      const offsetSeconds = (targetTime - startTime) / 1000;
      seek(offsetSeconds);
    }
  };

  const handleAnnotate = (detection: DetectionResult, e: React.MouseEvent) => {
    e.stopPropagation();
    const { actions: { selectAnnotation, setFilter } } = useAnnotationStore.getState();
    toggleAnnotationMode();
    setFilter({ targetType: 'detection' });
    selectAnnotation(null);
    
    setTimeout(() => {
      const event = new CustomEvent('annotate-detection', { 
        detail: { detectionId: detection.id, description: detection.description } 
      });
      window.dispatchEvent(event);
    }, 100);
  };

  if (!selectedShiftId) {
    return (
      <div className="panel p-4">
        <h3 className="font-display font-semibold text-lg mb-4 text-primary">异常检测</h3>
        <div className="text-center py-8 text-white/50">
          <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
          <p>请先选择一个巡逻班次</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg text-primary">异常检测</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAnnotationMode}
            className={cn(
              "px-2 py-1 rounded text-xs font-medium transition-colors",
              isAnnotationMode
                ? "bg-primary text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            )}
          >
            <Tag size={12} className="inline mr-1" />
            标注模式
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="stat-card">
          <div className="text-lg font-display font-bold text-white">{stats.total}</div>
          <div className="text-xs text-white/50">总计</div>
        </div>
        <div className="stat-card border-l-2 border-l-danger">
          <div className="text-lg font-display font-bold text-danger">{stats.high}</div>
          <div className="text-xs text-white/50">高危</div>
        </div>
        <div className="stat-card border-l-2 border-l-warning">
          <div className="text-lg font-display font-bold text-warning">{stats.medium}</div>
          <div className="text-xs text-white/50">中危</div>
        </div>
        <div className="stat-card border-l-2 border-l-success">
          <div className="text-lg font-display font-bold text-success">{stats.low}</div>
          <div className="text-xs text-white/50">低危</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {Object.entries(detectionTypeConfig).map(([type, config]) => (
          <div key={type} className="text-center p-2 rounded bg-white/5">
            <div className="text-sm font-medium text-white">
              {stats.byType[type as keyof typeof stats.byType]}
            </div>
            <div className="text-xs text-white/50">{config.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="搜索异常..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-primary/50"
        >
          <option value="all">全部类型</option>
          <option value="missing">坐标缺失</option>
          <option value="duplicate">重复记录</option>
          <option value="proximity">区域贴近</option>
          <option value="abnormalStay">异常停留</option>
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-primary/50"
        >
          <option value="all">全部级别</option>
          <option value="high">高危</option>
          <option value="medium">中危</option>
          <option value="low">低危</option>
        </select>
      </div>

      {isRunning ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-white/50 text-sm">正在检测异常...</p>
        </div>
      ) : filteredDetections.length === 0 ? (
        <div className="text-center py-8 text-white/50">
          <Info size={32} className="mx-auto mb-2 opacity-50" />
          <p>暂无异常记录</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {Object.entries(groupedDetections).map(([type, items]) => {
            const config = detectionTypeConfig[type as keyof typeof detectionTypeConfig];
            const Icon = config.icon;
            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Icon size={14} />
                  <span>{config.label}</span>
                  <span className="text-white/40">({items.length})</span>
                </div>
                {items.map((detection) => {
                  const annotated = hasAnnotation(detection.id);
                  return (
                    <div
                      key={detection.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all cursor-pointer",
                        annotated
                          ? "border-success/30 bg-success/5"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      )}
                      onClick={() => handleJumpToDetection(detection)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: severityToHex(detection.severity) }}
                          />
                          <span className="text-sm font-medium text-white">
                            {config.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-white/50">
                            {formatTime(detection.timestamp)}
                          </span>
                          <button
                            onClick={(e) => handleAnnotate(detection, e)}
                            className={cn(
                              "ml-1 p-1 rounded transition-colors",
                              annotated
                                ? "text-success hover:bg-success/10"
                                : "text-white/30 hover:text-white hover:bg-white/10"
                            )}
                            title={annotated ? '已标注' : '添加标注'}
                          >
                            <Tag size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-white/70 mb-2">{detection.description}</p>
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        {detection.distance !== undefined && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />
                            距离 {detection.distance.toFixed(1)}m
                          </span>
                        )}
                        {detection.duration !== undefined && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            时长 {Math.round(detection.duration / 60)}分钟
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
