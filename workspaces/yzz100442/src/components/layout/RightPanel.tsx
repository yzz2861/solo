import { useState } from 'react';
import {
  Settings,
  Move,
  RotateCcw,
  Maximize,
  Trash2,
  ChevronDown,
  ChevronRight,
  StickyNote,
  Palette,
  Video,
  Lightbulb,
  Ruler,
} from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import type { StudioDevice, CameraDevice, LightDevice, AnchorDevice, ProductTableDevice, ZoneDevice } from '@/types/device';

interface RightPanelProps {}

export function RightPanel({}: RightPanelProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['transform', 'params', 'note']);

  const selectedId = useStudioStore((state) => state.selectedId);
  const devices = useStudioStore((state) => state.devices);
  const updateDevice = useStudioStore((state) => state.updateDevice);
  const removeDevice = useStudioStore((state) => state.removeDevice);
  const pushHistory = useStudioStore((state) => state.pushHistory);

  const selectedDevice = devices.find((d) => d.id === selectedId);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedDevice) return;
    updateDevice(selectedDevice.id, {
      position: { ...selectedDevice.position, [axis]: value },
    } as Partial<StudioDevice>);
  };

  const handleRotationChange = (axis: 'x' | 'y' | 'z', degrees: number) => {
    if (!selectedDevice) return;
    const radians = (degrees * Math.PI) / 180;
    updateDevice(selectedDevice.id, {
      rotation: { ...selectedDevice.rotation, [axis]: radians },
    } as Partial<StudioDevice>);
  };

  const handleNoteChange = (note: string) => {
    if (!selectedDevice) return;
    updateDevice(selectedDevice.id, { note } as Partial<StudioDevice>);
  };

  const handleDelete = () => {
    if (selectedDevice && confirm(`确定要删除 "${selectedDevice.name}" 吗？`)) {
      removeDevice(selectedDevice.id);
    }
  };

  const SectionHeader = ({ icon: Icon, label, sectionKey }: { icon: any; label: string; sectionKey: string }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-800/50 text-left transition-colors"
    >
      <ChevronRight
        className={`w-4 h-4 text-slate-400 transition-transform ${
          expandedSections.includes(sectionKey) ? 'rotate-90' : ''
        }`}
      />
      <Icon className="w-4 h-4 text-slate-400" />
      <span className="text-xs font-medium text-slate-300">{label}</span>
    </button>
  );

  const NumberInput = ({
    label,
    value,
    onChange,
    step = 0.1,
    min,
    max,
    unit = '',
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    max?: number;
    unit?: string;
  }) => (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 w-6">{label}</span>
      <div className="flex-1 flex items-center">
        <input
          type="number"
          value={Number(value.toFixed(2))}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          onBlur={pushHistory}
          className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
        />
        {unit && <span className="text-[10px] text-slate-500 ml-1 w-6">{unit}</span>}
      </div>
    </div>
  );

  if (!selectedDevice) {
    return (
      <div className="w-72 bg-slate-900/80 border-l border-slate-700/50 backdrop-blur-sm flex flex-col">
        <div className="p-3 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-200 font-mono flex items-center gap-2">
            <Settings className="w-4 h-4" />
            属性面板
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
              <Move className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">未选中设备</p>
            <p className="text-[11px] text-slate-600 mt-1">点击场景中的设备查看属性</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-slate-900/80 border-l border-slate-700/50 backdrop-blur-sm flex flex-col">
      <div className="p-3 border-b border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-200 font-mono flex items-center gap-2">
          <Settings className="w-4 h-4" />
          属性面板
        </h2>
      </div>

      <div className="p-3 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
            {selectedDevice.type === 'camera' && <Video className="w-5 h-5 text-blue-400" />}
            {selectedDevice.type === 'light' && <Lightbulb className="w-5 h-5 text-amber-400" />}
            {selectedDevice.type === 'anchor' && <Ruler className="w-5 h-5 text-green-400" />}
            {selectedDevice.type === 'productTable' && <Ruler className="w-5 h-5 text-orange-400" />}
            {selectedDevice.type === 'zone' && <Ruler className="w-5 h-5 text-purple-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={selectedDevice.name}
              onChange={(e) => updateDevice(selectedDevice.id, { name: e.target.value } as Partial<StudioDevice>)}
              className="w-full bg-transparent text-sm font-medium text-slate-200 focus:outline-none focus:bg-slate-700/50 px-1 py-0.5 rounded"
            />
            <p className="text-[10px] text-slate-500 mt-0.5 px-1">ID: {selectedDevice.id.slice(0, 8)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-slate-700/50">
          <SectionHeader icon={Move} label="位置与旋转" sectionKey="transform" />
          {expandedSections.includes('transform') && (
            <div className="px-3 pb-3 space-y-2">
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">位置</p>
                <NumberInput label="X" value={selectedDevice.position.x} onChange={(v) => handlePositionChange('x', v)} unit="m" />
                <NumberInput label="Z" value={selectedDevice.position.z} onChange={(v) => handlePositionChange('z', v)} unit="m" />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">旋转</p>
                <NumberInput
                  label="Y"
                  value={(selectedDevice.rotation.y * 180) / Math.PI}
                  onChange={(v) => handleRotationChange('y', v)}
                  step={5}
                  unit="°"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-b border-slate-700/50">
          <SectionHeader icon={Maximize} label="参数设置" sectionKey="params" />
          {expandedSections.includes('params') && (
            <div className="px-3 pb-3 space-y-2">
              {selectedDevice.type === 'camera' && (
                <>
                  <NumberInput
                    label="高度"
                    value={(selectedDevice as CameraDevice).height}
                    onChange={(v) =>
                      updateDevice(selectedDevice.id, {
                        height: v,
                        position: { ...selectedDevice.position, y: v },
                      } as Partial<StudioDevice>)
                    }
                    unit="m"
                    min={0.5}
                    max={4}
                  />
                  <NumberInput
                    label="视场"
                    value={(selectedDevice as CameraDevice).fov}
                    onChange={(v) => updateDevice(selectedDevice.id, { fov: v } as Partial<StudioDevice>)}
                    unit="°"
                    min={20}
                    max={120}
                  />
                </>
              )}

              {selectedDevice.type === 'light' && (
                <>
                  <NumberInput
                    label="高度"
                    value={(selectedDevice as LightDevice).height}
                    onChange={(v) =>
                      updateDevice(selectedDevice.id, {
                        height: v,
                        position: { ...selectedDevice.position, y: v },
                      } as Partial<StudioDevice>)
                    }
                    unit="m"
                    min={0.5}
                    max={5}
                  />
                  <NumberInput
                    label="强度"
                    value={(selectedDevice as LightDevice).intensity}
                    onChange={(v) => updateDevice(selectedDevice.id, { intensity: v } as Partial<StudioDevice>)}
                    step={0.1}
                    min={0}
                    max={10}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 w-6">颜色</span>
                    <input
                      type="color"
                      value={(selectedDevice as LightDevice).color}
                      onChange={(e) =>
                        updateDevice(selectedDevice.id, { color: e.target.value } as Partial<StudioDevice>)
                      }
                      className="w-8 h-6 bg-transparent border-0 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">
                      {(selectedDevice as LightDevice).color}
                    </span>
                  </div>
                </>
              )}

              {selectedDevice.type === 'anchor' && (
                <>
                  <NumberInput
                    label="宽度"
                    value={(selectedDevice as AnchorDevice).size.width}
                    onChange={(v) =>
                      updateDevice(selectedDevice.id, {
                        size: { ...(selectedDevice as AnchorDevice).size, width: v },
                      } as Partial<StudioDevice>)
                    }
                    unit="m"
                    min={0.5}
                    max={5}
                  />
                  <NumberInput
                    label="深度"
                    value={(selectedDevice as AnchorDevice).size.depth}
                    onChange={(v) =>
                      updateDevice(selectedDevice.id, {
                        size: { ...(selectedDevice as AnchorDevice).size, depth: v },
                      } as Partial<StudioDevice>)
                    }
                    unit="m"
                    min={0.5}
                    max={5}
                  />
                </>
              )}

              {selectedDevice.type === 'productTable' && (
                <>
                  <NumberInput
                    label="宽度"
                    value={(selectedDevice as ProductTableDevice).size.width}
                    onChange={(v) =>
                      updateDevice(selectedDevice.id, {
                        size: { ...(selectedDevice as ProductTableDevice).size, width: v },
                      } as Partial<StudioDevice>)
                    }
                    unit="m"
                    min={0.3}
                    max={3}
                  />
                  <NumberInput
                    label="深度"
                    value={(selectedDevice as ProductTableDevice).size.depth}
                    onChange={(v) =>
                      updateDevice(selectedDevice.id, {
                        size: { ...(selectedDevice as ProductTableDevice).size, depth: v },
                      } as Partial<StudioDevice>)
                    }
                    unit="m"
                    min={0.3}
                    max={2}
                  />
                  <NumberInput
                    label="高度"
                    value={(selectedDevice as ProductTableDevice).size.height}
                    onChange={(v) =>
                      updateDevice(selectedDevice.id, {
                        size: { ...(selectedDevice as ProductTableDevice).size, height: v },
                      } as Partial<StudioDevice>)
                    }
                    unit="m"
                    min={0.5}
                    max={2}
                  />
                </>
              )}

              {selectedDevice.type === 'zone' && (
                <>
                  <NumberInput
                    label="宽度"
                    value={(selectedDevice as ZoneDevice).size.width}
                    onChange={(v) =>
                      updateDevice(selectedDevice.id, {
                        size: { ...(selectedDevice as ZoneDevice).size, width: v },
                      } as Partial<StudioDevice>)
                    }
                    unit="m"
                    min={0.5}
                    max={10}
                  />
                  <NumberInput
                    label="深度"
                    value={(selectedDevice as ZoneDevice).size.depth}
                    onChange={(v) =>
                      updateDevice(selectedDevice.id, {
                        size: { ...(selectedDevice as ZoneDevice).size, depth: v },
                      } as Partial<StudioDevice>)
                    }
                    unit="m"
                    min={0.5}
                    max={20}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <div className="border-b border-slate-700/50">
          <SectionHeader icon={StickyNote} label="备注说明" sectionKey="note" />
          {expandedSections.includes('note') && (
            <div className="px-3 pb-3">
              <textarea
                value={selectedDevice.note || ''}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="添加设备备注、导播说明、搭建注意事项..."
                rows={4}
                className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none placeholder-slate-500"
              />
              <p className="text-[10px] text-slate-500 mt-1.5">
                提示：场务复位设备时可查看此备注
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-slate-700/50">
        <button
          onClick={handleDelete}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-md text-sm text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          删除设备
        </button>
      </div>
    </div>
  );
}
