import { useEffect, useState } from "react"
import { BarChart3, Trash2 } from "lucide-react"
import { useScoreStore } from "@/store/scoreStore"
import { getAllLevels } from "@/utils/levelPresets"
import RecordList from "@/components/scores/RecordList"
import WeakPointRadar from "@/components/scores/WeakPointRadar"
import TrendChart from "@/components/scores/TrendChart"

export default function ScoresPage() {
  const records = useScoreStore(s => s.records)
  const loadRecords = useScoreStore(s => s.loadRecords)
  const clearRecords = useScoreStore(s => s.clearRecords)
  const getWeakPointSummary = useScoreStore(s => s.getWeakPointSummary)
  const [selectedLevelId, setSelectedLevelId] = useState<string>("all")

  useEffect(() => { loadRecords() }, [loadRecords])

  const levels = getAllLevels()
  const filteredRecords = selectedLevelId === "all"
    ? records
    : records.filter(r => r.levelId === selectedLevelId)
  const weakPoints = selectedLevelId !== "all" ? getWeakPointSummary(selectedLevelId) : []

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#457b9d]" />
          <h1 className="text-xl font-bold text-white">成绩管理</h1>
        </div>
        {records.length > 0 && (
          <button
            onClick={() => { if (confirm("确认清除所有训练记录？")) clearRecords() }}
            className="flex items-center gap-1 rounded-lg bg-red-400/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/20"
          >
            <Trash2 className="h-3 w-3" /> 清除全部
          </button>
        )}
      </div>

      <div className="mb-4">
        <select
          value={selectedLevelId}
          onChange={e => setSelectedLevelId(e.target.value)}
          className="rounded-lg bg-[#1a1f36] px-3 py-1.5 text-sm text-white border border-white/10"
        >
          <option value="all">全部关卡</option>
          {levels.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold text-white">训练记录</h2>
          <RecordList records={filteredRecords} />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="mb-2 text-sm font-bold text-white">得分趋势</h2>
            <TrendChart records={filteredRecords} />
          </div>
          {selectedLevelId !== "all" && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-2 text-sm font-bold text-white">薄弱点分析</h2>
              <WeakPointRadar weakPoints={weakPoints} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
