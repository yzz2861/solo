import { NavLink } from 'react-router-dom';
import { Calculator, FileText, ClipboardCheck, Droplets } from 'lucide-react';
import { UserSelector } from './UserSelector';
import { useAppStore } from '@/store/useAppStore';

export function Navbar() {
  const { currentUser } = useAppStore();

  const navItems = [
    { to: '/calculator', label: '加药计算', icon: Calculator, roles: ['admin', 'supervisor'] },
    { to: '/records', label: '交班记录', icon: FileText, roles: ['admin', 'supervisor'] },
    { to: '/audit', label: '主管抽查', icon: ClipboardCheck, roles: ['supervisor'] },
  ];

  return (
    <nav className="bg-sky-900 text-white shadow-lg no-print">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">泳池加药量复核系统</h1>
                <p className="text-xs text-sky-300">Pool Dosing Verification</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {navItems
                .filter((item) => !currentUser || item.roles.includes(currentUser.role))
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-sky-700 text-white'
                          : 'text-sky-200 hover:bg-sky-800 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
            </div>
          </div>

          <UserSelector />
        </div>
      </div>
    </nav>
  );
}
