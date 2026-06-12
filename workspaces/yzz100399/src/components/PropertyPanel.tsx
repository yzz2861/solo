import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { COMPONENT_DEFAULTS } from "@/types";
import type { LengthUnit } from "@/types";
import { Trash2, AlertTriangle } from "lucide-react";

export function PropertyPanel() {
  const {
    components,
    selectedId,
    updateDimensions,
    updateBufferZone,
    updateUnit,
    updateName,
    updatePosition,
    removeComponent,
    maxHeight,
    bufferRange,
    setMaxHeight,
    setBufferRange,
  } = usePlaygroundStore();

  const selected = components.find((c) => c.id === selectedId);

  const toCm = (val: number, unit: LengthUnit) => (unit === "m" ? val * 100 : val);
  const hasUnitWarning =
    selected &&
    selected.unit === "m" &&
    (selected.dimensions.width > 10 || selected.dimensions.height > 10 || selected.dimensions.depth > 10);

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col h-full">
      <div className="p-3 border-b border-slate-700">
        <h2 className="text-sm font-bold text-slate-200 tracking-wide">全局参数</h2>
      </div>
      <div className="p-3 border-b border-slate-700 space-y-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1">最大允许高度 (cm)</label>
          <input
            type="number"
            value={maxHeight}
            onChange={(e) => setMaxHeight(Number(e.target.value))}
            className="w-full bg-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-sm border border-slate-600 focus:border-orange-400 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">滑梯出口缓冲范围 (cm)</label>
          <input
            type="number"
            value={bufferRange}
            onChange={(e) => setBufferRange(Number(e.target.value))}
            className="w-full bg-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-sm border border-slate-600 focus:border-orange-400 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {selected ? (
        <>
          <div className="p-3 border-b border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm inline-block"
                  style={{ backgroundColor: COMPONENT_DEFAULTS[selected.type].color }}
                />
                {COMPONENT_DEFAULTS[selected.type].label}属性
              </h3>
              <button
                onClick={() => removeComponent(selected.id)}
                className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-400/10"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">名称</label>
              <input
                type="text"
                value={selected.name}
                onChange={(e) => updateName(selected.id, e.target.value)}
                className="w-full bg-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-sm border border-slate-600 focus:border-orange-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">位置 (cm)</label>
              <div className="grid grid-cols-3 gap-2">
                {(["x", "y", "z"] as const).map((axis) => (
                  <div key={axis}>
                    <span className="text-xs text-slate-500 block mb-0.5">{axis.toUpperCase()}</span>
                    <input
                      type="number"
                      value={selected.position[axis]}
                      onChange={(e) =>
                        updatePosition(
                          selected.id,
                          axis === "x" ? Number(e.target.value) : selected.position.x,
                          axis === "y" ? Number(e.target.value) : selected.position.y,
                          axis === "z" ? Number(e.target.value) : selected.position.z
                        )
                      }
                      className="w-full bg-slate-700 text-slate-200 rounded px-2 py-1 text-sm border border-slate-600 focus:border-orange-400 focus:outline-none transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">尺寸</label>
              <div className={`rounded-lg border-2 p-2 ${hasUnitWarning ? "border-orange-400 bg-orange-400/5" : "border-transparent"}`}>
                {hasUnitWarning && (
                  <div className="flex items-center gap-1.5 mb-2 text-orange-400 text-xs font-medium">
                    <AlertTriangle size={14} />
                    单位设为"米"但数值偏大，疑似应为"厘米"
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-500">单位：</span>
                  <select
                    value={selected.unit}
                    onChange={(e) => updateUnit(selected.id, e.target.value as LengthUnit)}
                    className={`bg-slate-700 text-slate-200 rounded px-2 py-1 text-sm border focus:outline-none transition-colors ${
                      hasUnitWarning ? "border-orange-400" : "border-slate-600 focus:border-orange-400"
                    }`}
                  >
                    <option value="cm">厘米 (cm)</option>
                    <option value="m">米 (m)</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["width", "height", "depth"] as const).map((dim) => (
                    <div key={dim}>
                      <span className="text-xs text-slate-500 block mb-0.5">
                        {dim === "width" ? "宽" : dim === "height" ? "高" : "深"}
                      </span>
                      <input
                        type="number"
                        value={selected.dimensions[dim]}
                        onChange={(e) =>
                          updateDimensions(
                            selected.id,
                            dim === "width" ? Number(e.target.value) : selected.dimensions.width,
                            dim === "height" ? Number(e.target.value) : selected.dimensions.height,
                            dim === "depth" ? Number(e.target.value) : selected.dimensions.depth
                          )
                        }
                        className="w-full bg-slate-700 text-slate-200 rounded px-2 py-1 text-sm border border-slate-600 focus:border-orange-400 focus:outline-none transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {selected.type === "softpad" && (
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">
                  缓冲范围 ({selected.unit})
                </label>
                <input
                  type="number"
                  value={selected.bufferZone}
                  onChange={(e) => updateBufferZone(selected.id, Number(e.target.value))}
                  className="w-full bg-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-sm border border-slate-600 focus:border-orange-400 focus:outline-none transition-colors"
                />
              </div>
            )}

            {selected.type !== "softpad" && selected.type !== "supervisor" && (
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">
                  顶部高度
                </label>
                <div className={`text-sm font-mono px-2.5 py-1.5 rounded ${
                  toCm(selected.position.y + selected.dimensions.height, selected.unit) > maxHeight
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-slate-700 text-slate-300 border border-slate-600"
                }`}>
                  {(toCm(selected.position.y + selected.dimensions.height, selected.unit)).toFixed(0)} cm
                  {toCm(selected.position.y + selected.dimensions.height, selected.unit) > maxHeight && (
                    <span className="ml-2 text-red-400">⚠ 超标</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 text-sm text-center px-4">
            点击场景中的部件<br />查看和编辑属性
          </p>
        </div>
      )}
    </div>
  );
}
