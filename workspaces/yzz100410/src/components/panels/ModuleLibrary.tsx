import { useState } from "react";
import { Minus, CornerDownRight, Square, Plus } from "lucide-react";
import { useStore } from "@/store/useStore";
import type { BridgeModule } from "@/types";

const PRESETS: { type: BridgeModule["type"]; name: string; icon: React.ReactNode; length: number; width: number; loadCapacity: number }[] = [
  { type: "straight", name: "直段", icon: <Minus size={20} />, length: 6, width: 2, loadCapacity: 500 },
  { type: "curve", name: "弯段", icon: <CornerDownRight size={20} />, length: 4, width: 2, loadCapacity: 400 },
  { type: "platform", name: "平台", icon: <Square size={20} />, length: 3, width: 3, loadCapacity: 800 },
];

export default function ModuleLibrary() {
  const modules = useStore((s) => s.modules);
  const currentUnit = useStore((s) => s.currentUnit);
  const addModule = useStore((s) => s.addModule);

  const [customType, setCustomType] = useState<BridgeModule["type"]>("straight");
  const [customLength, setCustomLength] = useState(6);
  const [customWidth, setCustomWidth] = useState(2);
  const [customCapacity, setCustomCapacity] = useState(500);

  const addPreset = (preset: (typeof PRESETS)[number]) => {
    const offset = modules.length * 2;
    const mod: BridgeModule = {
      id: crypto.randomUUID(),
      type: preset.type,
      length: preset.length,
      width: preset.width,
      loadCapacity: preset.loadCapacity,
      position: [offset, 0, 0],
      rotation: 0,
      unit: currentUnit,
    };
    addModule(mod);
  };

  const addCustom = () => {
    const offset = modules.length * 2;
    const mod: BridgeModule = {
      id: crypto.randomUUID(),
      type: customType,
      length: customLength,
      width: customWidth,
      loadCapacity: customCapacity,
      position: [offset, 0, 0],
      rotation: 0,
      unit: currentUnit,
    };
    addModule(mod);
  };

  return (
    <div className="bg-[#0A2540] text-white p-4 rounded-lg w-72 flex flex-col gap-4 overflow-y-auto max-h-screen">
      <h2 className="text-sm font-semibold tracking-wide uppercase opacity-70">模块库</h2>

      <div className="flex flex-col gap-2">
        {PRESETS.map((preset) => (
          <div
            key={preset.type}
            className="flex items-center gap-3 border border-white/10 rounded-lg p-3"
          >
            <div className="text-[#00D4AA]">{preset.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{preset.name}</div>
              <div className="text-xs opacity-60 font-mono">
                {preset.length}m × {preset.width}m · {preset.loadCapacity}kg
              </div>
            </div>
            <button
              onClick={() => addPreset(preset)}
              className="bg-[#00D4AA] text-[#0A2540] text-xs font-semibold px-3 py-1 rounded-md hover:brightness-110 transition"
            >
              添加
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 pt-3">
        <h3 className="text-xs font-semibold tracking-wide uppercase opacity-60 mb-2">自定义模块</h3>
        <div className="flex flex-col gap-2">
          <select
            value={customType}
            onChange={(e) => setCustomType(e.target.value as BridgeModule["type"])}
            className="bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm outline-none"
          >
            <option value="straight">直段</option>
            <option value="curve">弯段</option>
            <option value="platform">平台</option>
          </select>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] opacity-50">长度</label>
              <input
                type="number"
                min={1}
                value={customLength}
                onChange={(e) => setCustomLength(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] opacity-50">宽度</label>
              <input
                type="number"
                min={1}
                value={customWidth}
                onChange={(e) => setCustomWidth(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] opacity-50">承重</label>
              <input
                type="number"
                min={100}
                value={customCapacity}
                onChange={(e) => setCustomCapacity(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm font-mono outline-none"
              />
            </div>
          </div>

          <button
            onClick={addCustom}
            className="flex items-center justify-center gap-1 bg-[#00D4AA] text-[#0A2540] text-xs font-semibold px-3 py-1.5 rounded-md hover:brightness-110 transition"
          >
            <Plus size={14} />
            添加自定义
          </button>
        </div>
      </div>
    </div>
  );
}
