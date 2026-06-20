import { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';

export default function Layout() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar projectId={projectId ?? null} />
      <main className="relative flex-1 overflow-y-auto bg-[#0A0A1A]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 min-h-screen p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
