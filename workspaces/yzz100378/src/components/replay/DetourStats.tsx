import { TrainingRecord } from "@/types"

interface Props {
  record: TrainingRecord
}

export default function DetourStats({ record }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-sm font-bold text-white">绕行统计</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">平均绕行距离</span>
          <span className="text-[#ffaa00]">{record.avgDetourDistance.toFixed(1)} 格</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">平均拥堵时间</span>
          <span className="text-[#ff4444]">{record.avgCongestionTime.toFixed(1)} 秒</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">通过率</span>
          <span className="text-[#2a9d8f]">{(record.passedRate * 100).toFixed(0)}%</span>
        </div>
      </div>
      {record.weakPoints.length > 0 && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <h4 className="mb-2 text-xs font-medium text-gray-300">拥堵热点</h4>
          {record.weakPoints.sort((a, b) => b.congestionOccurrences - a.congestionOccurrences).map(wp => (
            <div key={wp.transferPointId} className="flex items-center justify-between text-[10px]">
              <span className="text-gray-400">{wp.transferPointLabel}</span>
              <div className="flex items-center gap-2">
                <span className="text-[#ff4444]">{wp.congestionOccurrences}次</span>
                <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#ff4444]"
                    style={{ width: `${Math.min(100, wp.congestionOccurrences * 10)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
