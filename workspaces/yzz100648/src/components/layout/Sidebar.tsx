import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  Upload,
  Search,
  ShieldCheck,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ClassValue = Parameters<typeof clsx>[0];

interface SidebarProps {
  projectId: string | null;
}

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

export default function Sidebar({ projectId }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);

  const navItems: NavItem[] = [
    { to: '/projects', icon: <FolderOpen className="h-5 w-5" />, label: 'Projects' },
    { to: '/import', icon: <Upload className="h-5 w-5" />, label: 'Import' },
    { to: projectId ? `/projects/${projectId}/mining` : '/mining', icon: <Search className="h-5 w-5" />, label: 'Mining' },
    { to: projectId ? `/projects/${projectId}/risks` : '/risks', icon: <ShieldCheck className="h-5 w-5" />, label: 'Risk Management' },
    { to: projectId ? `/projects/${projectId}/export` : '/export', icon: <Download className="h-5 w-5" />, label: 'Export' },
  ];

  return (
    <motion.aside
      animate={{ width: expanded ? 240 : 64 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex h-screen flex-col bg-[#0F0F23] border-r border-white/5 shrink-0 overflow-hidden"
    >
      <nav className="flex-1 py-4">
        <ul className="flex flex-col gap-1 px-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                      : 'text-gray-500 hover:bg-white/5 hover:text-gray-300',
                  )
                }
              >
                <span className="shrink-0">{item.icon}</span>
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/5 p-2">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
        >
          {expanded ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>
    </motion.aside>
  );
}
