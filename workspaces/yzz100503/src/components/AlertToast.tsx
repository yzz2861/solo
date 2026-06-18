import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { X, Bell } from 'lucide-react'
import type { Alert } from '@/types'

export default function AlertToast() {
  const { alerts, markAlertRead } = useAppStore()
  const [visibleAlerts, setVisibleAlerts] = useState<Alert[]>([])

  useEffect(() => {
    const unread = alerts.filter((a) => !a.read).slice(0, 3)
    setVisibleAlerts(unread)
  }, [alerts])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'path_invalid':
      case 'transcription_interrupted':
        return 'from-red-500 to-red-600'
      case 'duplicate_tape':
      case 'unconfirmed_format':
        return 'from-yellow-500 to-yellow-600'
      default:
        return 'from-blue-500 to-blue-600'
    }
  }

  if (visibleAlerts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-80">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-slide-up"
          onClick={() => markAlertRead(alert.id)}
        >
          <div className={`h-1 bg-gradient-to-r ${getTypeColor(alert.type)}`}></div>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getTypeColor(
                  alert.type
                )} flex items-center justify-center flex-shrink-0`}
              >
                <Bell className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-800 text-sm">{alert.title}</h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      markAlertRead(alert.id)
                    }}
                    className="text-gray-300 hover:text-gray-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{alert.message}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
