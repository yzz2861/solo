import { useEditorStore } from "@/store/editorStore"
import { LevelEvent } from "@/types"

const EVENT_TYPES: Array<{ value: LevelEvent["type"]; label: string }> = [
  { value: "escalator_stop", label: "扶梯停运" },
  { value: "exit_close", label: "出口关闭" },
  { value: "passenger_surge", label: "客流突增" },
]

export default function EventConfig() {
  const level = useEditorStore(s => s.level)
  const addEvent = useEditorStore(s => s.addEvent)
  const updateEvent = useEditorStore(s => s.updateEvent)
  const removeEvent = useEditorStore(s => s.removeEvent)

  const handleAddEvent = () => {
    addEvent({
      id: `evt_${Date.now()}`,
      type: "escalator_stop",
      triggerTime: 30,
      params: {}
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">事件编排</h3>
        <button
          onClick={handleAddEvent}
          className="rounded bg-[#457b9d] px-2 py-0.5 text-xs text-white hover:bg-[#457b9d]/80"
        >
          添加事件
        </button>
      </div>
      {(level.events || []).map(evt => (
        <div key={evt.id} className="rounded-lg bg-white/5 p-2">
          <div className="mb-1 flex items-center justify-between">
            <select
              value={evt.type}
              onChange={e => updateEvent(evt.id, { type: e.target.value as LevelEvent["type"] })}
              className="rounded bg-[#1a1f36] px-1 py-0.5 text-xs text-white border border-white/10"
            >
              {EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button onClick={() => removeEvent(evt.id)} className="text-xs text-red-400 hover:text-red-300">删除</button>
          </div>
          <label className="flex items-center justify-between text-[10px] text-gray-500">
            <span>触发时间(秒)</span>
            <input
              type="number" min={5} max={level.timeLimit || 120}
              value={evt.triggerTime}
              onChange={e => updateEvent(evt.id, { triggerTime: parseInt(e.target.value) || 0 })}
              className="w-16 rounded bg-[#1a1f36] px-1 py-0.5 text-right text-xs text-white border border-white/10"
            />
          </label>
        </div>
      ))}
    </div>
  )
}
