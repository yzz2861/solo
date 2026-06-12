import type { ReactNode } from 'react';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  className?: string;
}

export default function Layout({ children, title, showBack, className = '' }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-cream-50 to-peach-50">
      {title && <Header title={title} showBack={showBack} />}
      <main className={`container mx-auto px-4 py-6 ${className}`}>
        {children}
      </main>
    </div>
  );
}
