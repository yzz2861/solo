import { User, Wrench } from 'lucide-react';
import type { UserMode } from '@/types';

interface ModeSwitchProps {
  mode: UserMode;
  onChange: (mode: UserMode) => void;
}

export default function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-1">
      <button
        onClick={() => onChange('farmer')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          mode === 'farmer'
            ? 'bg-white text-green-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        <User size={18} />
        <span>种植户版</span>
      </button>
      <button
        onClick={() => onChange('technician')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          mode === 'technician'
            ? 'bg-white text-green-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        <Wrench size={18} />
        <span>技术员版</span>
      </button>
    </div>
  );
}
