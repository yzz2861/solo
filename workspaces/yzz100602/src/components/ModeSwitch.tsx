import { HardHat, Briefcase } from 'lucide-react';
import type { ReportMode } from '@/types';

interface ModeSwitchProps {
  mode: ReportMode;
  onChange: (mode: ReportMode) => void;
}

export default function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div className="inline-flex bg-warm-100 rounded-xl p-1">
      <button
        onClick={() => onChange('worker')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
          mode === 'worker'
            ? 'bg-white text-primary-600 shadow-md'
            : 'text-warm-600 hover:text-warm-800'
        }`}
      >
        <HardHat className="w-4 h-4" />
        <span>师傅版</span>
      </button>
      <button
        onClick={() => onChange('boss')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
          mode === 'boss'
            ? 'bg-white text-primary-600 shadow-md'
            : 'text-warm-600 hover:text-warm-800'
        }`}
      >
        <Briefcase className="w-4 h-4" />
        <span>老板版</span>
      </button>
    </div>
  );
}
