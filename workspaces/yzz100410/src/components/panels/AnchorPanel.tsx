import { Anchor, Waves, Trash2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import type { AnchorPoint } from "@/types";

export default function AnchorPanel() {
  const anchors = useStore((s) => s.anchors);
  const selectedAnchorId = useStore((s) => s.selectedAnchorId);
  const addAnchor = useStore((s) => s.addAnchor);
  const removeAnchor = useStore((s) => s.removeAnchor);
  const updateAnchor = useStore((s) => s.updateAnchor);
  const setSelectedAnchor = useStore((s) => s.setSelectedAnchor);

  const selectedAnchor = anchors.find((a) => a.id === selectedAnchorId);

  const createAnchor = (type: AnchorPoint["type"]) => {
    const offset = anchors.length * 3;
    const anchor: AnchorPoint = {
      id: crypto.randomUUID(),
      type,
      position: type === "shore" ? [offset, 0, -5] as [number, number, number] : [offset, 0, 5] as [number, number, number],
      ropeLength: 10,
    };
    addAnchor(anchor);
    setSelectedAnchor(anchor.id);
  };

  const posField = (label: string, index: number, value: number) => (
    <div className="flex-1">
      <label className="text-[10px] opacity-50">{label}</label>
      <input
        type="number"
        step={0.1}
        value={value}
        onChange={(e) => {
          if (!selectedAnchor) return;
          const pos = [...selectedAnchor.position] as [number, number, number];
          pos[index] = Number(e.target.value);
          updateAnchor(selectedAnchor.id, { position: pos });
        }}
        className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm font-mono outline-none"
      />
    </div>
  );

  return (
    <div className="bg-[#0A2540] text-white p-4 rounded-lg w-72 flex flex-col gap-3 overflow-y-auto max-h-screen">
      <h2 className="text-sm font-semibold tracking-wide uppercase opacity-70">锚点管理</h2>

      <div className="flex flex-col gap-2">
        {anchors.map((anchor) => (
          <div
            key={anchor.id}
            onClick={() => setSelectedAnchor(anchor.id)}
            className={`flex items-center gap-2 border rounded-lg p-2.5 cursor-pointer transition ${
              anchor.id === selectedAnchorId
                ? "border-[#00D4AA] bg-[#00D4AA]/10"
                : "border-white/10 hover:border-white/20"
            }`}
          >
            {anchor.type === "shore" ? (
              <Anchor size={16} className="text-[#00D4AA] shrink-0" />
            ) : (
              <Waves size={16} className="text-blue-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">
                {anchor.type === "shore" ? "岸锚" : "水锚"}
              </div>
              <div className="text-[10px] opacity-50 font-mono truncate">
                ({anchor.position[0].toFixed(1)}, {anchor.position[1].toFixed(1)}, {anchor.position[2].toFixed(1)})
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeAnchor(anchor.id);
                if (anchor.id === selectedAnchorId) setSelectedAnchor(null);
              }}
              className="text-[#FF6B35] hover:brightness-125 p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {anchors.length === 0 && (
          <div className="text-xs opacity-40 text-center py-4">暂无锚点</div>
        )}
      </div>

      {selectedAnchor && (
        <div className="border border-white/10 rounded-lg p-3 flex flex-col gap-2">
          <div className="text-xs font-semibold opacity-70">锚点详情</div>

          <div className="flex gap-1">
            <button
              onClick={() => updateAnchor(selectedAnchor.id, { type: "shore" })}
              className={`flex-1 text-xs py-1.5 rounded-md transition ${
                selectedAnchor.type === "shore"
                  ? "bg-[#00D4AA] text-[#0A2540]"
                  : "bg-white/5 opacity-60"
              }`}
            >
              岸锚
            </button>
            <button
              onClick={() => updateAnchor(selectedAnchor.id, { type: "water" })}
              className={`flex-1 text-xs py-1.5 rounded-md transition ${
                selectedAnchor.type === "water"
                  ? "bg-blue-500 text-white"
                  : "bg-white/5 opacity-60"
              }`}
            >
              水锚
            </button>
          </div>

          <div className="flex gap-2">
            {posField("X", 0, selectedAnchor.position[0])}
            {posField("Y", 1, selectedAnchor.position[1])}
            {posField("Z", 2, selectedAnchor.position[2])}
          </div>

          <div>
            <label className="text-[10px] opacity-50">绳索长度</label>
            <input
              type="number"
              min={1}
              step={0.5}
              value={selectedAnchor.ropeLength}
              onChange={(e) =>
                updateAnchor(selectedAnchor.id, { ropeLength: Number(e.target.value) })
              }
              className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm font-mono outline-none"
            />
          </div>

          {selectedAnchor.restrictedZone && (
            <div className="text-xs text-red-400 bg-red-500/10 rounded-md px-2 py-1.5">
              ⚠ 限制区域: {selectedAnchor.restrictedZone.reason}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => createAnchor("shore")}
          className="flex-1 flex items-center justify-center gap-1 bg-[#00D4AA] text-[#0A2540] text-xs font-semibold py-2 rounded-md hover:brightness-110 transition"
        >
          <Anchor size={14} />
          添加岸锚
        </button>
        <button
          onClick={() => createAnchor("water")}
          className="flex-1 flex items-center justify-center gap-1 bg-blue-500 text-white text-xs font-semibold py-2 rounded-md hover:brightness-110 transition"
        >
          <Waves size={14} />
          添加水锚
        </button>
      </div>
    </div>
  );
}
