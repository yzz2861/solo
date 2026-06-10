import { useNavigate } from "react-router-dom"
import { Eye, Trash2 } from "lucide-react"
import { TrainingRecord } from "@/types"

interface Props {
  records: TrainingRecord[]
  onDelete?: (id: string) => void
}

export default function RecordList({ records, onDelete }: Props) {
  const navigate = useNavigate()

  if (records.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-600">暂无训练记录</div>
    )
  }

  return (
    <div className="space-y-2">
      {records.map(record => (
        <div
          key={record.id}
          className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 transition-colors hover:bg-white/8"
        >
          <div>
            <div className="text-sm font-medium text-white">{record.levelName}</div>
            <div className="text-[10px] text-gray-500">
              {record.playerName} · {new Date(record.completedAt).toLocaleString("zh-CN")}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-[#f4a261]">{record.score.toFixed(1)}</div>
              <div className="text-[10px] text-[#2a9d8f]">{(record.passedRate * 100).toFixed(0)}%通过</div>
            </div>
            <button
              onClick={() => navigate(`/replay/${record.id}`)}
              className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
              title="查看回放"
            >
              <Eye className="h-4 w-4" />
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(record.id)}
                className="rounded p-1.5 text-gray-400 hover:bg-red-400/10 hover:text-red-400"
                title="删除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
