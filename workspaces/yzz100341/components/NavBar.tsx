'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bus,
  LogOut,
  User,
  ClipboardList,
  MapPin,
  Users,
  Shield,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_LABEL } from '@/lib/utils';
import type { SessionUser } from '@/lib/auth';

type NavLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const ROLE_NAV_LINKS: Record<SessionUser['role'], NavLink[]> = {
  PARENT: [
    { href: '/parent', label: '我的孩子', icon: <Users className="w-4 h-4" /> },
  ],
  TEACHER: [
    { href: '/teacher', label: '班级管理', icon: <Users className="w-4 h-4" /> },
  ],
  DRIVER: [
    { href: '/driver', label: '司机工作台', icon: <MapPin className="w-4 h-4" /> },
  ],
  CONDUCTOR: [
    { href: '/conductor', label: '跟车名单', icon: <ClipboardList className="w-4 h-4" /> },
  ],
  ADMIN: [
    { href: '/admin', label: '审计导出', icon: <Shield className="w-4 h-4" /> },
  ],
};

export function NavBar({ user }: { user: SessionUser }) {
  const router = useRouter();
  const links = ROLE_NAV_LINKS[user.role];

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-brand-orange flex items-center justify-center">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-brand-navy">校车随行</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 hover:text-brand-navy transition-colors"
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-navy/5">
              <div className="w-7 h-7 rounded-full bg-brand-orange/15 flex items-center justify-center">
                <User className="w-4 h-4 text-brand-orange" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-brand-navy leading-tight">{user.name}</p>
                <p className="text-xs text-slate-500 leading-tight">{ROLE_LABEL[user.role]}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium',
                'text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors'
              )}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">退出</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
