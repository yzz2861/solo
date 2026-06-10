import { useState } from 'react';
import {
  X,
  Package,
  Truck,
  Ban,
  Users,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Move,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { cn } from '@/lib/utils';
import type { SceneObject, ShelfObject, ForkliftObject, ZoneObject } from '@/types/scene';
import { fromMeters, toMeters } from '@/utils/units';

interface PropertyPanelProps {
  className?: string;
}

export function PropertyPanel({ className }: PropertyPanelProps) {
  const { selectedObjectId, getObjectById, updateObject, removeObject, displaySettings } =
    useSceneStore();
  const [sections, setSections] = useState<Record<string, boolean>>({
    position: true,
    dimensions: true,
    properties: true,
  });

  const selectedObject = selectedObjectId ? getObjectById(selectedObjectId) : undefined;

  const toggleSection = (key: string) => {
    setSections((s) => ({ ...s, [key]: !s[key] }));
  };

  if (!selectedObject) {
    return (
      <div
        className={cn(
          'w-72 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 p-4 shadow-2xl',
          className,
        )}
      >
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
            <Move className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-slate-400 text-sm">点击选中物体</p>
          <p className="text-slate-500 text-xs mt-1">查看和编辑属性</p>
        </div>
      </div>
    );
  }

  const unit = displaySettings.unit;

  const handleNumberInput = (
    value: string,
    key: keyof SceneObject | string,
    min?: number,
    max?: number,
  ) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;

    let meters = toMeters(num, unit);
    if (min !== undefined) meters = Math.max(min, meters);
    if (max !== undefined) meters = Math.min(max, meters);

    updateObject(selectedObject.id, { [key]: meters } as Partial<SceneObject>);
  };

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;

    updateObject(selectedObject.id, {
      position: {
        ...selectedObject.position,
        [axis]: toMeters(num, unit),
      },
    });
  };

  const getObjectIcon = () => {
    switch (selectedObject.type) {
      case 'shelf':
        return Package;
      case 'forklift':
        return Truck;
      case 'zone':
        return (selectedObject as ZoneObject).zoneType === 'forbidden' ? Ban : Users;
      default:
        return Package;
    }
  };

  const getObjectTitle = () => {
    switch (selectedObject.type) {
      case 'shelf':
        return '货架';
      case 'forklift':
        return '叉车';
      case 'zone':
        return (selectedObject as ZoneObject).zoneType === 'forbidden' ? '禁行区' : '行人通道';
      default:
        return '物体';
    }
  };

  const Icon = getObjectIcon();

  const SectionHeader = ({
    title,
    icon,
    sectionKey,
  }: {
    title: string;
    icon: React.ReactNode;
    sectionKey: string;
  }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between py-2 px-3 -mx-3 hover:bg-slate-800/50 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <span className="text-sm font-medium text-slate-200">{title}</span>
      </div>
      {sections[sectionKey] ? (
        <ChevronUp className="w-4 h-4 text-slate-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );

  const NumberField = ({
    label,
    value,
    onChange,
    min,
    max,
    step = 0.1,
  }: {
    label: string;
    value: number;
    onChange: (v: string) => void;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <div className="flex items-center justify-between">
      <label className="text-xs text-slate-400">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={fromMeters(value, unit).toFixed(2)}
          onChange={(e) => onChange(e.target.value)}
          min={min !== undefined ? fromMeters(min, unit) : undefined}
          max={max !== undefined ? fromMeters(max, unit) : undefined}
          step={step}
          className="w-20 px-2 py-1 text-xs text-right bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-orange-500"
        />
        <span className="text-xs text-slate-500 w-6">{unit}</span>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        'w-72 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Icon className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-100">{getObjectTitle()}</p>
            <p className="text-xs text-slate-400">{selectedObject.name || '未命名'}</p>
          </div>
        </div>
        <button
          onClick={() => removeObject(selectedObject.id)}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        <SectionHeader
          title="位置"
          icon={<Move className="w-4 h-4" />}
          sectionKey="position"
        />
        {sections.position && (
          <div className="space-y-2 pl-6 pb-2">
            <NumberField
              label="X"
              value={selectedObject.position.x}
              onChange={(v) => handlePositionChange('x', v)}
            />
            <NumberField
              label="Y"
              value={selectedObject.position.y}
              onChange={(v) => handlePositionChange('y', v)}
            />
            <NumberField
              label="Z"
              value={selectedObject.position.z}
              onChange={(v) => handlePositionChange('z', v)}
            />
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">旋转</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={selectedObject.rotation.toFixed(0)}
                  onChange={(e) =>
                    updateObject(selectedObject.id, {
                      rotation: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-20 px-2 py-1 text-xs text-right bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-orange-500"
                />
                <span className="text-xs text-slate-500 w-6">°</span>
              </div>
            </div>
          </div>
        )}

        <SectionHeader
          title="尺寸"
          icon={<Maximize2 className="w-4 h-4" />}
          sectionKey="dimensions"
        />
        {sections.dimensions && (
          <div className="space-y-2 pl-6 pb-2">
            {selectedObject.type === 'shelf' && (
              <>
                <NumberField
                  label="宽度"
                  value={(selectedObject as ShelfObject).width}
                  onChange={(v) => handleNumberInput(v, 'width', 0.5, 20)}
                />
                <NumberField
                  label="深度"
                  value={(selectedObject as ShelfObject).depth}
                  onChange={(v) => handleNumberInput(v, 'depth', 0.3, 5)}
                />
                <NumberField
                  label="高度"
                  value={(selectedObject as ShelfObject).height}
                  onChange={(v) => handleNumberInput(v, 'height', 1, 15)}
                />
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400">层数</label>
                  <input
                    type="number"
                    value={(selectedObject as ShelfObject).levels}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        levels: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    min={1}
                    max={20}
                    className="w-20 px-2 py-1 text-xs text-right bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </>
            )}
            {selectedObject.type === 'forklift' && (
              <>
                <NumberField
                  label="车宽"
                  value={(selectedObject as ForkliftObject).width}
                  onChange={(v) => handleNumberInput(v, 'width', 0.5, 3)}
                />
                <NumberField
                  label="轴距"
                  value={(selectedObject as ForkliftObject).wheelbase}
                  onChange={(v) => handleNumberInput(v, 'wheelbase', 0.5, 5)}
                />
                <NumberField
                  label="货叉长"
                  value={(selectedObject as ForkliftObject).forkLength}
                  onChange={(v) => handleNumberInput(v, 'forkLength', 0.5, 3)}
                />
                <NumberField
                  label="最小转弯半径"
                  value={(selectedObject as ForkliftObject).turningRadius}
                  onChange={(v) => handleNumberInput(v, 'turningRadius', 0.5, 10)}
                />
              </>
            )}
            {selectedObject.type === 'zone' && (
              <>
                <NumberField
                  label="宽度"
                  value={(selectedObject as ZoneObject).width}
                  onChange={(v) => handleNumberInput(v, 'width', 0.5, 50)}
                />
                <NumberField
                  label="长度"
                  value={(selectedObject as ZoneObject).depth}
                  onChange={(v) => handleNumberInput(v, 'depth', 0.5, 50)}
                />
              </>
            )}
          </div>
        )}

        <SectionHeader
          title="属性"
          icon={<RotateCw className="w-4 h-4" />}
          sectionKey="properties"
        />
        {sections.properties && (
          <div className="space-y-2 pl-6 pb-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">名称</label>
              <input
                type="text"
                value={selectedObject.name || ''}
                onChange={(e) => updateObject(selectedObject.id, { name: e.target.value })}
                className="w-32 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-orange-500"
              />
            </div>

            {selectedObject.type === 'shelf' && (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400">带托盘</label>
                  <button
                    onClick={() =>
                      updateObject(selectedObject.id, {
                        hasPallet: !(selectedObject as ShelfObject).hasPallet,
                      })
                    }
                    className={cn(
                      'w-10 h-5 rounded-full transition-colors relative',
                      (selectedObject as ShelfObject).hasPallet
                        ? 'bg-orange-500'
                        : 'bg-slate-600',
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                        (selectedObject as ShelfObject).hasPallet
                          ? 'translate-x-5'
                          : 'translate-x-0.5',
                      )}
                    />
                  </button>
                </div>
                {(selectedObject as ShelfObject).hasPallet && (
                  <NumberField
                    label="托盘伸出量"
                    value={(selectedObject as ShelfObject).palletOverhang}
                    onChange={(v) => handleNumberInput(v, 'palletOverhang', 0, 1)}
                    step={0.05}
                  />
                )}
              </>
            )}

            {selectedObject.type === 'forklift' && (
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">型号</label>
                <input
                  type="text"
                  value={(selectedObject as ForkliftObject).model || ''}
                  onChange={(e) =>
                    updateObject(selectedObject.id, { model: e.target.value })
                  }
                  className="w-32 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-orange-500"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
