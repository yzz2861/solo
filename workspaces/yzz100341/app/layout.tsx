import type { Metadata } from 'next';
import './globals.css';
import { getCurrentUser } from '@/lib/auth';
import { NavBar } from '@/components/NavBar';

export const metadata: Metadata = {
  title: '校车随行 - 上车点变更服务',
  description: '校车上下车点变更申请与管理系统',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50">
        {user && <NavBar user={user} />}
        <main className={user ? '' : 'min-h-screen'}>{children}</main>
      </body>
    </html>
  );
}
