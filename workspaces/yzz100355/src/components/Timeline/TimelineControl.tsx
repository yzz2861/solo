import { useMemo } from 'react';
import { Play, Pause, RotateCcw, FastForward, Rewind, Repeat } from 'lucide-react';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useSceneStore } from '@/store/useSceneStore';
import { formatDurationShort, formatTime, addSeconds } from '@/utils/time';
import { cn } from '@/utils/cn';

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4, 8];

export function TimelineControl() {
  const {
    isPlaying,
    currentTime,
    duration,
    speed,
    loop,
    playbackStartTime,
    actions: { togglePlay, seek, setSpeed, toggleLoop, reset },
  } = usePlaybackStore();
  
  const selectedShift = useSceneStore(state => 
    state.actions.getSelectedShift()
  );
  
  const currentDisplayTime = useMemo(() => {
    if (!playbackStartTime) return '--:--:--';
    return formatTime(addSeconds(playbackStartTime, currentTime));
  }, [playbackStartTime, currentTime]);
  
  const totalDuration = useMemo(() => 
    formatDurationShort(duration),
    [duration]
  );
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    seek(percentage * duration);
  };
  
  const cycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(speed);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    setSpeed(SPEED_OPTIONS[nextIndex]);
  };
  
  const skipBackward = () => {
    seek(Math.max(0, currentTime - 10));
  };
  
  const skipForward = () => {
    seek(Math.min(duration, currentTime + 10));
  };
  
  if (!selectedShift) {
    return (
      <div className="bg-background-light/90 backdrop-blur-md border-t border-white/10 px-6 py-4">
        <p className="text-center text-white/50">请选择一个班次以开始播放</p>
      </div>
    );
  }
  
  return (
    <div className="bg-background-light/90 backdrop-blur-md border-t border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-white/50">当前时间：</span>
              <span className="text-primary font-mono font-medium text-lg">{currentDisplayTime}</span>
            </div>
            <div className="text-sm">
              <span className="text-white/50">班次：</span>
              <span className="text-white font-medium">{selectedShift.date} {selectedShift.shiftName}</span>
            </div>
            <div className="text-sm">
              <span className="text-white/50">机器人：</span>
              <span className="text-white font-medium">{selectedShift.robotId}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={cycleSpeed}
              className="btn-secondary text-xs px-3 py-1"
              title="播放速度"
            >
              {speed}x
            </button>
          </div>
        </div>
        
        <div 
          className="relative h-2 bg-background-dark rounded-full cursor-pointer mb-4 group"
          onClick={handleSeek}
        >
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary-dark to-primary rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
          
          <div className="absolute -top-6 left-0 right-0 flex justify-between px-1 pointer-events-none">
            {[0, 25, 50, 75, 100].map(percent => (
              <div key={percent} className="text-xs text-white/40">
                {formatDurationShort(duration * percent / 100)}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/50 font-mono">
            {formatDurationShort(currentTime)} / {totalDuration}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={skipBackward}
              className="btn-secondary p-2"
              title="后退10秒"
            >
              <Rewind size={18} />
            </button>
            
            <button
              onClick={togglePlay}
              className={cn(
                "btn-primary p-3 rounded-full",
                isPlaying && "animate-pulse"
              )}
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <button
              onClick={skipForward}
              className="btn-secondary p-2"
              title="前进10秒"
            >
              <FastForward size={18} />
            </button>
            
            <button
              onClick={reset}
              className="btn-secondary p-2"
              title="重置"
            >
              <RotateCcw size={18} />
            </button>
            
            <div className="w-px h-8 bg-white/10 mx-2" />
            
            <button
              onClick={toggleLoop}
              className={cn(
                "btn-secondary p-2",
                loop && "bg-primary/20 border-primary/50"
              )}
              title={loop ? '关闭循环' : '开启循环'}
            >
              <Repeat size={18} className={loop ? 'text-primary' : ''} />
            </button>
          </div>
          
          <div className="w-24" />
        </div>
      </div>
    </div>
  );
}
