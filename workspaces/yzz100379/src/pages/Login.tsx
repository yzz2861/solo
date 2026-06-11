import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Wrench, LogIn, AlertCircle, Info } from 'lucide-react'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import type { StaffRole } from '@/shared/types'

export default function Login() {
  const [staffId, setStaffId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userRole = useAuthStore((s) => s.userRole)

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname

  const redirectByRole = (role: StaffRole) => {
    if (from) {
      navigate(from, { replace: true })
      return
    }
    if (role === 'tech') {
      navigate('/tech/my-tickets', { replace: true })
    } else {
      navigate('/cs/workbench', { replace: true })
    }
  }

  if (isAuthenticated && userRole) {
    redirectByRole(userRole)
    return <Navigate to="/cs/workbench" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffId.trim()) {
      setError('请输入工号')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.login(staffId.trim())
      login(res.staff)
      redirectByRole(res.staff.role)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const testAccounts = [
    { id: 'cs001', role: '客服', desc: '客服工作台' },
    { id: 'tech001', role: '维修师傅', desc: '移动端工单' },
    { id: 'admin001', role: '主管', desc: '客服+导出' },
  ]

  const fillTestId = (id: string) => {
    setStaffId(id)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-500/20 border border-blue-400/30 mb-4">
            <Wrench className="w-10 h-10 text-blue-300" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">方言报修工单系统</h1>
          <p className="text-slate-300 text-sm">Dialect Maintenance Ticket System</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                员工工号
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LogIn className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={staffId}
                  onChange={(e) => {
                    setStaffId(e.target.value)
                    setError('')
                  }}
                  placeholder="请输入您的工号..."
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-red-200 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3 text-slate-300 text-sm">
              <Info className="w-4 h-4" />
              <span>测试账号（点击快速填入）：</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {testAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => fillTestId(acc.id)}
                  className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-blue-500/30 text-blue-200 text-xs font-medium rounded-md font-mono">
                      {acc.id}
                    </span>
                    <span className="text-white text-sm">{acc.role}</span>
                  </div>
                  <span className="text-slate-400 text-xs group-hover:text-slate-300 transition-colors">
                    {acc.desc} →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          © 2024 方言报修工单系统 | Powered by AI
        </p>
      </div>
    </div>
  )
}
