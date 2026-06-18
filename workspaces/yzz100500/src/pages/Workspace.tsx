import { useStore } from '@/store'
import Scene3D from '@/components/Scene3D'
import ComponentTree from '@/components/ComponentTree'
import InfoPanel from '@/components/InfoPanel'
import { Bell, Download, RotateCcw, Users } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Workspace() {
  const navigate = useNavigate()
  const location = useLocation()
  const alerts = useStore((s) => s.alerts)
  const project = useStore((s) => s.project)
  const unresolvedCount = alerts.filter((a) => !a.resolved).length

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-ink-900">
      <header className="h-12 flex items-center justify-between px-4 glass-panel border-b border-ink-700/50 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sandalwood-700 flex items-center justify-center">
            <span className="text-sandalwood-100 font-serif font-bold text-sm">古</span>
          </div>
          <div>
            <h1 className="text-sm font-serif font-semibold text-sandalwood-200 leading-tight">
              {project?.name || '古建筑梁架标注系统'}
            </h1>
            <p className="text-xs text-ink-400 leading-tight">{project?.description?.slice(0, 30) || ''}</p>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          <button
            onClick={() => navigate('/alerts')}
            className={`relative px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
              location.pathname === '/alerts'
                ? 'bg-cinnabar-600/20 text-cinnabar-300'
                : 'text-ink-300 hover:bg-ink-700 hover:text-ink-100'
            }`}
          >
            <Bell size={16} />
            <span>提示</span>
            {unresolvedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-cinnabar-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse-slow">
                {unresolvedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/export')}
            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
              location.pathname === '/export'
                ? 'bg-sandalwood-700/30 text-sandalwood-300'
                : 'text-ink-300 hover:bg-ink-700 hover:text-ink-100'
            }`}
          >
            <Download size={16} />
            <span>导出</span>
          </button>
          <button
            onClick={() => navigate('/review')}
            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
              location.pathname === '/review'
                ? 'bg-celadon-400/20 text-celadon-300'
                : 'text-ink-300 hover:bg-ink-700 hover:text-ink-100'
            }`}
          >
            <RotateCcw size={16} />
            <span>复查</span>
          </button>
          <button
            onClick={() => navigate('/expert')}
            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
              location.pathname === '/expert'
                ? 'bg-sandalwood-400/20 text-sandalwood-300'
                : 'text-ink-300 hover:bg-ink-700 hover:text-ink-100'
            }`}
          >
            <Users size={16} />
            <span>评审</span>
          </button>
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ComponentTree />
        <main className="flex-1 relative">
          <Scene3D />
        </main>
        <InfoPanel />
      </div>
    </div>
  )
}
