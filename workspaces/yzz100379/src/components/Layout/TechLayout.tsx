import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, LogOut, ClipboardList, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

interface TechLayoutProps {
  children: React.ReactNode
  title: string
  showBack?: boolean
  showTabs?: boolean
  activeTab?: 'pending' | 'completed'
}

export default function TechLayout({
  children,
  title,
  showBack = false,
  showTabs = false,
  activeTab = 'pending',
}: TechLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const staff = useAuthStore((s) => s.staff)
  const logout = useAuthStore((s) => s.logout)

  const handleBack = () => {
    navigate(-1)
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleTabClick = (tab: 'pending' | 'completed') => {
    if (tab === activeTab) return
    const basePath = '/tech/my-tickets'
    if (tab === 'completed') {
      navigate(`${basePath}?filter=completed`)
    } else {
      navigate(basePath)
    }
  }

  const currentStaff = staff ?? { id: 'unknown', name: '未登录', role: 'tech' as const, phone: '' }

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">
      <div
        className="w-full max-w-[480px] bg-[#f5f7fa] flex flex-col min-h-screen relative shadow-xl"
        style={{ minHeight: '100vh' }}
      >
        <header className="sticky top-0 z-50 bg-[#1e40af] text-white shadow-md">
          <div className="flex items-center h-14 px-3">
            <div className="w-16 flex-shrink-0">
              {showBack ? (
                <button
                  onClick={handleBack}
                  className="w-11 h-11 flex items-center justify-center rounded-lg active:bg-white/10 transition-colors"
                  aria-label="返回"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              ) : (
                <span className="text-sm font-semibold pl-1">📱 维修派单</span>
              )}
            </div>

            <h1 className="flex-1 text-center text-lg font-bold truncate px-2">
              {title}
            </h1>

            <div className="w-16 flex-shrink-0 flex items-center justify-end gap-1">
              <span className="text-xs truncate max-w-[60px]">
                {currentStaff.name}
              </span>
              <button
                onClick={handleLogout}
                className="w-9 h-9 flex items-center justify-center rounded-lg active:bg-white/10 transition-colors"
                aria-label="退出登录"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-[80px]">{children}</main>

        {showTabs && (
          <nav className="sticky bottom-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
            <div className="grid grid-cols-2 h-16">
              <button
                onClick={() => handleTabClick('pending')}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 transition-colors',
                  activeTab === 'pending'
                    ? 'text-[#1e40af]'
                    : 'text-gray-500 active:bg-gray-50'
                )}
              >
                <ClipboardList
                  className={cn(
                    'w-6 h-6',
                    activeTab === 'pending' ? 'stroke-[2.5px]' : ''
                  )}
                />
                <span
                  className={cn(
                    'text-xs',
                    activeTab === 'pending' ? 'font-semibold' : ''
                  )}
                >
                  我的派单
                </span>
              </button>
              <button
                onClick={() => handleTabClick('completed')}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 transition-colors',
                  activeTab === 'completed'
                    ? 'text-[#1e40af]'
                    : 'text-gray-500 active:bg-gray-50'
                )}
              >
                <CheckCircle2
                  className={cn(
                    'w-6 h-6',
                    activeTab === 'completed' ? 'stroke-[2.5px]' : ''
                  )}
                />
                <span
                  className={cn(
                    'text-xs',
                    activeTab === 'completed' ? 'font-semibold' : ''
                  )}
                >
                  已完成
                </span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
