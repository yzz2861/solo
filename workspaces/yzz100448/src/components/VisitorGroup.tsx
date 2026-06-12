import type { Visitor } from '../types';
import { VisitorCard } from './VisitorCard';
import { Sun, Cloud, CheckCircle, AlertTriangle } from 'lucide-react';

interface VisitorGroupProps {
  title: string;
  type: 'morning' | 'afternoon' | 'arrived' | 'overdue';
  visitors: Visitor[];
  onEdit?: (visitor: Visitor) => void;
  onChangePlate?: (visitor: Visitor) => void;
}

const groupConfig: Record<string, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  morning: {
    icon: <Sun size={20} />,
    bg: 'bg-slate-50',
    border: 'border-status-morning',
    text: 'text-status-morning',
  },
  afternoon: {
    icon: <Cloud size={20} />,
    bg: 'bg-blue-50',
    border: 'border-status-afternoon',
    text: 'text-status-afternoon',
  },
  arrived: {
    icon: <CheckCircle size={20} />,
    bg: 'bg-emerald-50',
    border: 'border-status-arrived',
    text: 'text-status-arrived',
  },
  overdue: {
    icon: <AlertTriangle size={20} />,
    bg: 'bg-red-50',
    border: 'border-status-overdue',
    text: 'text-status-overdue',
  },
};

export function VisitorGroup({ title, type, visitors, onEdit, onChangePlate }: VisitorGroupProps) {
  const config = groupConfig[type];

  return (
    <div className={`${config.bg} rounded-2xl p-6 border-l-4 ${config.border}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`${config.text}`}>
          {config.icon}
        </div>
        <h2 className={`text-xl font-bold ${config.text}`}>
          {title}
        </h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.text} bg-white/60`}>
          {visitors.length} 条
        </span>
      </div>

      {visitors.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2 opacity-50">📭</div>
          <p>暂无预约记录</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {visitors.map((visitor, index) => (
            <div key={visitor.id} style={{ animationDelay: `${index * 50}ms` }}>
              <VisitorCard
                visitor={visitor}
                onEdit={onEdit}
                onChangePlate={onChangePlate}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
