import { Square, Lightbulb, Speaker, CircleDot, Users, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../ui/Button';
import { DEVICE_TYPE_LABELS, DEVICE_TYPE_COLORS } from '../../constants/colors';
import type { DeviceType } from '../../types/devices';

const deviceTypes: Array<{
  type: DeviceType;
  icon: React.ElementType;
  description: string;
}> = [
  { type: 'stage', icon: Square, description: '放置舞台' },
  { type: 'hoistPoint', icon: CircleDot, description: '放置吊点' },
  { type: 'lightRig', icon: Lightbulb, description: '放置灯架' },
  { type: 'speaker', icon: Speaker, description: '放置音箱' },
  { type: 'audienceArea', icon: Users, description: '放置观众区' },
];

export function DeviceToolbar() {
  const { placingDeviceType, isPlacingDevice, startPlacingDevice, cancelPlacingDevice } = useUIStore();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-1 p-2 bg-[rgba(35,39,47,0.95)] backdrop-blur-sm border border-[#3a4150] shadow-xl">
        {deviceTypes.map(({ type, icon: Icon, description }) => (
          <Button
            key={type}
            variant={placingDeviceType === type ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => startPlacingDevice(type)}
            isActive={placingDeviceType === type}
            title={description}
            className="flex-col py-2 px-3"
          >
            <Icon
              className="w-5 h-5"
              style={{ color: placingDeviceType === type ? undefined : DEVICE_TYPE_COLORS[type] }}
            />
            <span className="text-[10px] mt-0.5">{DEVICE_TYPE_LABELS[type]}</span>
          </Button>
        ))}
        
        {isPlacingDevice && (
          <>
            <div className="w-px h-8 bg-[#3a4150] mx-1" />
            <Button
              variant="danger"
              size="sm"
              onClick={cancelPlacingDevice}
              title="取消放置"
            >
              <X className="w-4 h-4" />
              取消
            </Button>
          </>
        )}
      </div>
      
      {isPlacingDevice && (
        <div className="mt-2 text-center">
          <p className="text-xs text-[#94a3b8]">
            点击地面放置 {DEVICE_TYPE_LABELS[placingDeviceType!]}，按 ESC 取消
          </p>
        </div>
      )}
    </div>
  );
}
