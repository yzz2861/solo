import { useEffect } from "react"
import { AlertTriangle, X } from "lucide-react"
import { useGameStore } from "@/store/gameStore"

export default function EventBanner() {
  const messages = useGameStore(s => s.eventMessages)

  if (messages.length === 0) return null

  const latest = messages[messages.length - 1]

  return (
    <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 animate-slide-down">
      <div className="flex items-center gap-2 rounded-lg bg-[#ff4444] px-4 py-2 text-sm font-medium text-white shadow-lg">
        <AlertTriangle className="h-4 w-4" />
        {latest.message}
      </div>
    </div>
  )
}
