import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts"
import { WeakPoint } from "@/types"

interface Props {
  weakPoints: WeakPoint[]
}

export default function WeakPointRadar({ weakPoints }: Props) {
  if (weakPoints.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-gray-600">
        暂无薄弱点数据
      </div>
    )
  }

  const data = weakPoints.map(wp => ({
    name: wp.transferPointLabel,
    value: wp.congestionOccurrences,
    fullMark: Math.max(...weakPoints.map(w => w.congestionOccurrences), 5)
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} />
        <Radar dataKey="value" stroke="#ff4444" fill="#ff4444" fillOpacity={0.2} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
