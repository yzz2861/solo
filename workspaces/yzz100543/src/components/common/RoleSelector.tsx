import { useNavigate } from 'react-router-dom'
import { Headset, Shield, Users } from 'lucide-react'

const roles = [
  { id: 'student', label: '学员', desc: '进行剧情训练、查看培训报告', icon: Headset, path: '/student', color: 'from-[#0F2A44] to-[#1a4a6e]' },
  { id: 'supervisor', label: '主管', desc: '管理案例库、查看学员数据', icon: Shield, path: '/supervisor/login', color: 'from-[#FF6B35] to-[#e85d2c]' },
  { id: 'leader', label: '组长', desc: '查看本组成绩、安排补训', icon: Users, path: '/leader/login', color: 'from-[#2EC4B6] to-[#25a99d]' },
]

export default function RoleSelector() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0F2A44] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#e85d2c] mb-6 shadow-lg shadow-[#FF6B35]/20">
            <Headset className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            电梯困人安抚培训
          </h1>
          <p className="text-[#8899aa] text-lg">选择角色进入系统</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => navigate(role.path)}
              className="group relative bg-[#1a3a54] rounded-2xl p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/30 border border-[#2a4a64] hover:border-[#3a5a74]"
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${role.color} mb-5 shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                <role.icon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{role.label}</h2>
              <p className="text-[#8899aa] text-sm">{role.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
