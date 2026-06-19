import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  role: 'manager' | 'supervisor' | 'staff';
}

export default function AppLayout({ role }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {role === 'manager' && '店长工作台'}
                {role === 'supervisor' && '督导工作台'}
                {role === 'staff' && '店员工作台'}
              </h2>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700">
                  {role === 'manager' && '张店长'}
                  {role === 'supervisor' && '李督导'}
                  {role === 'staff' && '王店员'}
                </div>
                <div className="text-xs text-gray-400">
                  {role === 'manager' && '中心广场店'}
                  {role === 'supervisor' && '华东区域'}
                  {role === 'staff' && '中心广场店'}
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-semibold">
                {role === 'manager' && '张'}
                {role === 'supervisor' && '李'}
                {role === 'staff' && '王'}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
