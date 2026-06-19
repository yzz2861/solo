import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCaseStore } from '@/store/useCaseStore'
import { Users, Lock, User, BadgeCheck } from 'lucide-react'

const DEMO_PASSWORD = 'leader123'

export default function LeaderLogin() {
  const navigate = useNavigate()
  const leaderLogin = useCaseStore((s) => s.leaderLogin)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [leaderId, setLeaderId] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = () => {
    setError('')

    if (!name.trim()) {
      setError('请输入姓名')
      return
    }
    if (!leaderId.trim()) {
      setError('请输入组长ID')
      return
    }
    if (password !== DEMO_PASSWORD) {
      setError('密码错误')
      return
    }

    leaderLogin(name.trim(), leaderId.trim())
    navigate('/leader/training')
  }

  return (
    <div className="min-h-screen bg-[#0F2A44] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2EC4B6] to-[#25a99d] mb-6 shadow-lg shadow-[#2EC4B6]/20">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1
            className="text-3xl font-bold text-white mb-2"
            style={{ fontFamily: '"Noto Serif SC", serif' }}
          >
            组长登录
          </h1>
          <p className="text-[#8899aa]">登录后可查看组员成绩、安排补训</p>
        </div>

        <div className="bg-[#1a3a54] rounded-2xl p-8 border border-[#2a4a64]">
          <div className="space-y-5">
            <div>
              <label className="block text-sm text-[#8899aa] mb-2">姓名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#667788]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入姓名"
                  className="w-full pl-11 pr-4 py-3 bg-[#0F2A44] border border-[#2a4a64] rounded-xl text-white placeholder-[#556677] focus:outline-none focus:border-[#2EC4B6] focus:ring-1 focus:ring-[#2EC4B6]/30 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#8899aa] mb-2">组长ID</label>
              <div className="relative">
                <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#667788]" />
                <input
                  type="text"
                  value={leaderId}
                  onChange={(e) => setLeaderId(e.target.value)}
                  placeholder="请输入组长ID"
                  className="w-full pl-11 pr-4 py-3 bg-[#0F2A44] border border-[#2a4a64] rounded-xl text-white placeholder-[#556677] focus:outline-none focus:border-[#2EC4B6] focus:ring-1 focus:ring-[#2EC4B6]/30 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#8899aa] mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#667788]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full pl-11 pr-16 py-3 bg-[#0F2A44] border border-[#2a4a64] rounded-xl text-white placeholder-[#556677] focus:outline-none focus:border-[#2EC4B6] focus:ring-1 focus:ring-[#2EC4B6]/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667788] hover:text-[#2EC4B6] text-xs transition-colors"
                >
                  {showPassword ? '隐藏' : '显示'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2EC4B6] to-[#25a99d] text-white font-bold text-lg hover:from-[#36d4c6] hover:to-[#2db9ab] transition-all shadow-lg shadow-[#2EC4B6]/20 hover:shadow-[#2EC4B6]/30 active:scale-[0.98]"
            >
              登录
            </button>
          </div>

          <p className="text-center text-xs text-[#556677] mt-6">
            演示密码：leader123
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="block mx-auto mt-6 text-sm text-[#667788] hover:text-[#2EC4B6] transition-colors"
        >
          ← 返回角色选择
        </button>
      </div>
    </div>
  )
}
