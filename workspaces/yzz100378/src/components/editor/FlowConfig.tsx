import { useEditorStore } from "@/store/editorStore"

export default function FlowConfig() {
  const level = useEditorStore(s => s.level)
  const updateEntrance = useEditorStore(s => s.updateEntrance)
  const removeEntrance = useEditorStore(s => s.removeEntrance)
  const removeExit = useEditorStore(s => s.removeExit)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-white">入口配置</h3>
      {(level.entrances || []).map(ent => (
        <div key={ent.id} className="rounded-lg bg-white/5 p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: ent.color }}>{ent.label}</span>
            <button onClick={() => removeEntrance(ent.id)} className="text-xs text-red-400 hover:text-red-300">删除</button>
          </div>
          <div className="space-y-1">
            <label className="flex items-center justify-between text-[10px] text-gray-500">
              <span>客流密度</span>
              <input
                type="range" min={0.5} max={5} step={0.5}
                value={ent.passengerRate}
                onChange={e => updateEntrance(ent.id, { passengerRate: parseFloat(e.target.value) })}
                className="w-20"
              />
              <span className="w-6 text-right">{ent.passengerRate}</span>
            </label>
            <label className="flex items-center justify-between text-[10px] text-gray-500">
              <span>目标出口</span>
              <span className="text-[10px]">{ent.destinationIds.length}个</span>
            </label>
          </div>
        </div>
      ))}

      <h3 className="mt-4 text-sm font-bold text-white">出口配置</h3>
      {(level.exits || []).map(ext => (
        <div key={ext.id} className="flex items-center justify-between rounded-lg bg-white/5 p-2">
          <span className="text-xs font-medium" style={{ color: ext.color }}>{ext.label}</span>
          <button onClick={() => removeExit(ext.id)} className="text-xs text-red-400 hover:text-red-300">删除</button>
        </div>
      ))}
    </div>
  )
}
