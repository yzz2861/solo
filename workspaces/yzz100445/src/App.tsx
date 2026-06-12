import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import OrderList from './pages/OrderList'
import OrderDetail from './pages/OrderDetail'
import CreateOrder from './pages/CreateOrder'
import PendingOrders from './pages/PendingOrders'
import DeliveryExport from './pages/DeliveryExport'
import WarningsPanel from './components/WarningsPanel'
import { Warning } from './types'
import { api } from './api'

function App() {
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [showWarnings, setShowWarnings] = useState(false)
  const location = useLocation()

  useEffect(() => {
    checkWarnings()
    const interval = setInterval(checkWarnings, 60000)
    return () => clearInterval(interval)
  }, [location.pathname])

  const checkWarnings = async () => {
    try {
      const result = await api.warnings.check()
      setWarnings(result)
    } catch (error) {
      console.error('Failed to check warnings:', error)
    }
  }

  const unreadWarnings = warnings.filter(w => !w.is_read).length

  const navItems = [
    { to: '/', label: '订单列表', icon: '📋' },
    { to: '/create', label: '新建订单', icon: '➕' },
    { to: '/pending', label: '修图师待处理', icon: '🎨' },
    { to: '/export', label: '前台导出', icon: '📊' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <header className="bg-gradient-to-r from-vintage-700 to-vintage-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🖼️</span>
              <div>
                <h1 className="text-2xl font-bold tracking-wide">老照片修复订单柜</h1>
                <p className="text-vintage-200 text-sm">影像店专业订单管理系统</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowWarnings(!showWarnings)}
                className="relative bg-vintage-500 hover:bg-vintage-400 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>⚠️</span>
                <span>提醒</span>
                {unreadWarnings > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {unreadWarnings}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <nav className="flex gap-2 mb-6 bg-white rounded-xl p-2 shadow-md">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive
                    ? 'bg-vintage-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-vintage-100'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {showWarnings && (
          <div className="mb-6">
            <WarningsPanel warnings={warnings} onClose={() => setShowWarnings(false)} />
          </div>
        )}

        <main className="bg-white rounded-xl shadow-lg p-6 min-h-[600px]">
          <Routes>
            <Route path="/" element={<OrderList onRefresh={checkWarnings} />} />
            <Route path="/order/:id" element={<OrderDetail onRefresh={checkWarnings} />} />
            <Route path="/create" element={<CreateOrder />} />
            <Route path="/pending" element={<PendingOrders onRefresh={checkWarnings} />} />
            <Route path="/export" element={<DeliveryExport />} />
          </Routes>
        </main>
      </div>

      <footer className="text-center py-4 text-vintage-600 text-sm">
        老照片修复订单柜 © 2026 · 数据本地安全存储
      </footer>
    </div>
  )
}

export default App
