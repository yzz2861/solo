import { useNavigate } from "react-router-dom"
import { useState } from "react"
import RadarChart from "@/components/RadarChart"
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  ArrowLeft,
} from "lucide-react"
import type { ReplaySession } from "@/types/game"
import { levels } from "@/data/levels"

function loadSessions(): ReplaySession[] {
  try {
    const raw = localStorage.getItem("tidal-rescue-replays")
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default function Report() {
  const navigate = useNavigate()
  const [sessions] = useState<ReplaySession[]>(loadSessions)

  if (sessions.length === 0) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-4"
        style={{ background: "var(--ocean-deep)" }}
      >
        <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
          暂无训练记录
        </p>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: "var(--tide-teal)" }}
        >
          <ArrowLeft size={16} />
          返回
        </button>
      </div>
    )
  }

  const totalSessions = sessions.length
  const averageScore =
    sessions.reduce((sum, s) => sum + s.score.total, 0) / totalSessions
  const bestScore = Math.max(...sessions.map((s) => s.score.total))
  const maxScoreForChart = Math.max(bestScore, 1)

  const missedWindowCounts: Record<string, number> = {}
  for (const session of sessions) {
    for (const w of session.missedWindows) {
      const key = w.description
      missedWindowCounts[key] = (missedWindowCounts[key] ?? 0) + 1
    }
  }
  const commonMistakes = Object.entries(missedWindowCounts)
    .sort((a, b) => b[1] - a[1])

  const avgHighRisk =
    sessions.reduce((sum, s) => sum + s.resourceAnalysis.highRiskDispatchRatio, 0) /
    totalSessions
  const avgLowRisk =
    sessions.reduce((sum, s) => sum + s.resourceAnalysis.lowRiskDispatchRatio, 0) /
    totalSessions

  const allIdleTurns: Record<string, number> = {}
  for (const session of sessions) {
    for (const [boatId, idle] of Object.entries(session.resourceAnalysis.idleTurns)) {
      allIdleTurns[boatId] = (allIdleTurns[boatId] ?? 0) + idle
    }
  }
  const underutilizedBoat = Object.entries(allIdleTurns).sort(
    (a, b) => b[1] - a[1]
  )

  const avgResponseTime =
    sessions.reduce((sum, s) => sum + s.resourceAnalysis.averageResponseTime, 0) /
    totalSessions

  const avgScores = {
    rescueEfficiency:
      sessions.reduce((s, sess) => s + sess.score.rescueEfficiency, 0) / totalSessions,
    resourceUtilization:
      sessions.reduce((s, sess) => s + sess.score.resourceUtilization, 0) / totalSessions,
    riskControl:
      sessions.reduce((s, sess) => s + sess.score.riskControl, 0) / totalSessions,
    speed:
      sessions.reduce((s, sess) => s + sess.score.speed, 0) / totalSessions,
    decision:
      sessions.reduce((s, sess) => s + sess.score.decision, 0) / totalSessions,
    total: averageScore,
  }

  return (
    <div
      className="min-h-screen overflow-y-auto"
      style={{ background: "var(--ocean-deep)" }}
    >
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="glass-panel flex items-center justify-between px-6 py-4">
          <h1
            className="font-display text-xl tracking-wider"
            style={{ color: "var(--tide-teal)" }}
          >
            训练报告总览
          </h1>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={16} />
            返回
          </button>
        </div>

        <div className="glass-panel px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} style={{ color: "var(--tide-teal)" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              整体统计
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div
                className="text-3xl font-display font-bold"
                style={{ color: "var(--tide-teal)" }}
              >
                {totalSessions}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                总场次
              </div>
            </div>
            <div className="text-center">
              <div
                className="text-3xl font-display font-bold"
                style={{ color: "var(--tide-teal)" }}
              >
                {averageScore.toFixed(0)}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                平均得分
              </div>
            </div>
            <div className="text-center">
              <div
                className="text-3xl font-display font-bold"
                style={{ color: "var(--safe-green)" }}
              >
                {bestScore.toFixed(0)}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                最高得分
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} style={{ color: "var(--tide-teal)" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              得分趋势
            </h2>
          </div>
          <div className="flex items-end gap-2 h-32">
            {sessions.map((session, i) => {
              const heightPct = (session.score.total / maxScoreForChart) * 100
              return (
                <div
                  key={session.id}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {session.score.total.toFixed(0)}
                  </span>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${Math.max(heightPct, 4)}%`,
                      background:
                        session.score.total === bestScore
                          ? "var(--safe-green)"
                          : "var(--tide-teal)",
                      opacity: 0.7 + 0.3 * (heightPct / 100),
                    }}
                  />
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {i + 1}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="glass-panel px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} style={{ color: "var(--warning-amber)" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              常见失误
            </h2>
          </div>
          {commonMistakes.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              暂无失误记录
            </p>
          ) : (
            <div className="space-y-2">
              {commonMistakes.map(([desc, count]) => (
                <div
                  key={desc}
                  className="flex items-center gap-3 py-1.5 px-3 rounded-lg"
                  style={{ background: "rgba(14, 42, 71, 0.6)" }}
                >
                  <span
                    className="text-xs font-mono"
                    style={{ color: "var(--danger-coral)" }}
                  >
                    {count}次
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {desc}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} style={{ color: "var(--tide-teal)" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              资源分析
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                平均风险派遣比例
              </div>
              <div
                className="flex h-4 rounded-full overflow-hidden"
                style={{ background: "rgba(14, 42, 71, 0.6)" }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${avgHighRisk * 100}%`,
                    background: "var(--danger-coral)",
                  }}
                />
                <div
                  className="h-full"
                  style={{
                    width: `${avgLowRisk * 100}%`,
                    background: "var(--safe-green)",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px]" style={{ color: "var(--danger-coral)" }}>
                  高风险 {(avgHighRisk * 100).toFixed(0)}%
                </span>
                <span className="text-[10px]" style={{ color: "var(--safe-green)" }}>
                  低风险 {(avgLowRisk * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                最闲置船只
              </div>
              {underutilizedBoat.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  无数据
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {underutilizedBoat.map(([boatId, idle]) => (
                    <div
                      key={boatId}
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        background: "rgba(14, 42, 71, 0.6)",
                        color:
                          idle > 6
                            ? "var(--warning-amber)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {boatId}: {idle} 回合空闲
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  平均响应时间
                </span>
              </div>
              <span
                className="text-lg font-display font-bold"
                style={{ color: "var(--tide-teal)" }}
              >
                {avgResponseTime.toFixed(1)}
              </span>
              <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>
                回合
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            <RadarChart scores={avgScores} size={200} />
            <div className="flex flex-col justify-center py-4">
              <div
                className="text-2xl font-display font-bold"
                style={{ color: "var(--tide-teal)" }}
              >
                {avgScores.total.toFixed(0)}
              </div>
              <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                平均总分
              </div>
              <div className="mt-3 space-y-1.5">
                {[
                  { label: "救援效率", value: avgScores.rescueEfficiency },
                  { label: "资源利用", value: avgScores.resourceUtilization },
                  { label: "风险控制", value: avgScores.riskControl },
                  { label: "速度", value: avgScores.speed },
                  { label: "决策", value: avgScores.decision },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
                    <div
                      className="flex-1 h-1.5 rounded-full"
                      style={{ background: "rgba(0, 201, 167, 0.15)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(item.value, 100)}%`,
                          background: "var(--tide-teal)",
                        }}
                      />
                    </div>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {item.value.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} style={{ color: "var(--tide-teal)" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              训练记录
            </h2>
          </div>
          <div className="space-y-2">
            {sessions.map((session) => {
              const levelName =
                levels.find((l) => l.id === session.levelId)?.name ??
                session.levelId
              const date = new Date(session.endTime).toLocaleDateString("zh-CN", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg"
                  style={{ background: "rgba(14, 42, 71, 0.6)" }}
                >
                  <div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {levelName}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {date}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className="font-display font-bold"
                      style={{ color: "var(--tide-teal)" }}
                    >
                      {session.score.total.toFixed(0)}
                    </span>
                    <button
                      onClick={() => navigate(`/replay/${session.id}`)}
                      className="text-xs px-2 py-1 rounded transition-colors hover:bg-white/10"
                      style={{ color: "var(--tide-teal)" }}
                    >
                      查看复盘
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
