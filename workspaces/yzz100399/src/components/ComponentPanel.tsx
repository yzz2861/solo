import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import type { ComponentType } from "@/types";
import { COMPONENT_DEFAULTS } from "@/types";
import { Plus, Layers, SlidersHorizontal, Shield, Fence, Eye } from "lucide-react";

const COMPONENT_ICONS: Record<ComponentType, React.ReactNode> = {
  platform: <Layers size={18} />,
  slide: <SlidersHorizontal size={18} />,
  softpad: <Shield size={18} />,
  fence: <Fence size={18} />,
  supervisor: <Eye size={18} />,
};

const COMPONENT_TYPES: ComponentType[] = ["platform", "slide", "softpad", "fence", "supervisor"];

export function ComponentPanel() {
  const { addComponent, components } = usePlaygroundStore();

  return (
    <div className="w-60 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
      <div className="p-3 border-b border-slate-700">
        <h2 className="text-sm font-bold text-slate-200 tracking-wide">部件库</h2>
        <p className="text-xs text-slate-400 mt-1">点击添加到场景</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {COMPONENT_TYPES.map((type) => {
          const count = components.filter((c) => c.type === type).length;
          return (
            <button
              key={type}
              onClick={() => addComponent(type)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/70 text-slate-200 transition-all duration-150 hover:shadow-md hover:translate-y-[-1px] active:translate-y-0 group"
            >
              <span className="text-orange-400 group-hover:text-orange-300 transition-colors">
                {COMPONENT_ICONS[type]}
              </span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{COMPONENT_DEFAULTS[type].label}</div>
                <div className="text-xs text-slate-400">
                  {COMPONENT_DEFAULTS[type].dimensions.width}×{COMPONENT_DEFAULTS[type].dimensions.height}×{COMPONENT_DEFAULTS[type].dimensions.depth} cm
                </div>
              </div>
              <div className="flex items-center gap-1">
                {count > 0 && (
                  <span className="text-xs bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
                <Plus size={14} className="text-slate-400 group-hover:text-orange-300 transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
      <div className="p-3 border-t border-slate-700">
        <div className="text-xs text-slate-500 text-center">
          场景中共 {components.length} 个部件
        </div>
      </div>
    </div>
  );
}
