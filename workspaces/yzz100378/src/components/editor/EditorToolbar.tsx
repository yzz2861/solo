import { Square, DoorOpen, LogOut, ArrowUpDown, Diamond, MousePointer, Eraser } from "lucide-react"
import { useEditorStore } from "@/store/editorStore"
import { EditorTool } from "@/types"

const tools: Array<{ id: EditorTool; label: string; icon: typeof Square; desc: string }> = [
  { id: "select", label: "选择", icon: MousePointer, desc: "选择元素" },
  { id: "wall", label: "墙壁", icon: Square, desc: "放置/移除墙壁" },
  { id: "entrance", label: "入口", icon: DoorOpen, desc: "放置入口" },
  { id: "exit", label: "出口", icon: LogOut, desc: "放置出口" },
  { id: "escalator", label: "扶梯", icon: ArrowUpDown, desc: "放置扶梯" },
  { id: "transfer", label: "换乘口", icon: Diamond, desc: "放置换乘口" },
  { id: "erase", label: "擦除", icon: Eraser, desc: "擦除元素" },
]

export default function EditorToolbar() {
  const selectedTool = useEditorStore(s => s.selectedTool)
  const setTool = useEditorStore(s => s.setTool)

  return (
    <div className="flex w-16 flex-col gap-1 border-r border-white/10 bg-[#141830] p-2">
      {tools.map(tool => {
        const Icon = tool.icon
        const active = selectedTool === tool.id
        return (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            title={tool.desc}
            className={`flex flex-col items-center gap-0.5 rounded-lg p-2 text-xs transition-all duration-200 ${
              active
                ? "bg-[#457b9d]/20 text-[#457b9d]"
                : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">{tool.label}</span>
          </button>
        )
      })}
    </div>
  )
}
