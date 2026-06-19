import { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { id: eventId } = useParams<{ id: string }>();

  return (
    <div className="flex h-screen bg-[#0F0F0F] font-body text-dark-50">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        eventId={eventId}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b border-dark-400 px-6">
          <h1 className="font-display text-xl font-bold tracking-wide text-dark-50">
            摄影协会评片台
          </h1>
          <div className="ml-4 h-5 w-px bg-gold-500/40" />
          <span className="ml-4 text-sm text-dark-200">专业 · 公正 · 高效</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
