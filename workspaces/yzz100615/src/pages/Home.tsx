import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, BarChart3, UserCheck, Truck, Clock, FileText } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Home() {
  const navigate = useNavigate();
  const initStore = useStore((s) => s.initStore);
  const tasks = useStore((s) => s.tasks);

  useEffect(() => {
    initStore();
  }, [initStore]);

  const roles = [
    {
      key: 'loading',
      title: '装车班组',
      description: '调整货位，实时查看轴荷变化',
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-600',
      path: '/loading',
    },
    {
      key: 'dispatcher',
      title: '调度中心',
      description: '货物贡献分析，版本管理，限载标准',
      icon: BarChart3,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-600',
      path: '/dispatcher',
    },
    {
      key: 'driver',
      title: '司机确认',
      description: '查看最终轴荷，电子签字确认',
      icon: UserCheck,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-600',
      path: `/driver/${tasks[0]?.id || ''}`,
    },
  ];

  const recentTasks = tasks.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mb-6 shadow-xl shadow-blue-500/30">
            <Truck size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">货车轴荷估算器</h1>
          <p className="text-lg text-gray-500 max-w-lg mx-auto">
            装车前精准估算前后轴荷，避免单轴超载，保障运输安全
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {roles.map((role) => (
            <button
              key={role.key}
              onClick={() => navigate(role.path)}
              className={`group relative overflow-hidden ${role.bgColor} ${role.borderColor} border-2 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]`}
            >
              <div
                className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${role.color} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`}
              />
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
              >
                <role.icon size={28} className="text-white" />
              </div>
              <h2 className={`text-xl font-bold ${role.textColor} mb-2`}>{role.title}</h2>
              <p className="text-sm text-gray-500">{role.description}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span className={role.textColor}>进入</span>
                <svg
                  className={`w-4 h-4 ${role.textColor} group-hover:translate-x-1 transition-transform`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <FileText size={20} className="text-gray-500" />
            <h3 className="font-semibold text-gray-800">最近任务</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentTasks.length === 0 && (
              <div className="py-12 text-center text-gray-400">暂无任务</div>
            )}
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="px-6 py-4 hover:bg-blue-50/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/loading`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-800">{task.name}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{task.vehiclePlate}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={14} />
                    <span>
                      {new Date(task.updatedAt).toLocaleString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 mt-2">
                  <span className="text-xs text-gray-500">货物: {task.cargoes.length} 件</span>
                  <span className="text-xs text-gray-500">
                    版本: {task.versions.length} 个
                  </span>
                  {task.driverRecord && (
                    <span className="text-xs text-green-600">✓ 司机已确认</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-400">
          <p>数据保存在本地浏览器，请定期备份重要记录</p>
        </div>
      </div>
    </div>
  );
}
