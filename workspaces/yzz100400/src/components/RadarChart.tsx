interface RadarChartProps {
  scores: {
    rescueEfficiency: number
    resourceUtilization: number
    riskControl: number
    speed: number
    decision: number
  }
  size?: number
}

const AXES = [
  { key: 'rescueEfficiency', label: '救援效率', angle: -90 },
  { key: 'resourceUtilization', label: '资源利用', angle: -90 + 72 },
  { key: 'riskControl', label: '风险控制', angle: -90 + 144 },
  { key: 'speed', label: '速度', angle: -90 + 216 },
  { key: 'decision', label: '决策', angle: -90 + 288 },
] as const

const GRID_LEVELS = [0.25, 0.5, 0.75, 1]

export default function RadarChart({ scores, size = 280 }: RadarChartProps) {
  const center = size / 2
  const radius = size * 0.36

  const polarToCartesian = (angleDeg: number, r: number) => {
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    }
  }

  const pentagonPoints = (level: number) => {
    return AXES.map((axis) => {
      const pt = polarToCartesian(axis.angle, radius * level)
      return `${pt.x},${pt.y}`
    }).join(' ')
  }

  const scorePoints = AXES.map((axis) => {
    const value = (scores[axis.key] ?? 0) / 100
    const clamped = Math.max(0, Math.min(1, value))
    return polarToCartesian(axis.angle, radius * clamped)
  })

  const scorePolygon = scorePoints.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {GRID_LEVELS.map((level) => (
        <polygon
          key={level}
          points={pentagonPoints(level)}
          fill="none"
          stroke="rgba(0, 201, 167, 0.15)"
          strokeWidth={1}
        />
      ))}

      {AXES.map((axis) => {
        const end = polarToCartesian(axis.angle, radius)
        return (
          <line
            key={axis.key}
            x1={center}
            y1={center}
            x2={end.x}
            y2={end.y}
            stroke="rgba(0, 201, 167, 0.2)"
            strokeWidth={1}
          />
        )
      })}

      <polygon
        points={scorePolygon}
        fill="rgba(0, 201, 167, 0.2)"
        stroke="var(--tide-teal)"
        strokeWidth={2}
      />

      {scorePoints.map((pt, i) => (
        <circle
          key={i}
          cx={pt.x}
          cy={pt.y}
          r={4}
          fill="var(--tide-teal)"
          stroke="rgba(0, 201, 167, 0.5)"
          strokeWidth={1}
        />
      ))}

      {AXES.map((axis, i) => {
        const labelPos = polarToCartesian(axis.angle, radius + 22)
        return (
          <text
            key={axis.key}
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--text-secondary)"
            fontSize={12}
            fontWeight={500}
          >
            {axis.label}
          </text>
        )
      })}
    </svg>
  )
}
