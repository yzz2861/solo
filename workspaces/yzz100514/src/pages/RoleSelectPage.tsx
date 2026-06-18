import { useNavigate } from 'react-router-dom'
import { Library, GraduationCap, Wrench, Leaf } from 'lucide-react'
import { useStore } from '@/store'

const roles = [
  {
    key: '馆员' as const,
    icon: Library,
    name: '馆员',
    description: '管理标本入馆、借出与归还全流程',
  },
  {
    key: '教师' as const,
    icon: GraduationCap,
    name: '教师',
    description: '提交借阅申请，查询标本信息',
  },
  {
    key: '修复师' as const,
    icon: Wrench,
    name: '修复师',
    description: '处理标本修复任务，更新修复状态',
  },
]

export default function RoleSelectPage() {
  const setRole = useStore((s) => s.setRole)
  const navigate = useNavigate()

  const handleSelect = (key: '馆员' | '教师' | '修复师') => {
    setRole(key)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-forest-500/5 via-transparent to-sand-200/40 pointer-events-none" />

      <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none opacity-10">
        <div className="flex gap-12">
          {[...Array(5)].map((_, i) => (
            <Leaf
              key={i}
              className="text-forest-500"
              style={{
                width: 48 + i * 16,
                height: 48 + i * 16,
                transform: `rotate(${-20 + i * 15}deg)`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto px-6">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Leaf className="w-10 h-10 text-forest-500" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-forest-500 tracking-wide mb-3">
            植物标本借阅柜
          </h1>
          <p className="text-forest-600/70 text-lg">请选择您的角色</p>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {roles.map(({ key, icon: Icon, name, description }) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className="group bg-white rounded-xl border-2 border-sand-200 p-6 text-center
                         transition-all duration-200 hover:shadow-lg hover:scale-[1.03]
                         hover:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-400"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-forest-50 flex items-center justify-center
                              group-hover:bg-forest-500 transition-colors duration-200">
                <Icon className="w-7 h-7 text-forest-500 group-hover:text-white transition-colors duration-200" />
              </div>
              <h3 className="text-lg font-serif font-bold text-forest-700 mb-2">{name}</h3>
              <p className="text-sm text-forest-600/60 leading-relaxed">{description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 text-sm text-forest-400/40 font-serif z-10">
        标本数字化管理平台
      </div>
    </div>
  )
}
