import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCaseStore } from '@/store/useCaseStore'
import { Shield, Eye, EyeOff } from 'lucide-react'

const DEMO_PASSWORD = 'admin123'

export default function SupervisorLogin() {
  const navigate = useNavigate()
  const supervisorLogin = useCaseStore((s) => s.supervisorLogin)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('请输入姓名')
      return
    }
    if (password !== DEMO_PASSWORD) {
      setError('密码错误')
      return
    }

    supervisorLogin(name.trim())
    navigate('/supervisor/cases')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F2A44] via-[#0a1e30] to-[#0F2A44] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#e85d2c] mb-6 shadow-lg shadow-[#FF6B35]/20">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1
            className="text-3xl font-bold text-white mb-2"
            style={{ fontFamily: '"Noto Serif SC", serif' }}
          >
            主管登录
          </h1>
          <p className="text-[#8899aa]">管理案例库与学员数据</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#1a3a54] rounded-2xl p-8 border border-[#2a4a64] space-y-5"
        >
          <div>
            <label className="block text-sm text-[#8899aa] mb-2">姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名"
              className="w-full px-4 py-3 rounded-xl bg-[#0F2A44] border border-[#2a4a64] text-white placeholder-[#556677] focus:outline-none focus:border-[#FF6B35] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[#8899aa] mb-2">密码</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-3 rounded-xl bg-[#0F2A44] border border-[#2a4a64] text-white placeholder-[#556677] focus:outline-none focus:border-[#FF6B35] transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667788] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-[#FF6B35] text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#e85d2c] text-white font-bold hover:from-[#e85d2c] hover:to-[#d04f24] transition-all shadow-lg shadow-[#FF6B35]/20 hover:shadow-[#FF6B35]/30"
          >
            登录
          </button>

          <p className="text-center text-xs text-[#556677]">
            演示密码：admin123
          </p>
        </form>
      </div>
    </div>
  )
}
