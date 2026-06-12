import { X, Trash2 } from "lucide-react";
import { useStore } from "@/store/useStore";

const TYPE_LABELS = { straight: "直段", curve: "弯段", platform: "平台" };

export default function ModuleDetailPanel() {
  const selectedModuleId = useStore((s) => s.selectedModuleId);
  const modules = useStore((s) => s.modules);
  const updateModule = useStore((s) => s.updateModule);
  const removeModule = useStore((s) => s.removeModule);
  const setSelectedModule = useStore((s) => s.setSelectedModule);

  const mod = modules.find((m) => m.id === selectedModuleId);

  if (!mod) return null;

  const posField = (label: string, index: number) => (
    <div className="flex-1">
      <label className="text-[10px] opacity-50">{label}</label>
      <input
        type="number"
        step={0.1}
        value={mod.position[index]}
        onChange={(e) => {
          const pos = [...mod.position] as [number, number, number];
          pos[index] = Number(e.target.value);
          updateModule(mod.id, { position: pos });
        }}
        className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm font-mono outline-none"
      />
    </div>
  );

  const handleDelete = () => {
    removeModule(mod.id);
    setSelectedModule(null);
  };

  return (
    <div className="bg-[#0A2540] text-white p-4 rounded-lg w-72 flex flex-col gap-3 overflow-y-auto max-h-screen border border-white/10">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide uppercase opacity-70">模块详情</h2>
        <button
          onClick={() => setSelectedModule(null)}
          className="text-white/40 hover:text-white transition p-0.5"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-2 text-xs">
        <div className="flex justify-between">
          <span className="opacity-50">ID</span>
          <span className="font-mono opacity-70">{mod.id.slice(0, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-50">类型</span>
          <span>{TYPE_LABELS[mod.type]}</span>
        </div>
      </div>

      <div className="border-t border-white/10" />

      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold opacity-60">位置</div>
        <div className="flex gap-2">
          {posField("X", 0)}
          {posField("Y", 1)}
          {posField("Z", 2)}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold opacity-60">旋转</div>
        <input
          type="number"
          step={1}
          value={mod.rotation}
          onChange={(e) => updateModule(mod.id, { rotation: Number(e.target.value) })}
          className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm font-mono outline-none"
        />
      </div>

      <div className="border-t border-white/10" />

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] opacity-50">长度</label>
          <input
            type="number"
            min={1}
            step={0.1}
            value={mod.length}
            onChange={(e) => updateModule(mod.id, { length: Number(e.target.value) })}
            className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm font-mono outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] opacity-50">宽度</label>
          <input
            type="number"
            min={1}
            step={0.1}
            value={mod.width}
            onChange={(e) => updateModule(mod.id, { width: Number(e.target.value) })}
            className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm font-mono outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] opacity-50">承重</label>
          <input
            type="number"
            min={100}
            step={10}
            value={mod.loadCapacity}
            onChange={(e) => updateModule(mod.id, { loadCapacity: Number(e.target.value) })}
            className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm font-mono outline-none"
          />
        </div>
      </div>

      <button
        onClick={handleDelete}
        className="flex items-center justify-center gap-1.5 bg-[#FF6B35] text-white text-xs font-semibold py-2 rounded-md hover:brightness-110 transition mt-2"
      >
        <Trash2 size={14} />
        删除模块
      </button>
    </div>
  );
}
