import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useScoreStore } from "@/store/scoreStore"
import { getAllLevels } from "@/utils/levelPresets"
import ReplayPlayer from "@/components/replay/ReplayPlayer"
import DetourStats from "@/components/replay/DetourStats"

export default function ReplayPage() {
  const { recordId } = useParams()
  const navigate = useNavigate()
  const records = useScoreStore(s => s.records)
  const loadRecords = useScoreStore(s => s.loadRecords)
  const level = useScoreStore(s => {
    const record = records.find(r => r.id === recordId)
    if (!record) return null
    return getAllLevels().find(l => l.id === record.levelId) || null
  })

  const record = records.find(r => r.id === recordId)

  if (!record || !level) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-gray-500">未找到回放记录</p>
          <button onClick={() => navigate("/scores")} className="text-sm text-[#457b9d] hover:underline">
            返回成绩列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">回放分析</h1>
          <p className="text-xs text-gray-500">{record.levelName} · {record.playerName} · {new Date(record.completedAt).toLocaleString("zh-CN")}</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-bold text-[#f4a261]">{record.score.toFixed(1)}</div>
          <div className="text-[10px] text-gray-500">最终得分</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReplayPlayer frames={record.replayFrames} level={level} />
        </div>
        <div>
          <DetourStats record={record} />
        </div>
      </div>
    </div>
  )
}
