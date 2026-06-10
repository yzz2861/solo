import { useEffect, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Star, Play, ChevronRight, TrendingUp } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useScoreStore } from "@/store/scoreStore"
import { getAllLevels } from "@/utils/levelPresets"
import { LevelConfig } from "@/types"

function DifficultyStars({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < level ? "fill-[#f4a261] text-[#f4a261]" : "text-gray-600"}`}
        />
      ))}
    </div>
  )
}

function LevelCard({ level, bestScore }: { level: LevelConfig; bestScore: number | null }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/game/${level.id}`)}
      className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-300 hover:scale-[1.02] hover:border-[#457b9d]/50 hover:bg-white/10 hover:shadow-lg hover:shadow-[#457b9d]/10"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">{level.stationName}</span>
        <DifficultyStars level={level.difficulty} />
      </div>
      <h3 className="mb-1 text-base font-bold text-white">{level.name}</h3>
      <div className="mb-3 flex items-center gap-3 text-xs text-gray-500">
        <span>{level.gridSize.cols}×{level.gridSize.rows} 网格</span>
        <span>{level.timeLimit}秒</span>
        <span>{level.entrances.length}入口</span>
        <span>{level.exits.length}出口</span>
      </div>
      {bestScore !== null && (
        <div className="flex items-center gap-1 text-xs text-[#2a9d8f]">
          <TrendingUp className="h-3 w-3" />
          最高分: {bestScore}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <span className="flex items-center gap-1 text-xs text-[#457b9d] opacity-0 transition-opacity group-hover:opacity-100">
          开始调度 <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  )
}

export default function HomePage() {
  const records = useScoreStore(s => s.records)
  const loadRecords = useScoreStore(s => s.loadRecords)
  const navigate = useNavigate()

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const levels = getAllLevels()

  const bestScores = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of records) {
      const current = map.get(r.levelId)
      if (current === undefined || r.score > current) {
        map.set(r.levelId, r.score)
      }
    }
    return map
  }, [records])

  const recentScores = useMemo(() => (
    records.slice(-10).map(r => ({
      time: new Date(r.completedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
      score: r.score
    }))
  ), [records])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-12 text-center">
        <h1 className="mb-3 text-4xl font-bold">
          <span className="bg-gradient-to-r from-[#457b9d] via-[#2a9d8f] to-[#e63946] bg-clip-text text-transparent">
            地铁换乘拥堵调度
          </span>
        </h1>
        <p className="text-gray-400">
          设置围栏、开关扶梯、部署引导员 — 让客流在限定时间内安全通过换乘大厅
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">选择关卡</h2>
            <Link
              to="/editor"
              className="flex items-center gap-1 text-sm text-[#457b9d] hover:text-[#2a9d8f]"
            >
              自定义关卡 <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {levels.map(level => (
              <LevelCard
                key={level.id}
                level={level}
                bestScore={bestScores.get(level.id) ?? null}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-bold text-white">成绩概览</h2>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-sm text-gray-400">最近训练得分</div>
            {recentScores.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={recentScores}>
                  <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#1a1f36", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    labelStyle={{ color: "#9ca3af" }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#457b9d" strokeWidth={2} dot={{ fill: "#457b9d", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[180px] items-center justify-center text-sm text-gray-600">
                暂无训练记录
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
              <span className="text-xs text-gray-500">总训练次数</span>
              <span className="text-sm font-bold text-white">{records.length}</span>
            </div>
            <button
              onClick={() => navigate("/scores")}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-white/5 py-2 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              查看全部成绩 <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
