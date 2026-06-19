import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, User, BarChart3, ClipboardList } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { UserRole } from '../../types';

export default function LoginPage() {
  const navigate = useNavigate();
  const { dispatch } = useApp();

  const handleRoleSelect = (role: UserRole) => {
    dispatch({ type: 'SET_USER_ROLE', payload: role });
    if (role === 'manager') navigate('/manager/dashboard');
    else if (role === 'supervisor') navigate('/supervisor/dashboard');
    else navigate('/staff/order');
  };

  const roles: Array<{
    role: UserRole;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }> = [
    {
      role: 'manager',
      title: '店长',
      description: '查看门店数据、调整订货建议、上报报损',
      icon: <Store className="w-8 h-8" />,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      role: 'supervisor',
      title: '督导',
      description: '多门店对比分析、生成督导报告、评估门店表现',
      icon: <BarChart3 className="w-8 h-8" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      role: 'staff',
      title: '店员',
      description: '查看明日订货清单、协助报损录入',
      icon: <ClipboardList className="w-8 h-8" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-500/20 rounded-2xl mb-6">
            <Store className="w-10 h-10 text-primary-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">商超鲜食报损图</h1>
          <p className="text-lg text-dark-300 max-w-md">
            数据驱动订货，降低报损，提升销量
          </p>
        </div>

        <div className="w-full max-w-4xl">
          <p className="text-center text-dark-400 mb-6">请选择您的角色进入系统</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map(({ role, title, description, icon, color, bgColor }) => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-left hover:bg-white/10 hover:border-primary-500/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-16 h-16 ${bgColor} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${color}`}>
                  {icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
                <p className="text-dark-400 text-sm leading-relaxed">{description}</p>
                <div className="mt-6 flex items-center gap-2 text-primary-400 text-sm font-medium">
                  <span>进入工作台</span>
                  <svg
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
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
        </div>

        <div className="mt-16 flex items-center gap-8 text-dark-500 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>系统运行正常</span>
          </div>
          <div>共 6 家门店</div>
          <div>今日已处理 1,248 条销售记录</div>
        </div>
      </div>

      <div className="relative text-center py-6 text-dark-600 text-sm">
        © 2024 商超鲜食报损图系统 · 数据驱动智慧零售
      </div>
    </div>
  );
}
