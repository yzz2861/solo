import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts"
import { TrainingRecord } from "@/types"

interface Props {
  records: TrainingRecord[]
}

export default function TrendChart({ records }: Props) {
  if (records.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-gray-600">
        暂无趋势数据
      </div>
    )
  }

  const data = records.map(r => ({
    time: new Date(r.completedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
    score: r.score
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 10 }} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: "#1a1f36", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
        />
        <Line type="monotone" dataKey="score" stroke="#457b9d" strokeWidth={2} dot={{ fill: "#457b9d", r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
