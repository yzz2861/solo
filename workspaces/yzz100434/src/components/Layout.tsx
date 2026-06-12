import { useState, useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { Calendar, FileCheck, AlertTriangle, FileX } from 'lucide-react'
import { useAuditStore } from '@/store/auditStore'
import Sidebar from '@/components/Sidebar'
import { cn } from '@/lib/utils'

export default function Layout() {
  const { session, setSessionName, setAuditDate } = useAuditStore()
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(session.name)
  const stats = useMemo(() => {
    const c = session.checklist
    const total = c.length
    const existing = c.filter((i) => i.status === 'existing').length
    const missing = c.filter((i) => i.status === 'missing').length
    const expired = c.filter((i) => i.status === 'expired').length
    const completionRate = total > 0 ? Math.round((existing / total) * 100) : 0
    return { total, existing, missing, expired, completionRate }
  }, [session.checklist])

  const handleNameBlur = () => {
    setEditingName(false)
    if (nameValue.trim()) {
      setSessionName(nameValue.trim())
    } else {
      setNameValue(session.name)
    }
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameBlur()
    if (e.key === 'Escape') {
      setNameValue(session.name)
      setEditingName(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#1C1C1E] text-[#FAFAFA] overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-zinc-800 bg-[#1C1C1E] px-6 py-3">
          <div className="flex items-center gap-4">
            {editingName ? (
              <input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                autoFocus
                className="rounded bg-zinc-800 px-2 py-1 text-sm text-[#FAFAFA] outline-none ring-1 ring-amber-500 focus:ring-2"
              />
            ) : (
              <button
                onClick={() => {
                  setNameValue(session.name)
                  setEditingName(true)
                }}
                className="text-base font-semibold text-[#FAFAFA] hover:text-amber-500 transition-colors"
              >
                {session.name}
              </button>
            )}

            <div className="flex items-center gap-2 text-zinc-500">
              <Calendar className="h-4 w-4" />
              <input
                type="date"
                value={session.auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
                className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 outline-none focus:ring-1 focus:ring-amber-500 border-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-lg bg-[#3F3F46] px-3 py-1.5">
              <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-zinc-400">已有</span>
              <span className="text-xs font-bold text-emerald-500">
                {stats.existing}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-[#3F3F46] px-3 py-1.5">
              <FileX className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs text-zinc-400">缺失</span>
              <span className="text-xs font-bold text-red-500">
                {stats.missing}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-[#3F3F46] px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-zinc-400">过期</span>
              <span className="text-xs font-bold text-amber-500">
                {stats.expired}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-[#3F3F46] px-3 py-1.5">
              <span className="text-xs text-zinc-400">总计</span>
              <span className="text-xs font-bold text-[#FAFAFA]">
                {stats.total}
              </span>
            </div>
            <div className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-bold',
              stats.completionRate >= 80
                ? 'bg-emerald-500/15 text-emerald-500'
                : stats.completionRate >= 50
                ? 'bg-amber-500/15 text-amber-500'
                : 'bg-red-500/15 text-red-500'
            )}>
              {stats.completionRate}%
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#1C1C1E] p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
