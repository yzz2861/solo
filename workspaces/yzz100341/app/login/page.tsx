'use client';

import { useSearchParams } from 'next/navigation';
import { Bus, Mail, Lock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const serverError = searchParams.get('error') || '';

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-brand-navy via-brand-navy-light to-slate-800 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-orange/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-orange/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-orange/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-brand-orange to-brand-orange-dark p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                <Bus className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">校车随行</h1>
                <p className="text-white/80 text-sm mt-1">上车点变更服务平台</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <form action="/api/auth/login" method="POST" className="space-y-5">
              <input type="hidden" name="redirect" value={redirect} />

              {serverError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{serverError}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">邮箱地址</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    name="email"
                    type="email"
                    placeholder="请输入邮箱"
                    className={cn(
                      'w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50',
                      'text-slate-900 placeholder-slate-400',
                      'focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange focus:bg-white',
                      'transition-all'
                    )}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">登录密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    name="password"
                    type="password"
                    placeholder="请输入密码"
                    className={cn(
                      'w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50',
                      'text-slate-900 placeholder-slate-400',
                      'focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange focus:bg-white',
                      'transition-all'
                    )}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className={cn(
                  'w-full py-3 rounded-xl font-semibold text-white',
                  'bg-gradient-to-r from-brand-orange to-brand-orange-dark',
                  'hover:from-brand-orange-dark hover:to-[#D15A25]',
                  'shadow-lg shadow-brand-orange/30 hover:shadow-brand-orange/40',
                  'transform hover:-translate-y-0.5 active:translate-y-0',
                  'transition-all duration-200',
                  'flex items-center justify-center gap-2'
                )}
              >
                登 录
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-center text-slate-500 leading-relaxed">
                测试账号：admin@school.edu / teacher1@school.edu / parent1@qq.com
                <br />
                统一密码：<span className="font-mono text-brand-navy">123456</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          © {new Date().getFullYear()} 校车随行 · 安全便捷的校园出行服务
        </p>
      </div>
    </div>
  );
}
