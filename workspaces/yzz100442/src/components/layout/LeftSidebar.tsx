import { useState } from 'react';
import { User, Table, Camera, Lightbulb, ArrowRightLeft, ChevronRight, GripVertical, Plus } from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import { deviceTemplates, createDeviceFromTemplate } from '@/data/defaultDevices';
import type { DeviceType, DeviceTemplate } from '@/types/device';

interface LeftSidebarProps {}

const iconMap: Record<DeviceType, any> = {
  anchor: User,
  productTable: Table,
  camera: Camera,
  light: Lightbulb,
  cable: ArrowRightLeft,
  zone: ArrowRightLeft,
};

const categoryLabels: Record<string, string> = {
  area: '区域',
  device: '设备',
  lighting: '灯光',
};

const categories = [
  {
    key: 'area',
    items: deviceTemplates.filter((t) => t.type === 'anchor' || t.type === 'zone'),
  },
  {
    key: 'device',
    items: deviceTemplates.filter((t) => t.type === 'productTable' || t.type === 'camera'),
  },
  {
    key: 'lighting',
    items: deviceTemplates.filter((t) => t.type === 'light'),
  },
];

export function LeftSidebar({}: LeftSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['area', 'device', 'lighting']);
  const addDevice = useStudioStore((state) => state.addDevice);

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleAddDevice = (template: DeviceTemplate) => {
    const device = createDeviceFromTemplate(template);
    addDevice(device);
  };

  return (
    <div className="w-64 bg-slate-900/80 border-r border-slate-700/50 flex flex-col backdrop-blur-sm">
      <div className="p-3 border-b border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-200 font-mono">设备库</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">点击添加设备到场景</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {categories.map((category) => (
          <div key={category.key} className="rounded-lg overflow-hidden">
            <button
              onClick={() => toggleCategory(category.key)}
              className="w-full flex items-center gap-2 px-2 py-2 hover:bg-slate-800/50 text-left transition-colors"
            >
              <ChevronRight
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  expandedCategories.includes(category.key) ? 'rotate-90' : ''
                }`}
              />
              <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">
                {categoryLabels[category.key]}
              </span>
              <span className="ml-auto text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                {category.items.length}
              </span>
            </button>

            {expandedCategories.includes(category.key) && (
              <div className="px-2 pb-2 space-y-1">
                {category.items.map((template) => {
                  const Icon = iconMap[template.type] || Camera;
                  return (
                    <button
                      key={template.type}
                      onClick={() => handleAddDevice(template)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-800/50 hover:bg-slate-700/70 rounded-lg group transition-all hover:shadow-lg hover:shadow-blue-500/10"
                    >
                      <div className="w-9 h-9 rounded-md bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center group-hover:from-blue-600/30 group-hover:to-cyan-600/30 transition-colors">
                        <Icon className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-slate-200">{template.name}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{template.description}</p>
                      </div>
                      <Plus className="w-4 h-4 text-slate-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-700/50">
        <div className="flex items-start gap-2 p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-blue-400">?</span>
          </div>
          <div>
            <p className="text-[11px] font-medium text-blue-300">操作提示</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
              点击添加设备，拖拽移动位置，选中后在右侧面板调整参数
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
