import { Phone, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

interface CallStatusBarProps {
  startTime: number
  scenarioTitle: string
}

export default function CallStatusBar({ startTime, scenarioTitle }: CallStatusBarProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const padded = (n: number) => n.toString().padStart(2, '0')

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#0a1e30] to-[#0F2A44] border-b border-[#1a3a54]">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-red-500/20">
          <Phone className="w-5 h-5 text-red-400" />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
        <div>
          <div className="text-white text-sm font-medium">{scenarioTitle}</div>
          <div className="text-[#667788] text-xs">模拟通话中</div>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-[#1a3a54] px-4 py-2 rounded-xl">
        <Clock className="w-4 h-4 text-[#FF6B35]" />
        <span className="text-[#FF6B35] font-mono text-lg font-bold">
          {padded(minutes)}:{padded(seconds)}
        </span>
      </div>
    </div>
  )
}
