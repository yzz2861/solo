import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { useAppStore } from '@/store/useAppStore';

export const AppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const loadHazards = useAppStore((s) => s.loadHazards);
  const isLoading = useAppStore((s) => s.isLoading);

  React.useEffect(() => {
    loadHazards();
  }, [location.pathname, loadHazards]);

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-industrial-gray-100">
        <AppHeader
          currentPath={location.pathname}
          onNavigate={(to) => navigate(to)}
        />
        <main className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-steel-blue/20 border-t-steel-blue rounded-full animate-spin" />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="py-4 px-6 text-center text-xs text-industrial-gray-500 border-t border-industrial-gray-200 bg-white/50">
          © 2026 工地临电巡检台 · 用电安全，警钟长鸣 · 数据持久化存储在后端服务器
        </footer>
      </div>
    </ToastProvider>
  );
};
