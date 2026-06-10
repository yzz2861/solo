import { Fence, Users, ArrowUpDown, MousePointer, Eraser } from "lucide-react"
import { useGameStore } from "@/store/gameStore"
import { GameTool } from "@/types"

const tools: Array<{ id: GameTool; label: string; icon: typeof Fence; desc: string }> = [
  { id: "select", label: "选择", icon: MousePointer, desc: "查看地图" },
  { id: "fence", label: "围栏", icon: Fence, desc: "放置/移除围栏" },
  { id: "guide", label: "引导员", icon: Users, desc: "部署/撤回引导员" },
  { id: "escalator", label: "扶梯", icon: ArrowUpDown, desc: "开关扶梯" },
  { id: "erase", label: "擦除", icon: Eraser, desc: "移除围栏/引导员" },
]

export default function ToolPanel() {
  const selectedTool = useGameStore(s => s.selectedTool)
  const setSelectedTool = useGameStore(s => s.setSelectedTool)
  const fences = useGameStore(s => s.fences)
  const guides = useGameStore(s => s.guides)
  const level = useGameStore(s => s.level)

  return (
    <div className="flex w-16 flex-col gap-1 border-r border-white/10 bg-[#141830] p-2">
      {tools.map(tool => {
        const Icon = tool.icon
        const active = selectedTool === tool.id
        return (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
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
      <div className="mt-auto border-t border-white/5 pt-2 text-center">
        <div className="text-[10px] text-gray-600">
          <span className="text-[#ff6b6b]">{fences.length}</span>/{level?.maxFences || 0}
        </div>
        <div className="text-[10px] text-gray-600">
          <span className="text-[#00cc66]">{guides.length}</span>/{level?.maxGuides || 0}
        </div>
      </div>
    </div>
  )
}
