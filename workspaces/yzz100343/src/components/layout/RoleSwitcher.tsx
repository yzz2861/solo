import React from 'react';
import type { UserRole } from '@/types';
import { ROLE_LABELS } from '@/types';
import {
  Shield,
  Zap,
  Briefcase,
  ClipboardCheck,
  ChevronDown,
} from 'lucide-react';

interface Props {
  currentRole: UserRole;
  onChange: (role: UserRole) => void;
}

const roles: { role: UserRole; icon: typeof Shield; desc: string }[] = [
  { role: 'SAFETY_OFFICER', icon: Shield, desc: '登记·复查' },
  { role: 'ELECTRICIAN', icon: Zap, desc: '整改任务' },
  { role: 'PROJECT_MANAGER', icon: Briefcase, desc: '统计·导出' },
  { role: 'SAFETY_INSPECTOR', icon: ClipboardCheck, desc: '例会筛查' },
];

export const RoleSwitcher: React.FC<Props> = ({ currentRole, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const current = roles.find((r) => r.role === currentRole)!;
  const CurrentIcon = current.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-[4px]
                   bg-white/10 hover:bg-white/15 border border-white/20
                   text-white transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-safety-orange/90 flex items-center justify-center">
          <CurrentIcon size={16} strokeWidth={2.4} />
        </div>
        <div className="text-left leading-tight pr-1">
          <div className="text-sm font-bold">{ROLE_LABELS[currentRole]}</div>
          <div className="text-[11px] opacity-75">{current.desc}</div>
        </div>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-2xl
                       border border-industrial-gray-200 overflow-hidden z-20 animate-slide-in"
          >
            <div className="px-4 py-2.5 text-xs font-semibold text-industrial-gray-500 bg-industrial-gray-50 border-b border-industrial-gray-200">
              切换角色身份
            </div>
            <div className="py-1">
              {roles.map(({ role, icon: Icon, desc }) => {
                const active = role === currentRole;
                return (
                  <button
                    key={role}
                    onClick={() => {
                      onChange(role);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                      ${
                        active
                          ? 'bg-steel-blue/5 text-steel-blue'
                          : 'hover:bg-industrial-gray-50 text-industrial-gray-700'
                      }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        active
                          ? 'bg-safety-orange text-white'
                          : 'bg-industrial-gray-100 text-industrial-gray-500'
                      }`}
                    >
                      <Icon size={17} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">
                        {ROLE_LABELS[role]}
                      </div>
                      <div className="text-[11px] text-industrial-gray-500">
                        {desc}
                      </div>
                    </div>
                    {active && (
                      <div className="w-2 h-2 rounded-full bg-safety-orange" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
