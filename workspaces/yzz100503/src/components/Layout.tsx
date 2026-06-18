import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  Users,
  Video,
  Scissors,
  Bell,
  Settings,
  ChevronRight,
  Package,
  UserCheck,
  Play
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { currentRole, setCurrentRole, alerts } = useAppStore()
  const [showAlerts, setShowAlerts] = useState(false)

  const unreadCount = alerts.filter((a) => !a.read).length

  const roles = [
    { key: 'reception', label: '前台工作台', icon: Users },
    { key: 'editor', label: '剪辑师工作台', icon: Scissors },
    { key: 'customer', label: '客户预览', icon: Play }
  ]

  return (
    <div className="flex h-full w-full bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-warm-500 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">影像转录柜</h1>
              <p className="text-xs text-gray-500">家庭影像数字化管理</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          <p className="text-xs font-medium text-gray-400 px-3 py-2 uppercase tracking-wider">
            角色切换
          </p>
          {roles.map((role) => {
            const Icon = role.icon
            const isActive = currentRole === role.key
            return (
              <button
                key={role.key}
                onClick={() => setCurrentRole(role.key as any)}
                className={`sidebar-item w-full text-left ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{role.label}</span>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </button>
            )
          })}
        </div>

        <div className="p-3 border-t border-gray-100 space-y-1">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="sidebar-item w-full text-left relative"
          >
            <Bell className="w-5 h-5" />
            <span className="flex-1">提醒通知</span>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="sidebar-item cursor-default opacity-60">
            <Settings className="w-5 h-5" />
            <span>设置</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {roles.find((r) => r.key === currentRole)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Package className="w-4 h-4" />
              <span>
                {useAppStore.getState().tapes.length} 盘磁带
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <UserCheck className="w-4 h-4" />
              <span>
                {useAppStore.getState().customers.length} 位客户
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">{children}</div>
      </main>

      {showAlerts && (
        <AlertPanel onClose={() => setShowAlerts(false)} />
      )}
    </div>
  )
}

function AlertPanel({ onClose }: { onClose: () => void }) {
  const { alerts, markAlertRead, clearAlert, markAllAlertsRead } = useAppStore()

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'path_invalid':
        return <span className="text-red-500">⚠️</span>
      case 'duplicate_tape':
        return <span className="text-yellow-500">📼</span>
      case 'transcription_interrupted':
        return <span className="text-red-500">⏸️</span>
      case 'unconfirmed_format':
        return <span className="text-yellow-500">📝</span>
      default:
        return <span className="text-blue-500">ℹ️</span>
    }
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">提醒通知</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllAlertsRead}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            全部已读
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">暂无提醒</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 hover:bg-gray-50 ${!alert.read ? 'bg-primary-50/30' : ''}`}
                onClick={() => markAlertRead(alert.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-lg">{getTypeIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm">{alert.title}</div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{alert.message}</p>
                    <div className="text-xs text-gray-400 mt-2">
                      {new Date(alert.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      clearAlert(alert.id)
                    }}
                    className="text-gray-300 hover:text-gray-500"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
