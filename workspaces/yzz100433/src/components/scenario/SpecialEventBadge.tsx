import type { SpecialEvent } from '@/types';
import { AlertCircle, RefreshCw, Undo2, Users, Ticket } from 'lucide-react';

interface SpecialEventBadgeProps {
  event: SpecialEvent;
}

export default function SpecialEventBadge({ event }: SpecialEventBadgeProps) {
  if (event.type === 'none') return null;

  const getConfig = () => {
    switch (event.type) {
      case 'exchange':
        return {
          icon: <RefreshCw className="w-4 h-4" />,
          label: '换商品',
          color: 'bg-peach-500 text-white',
          bg: 'bg-peach-50 border-peach-200',
          textColor: 'text-peach-700',
        };
      case 'partial_refund':
        return {
          icon: <Undo2 className="w-4 h-4" />,
          label: '部分退单',
          color: 'bg-orange-500 text-white',
          bg: 'bg-orange-50 border-orange-200',
          textColor: 'text-orange-700',
        };
      case 'damaged_coupon':
        return {
          icon: <Ticket className="w-4 h-4" />,
          label: '破损券',
          color: 'bg-red-500 text-white',
          bg: 'bg-red-50 border-red-200',
          textColor: 'text-red-700',
        };
      case 'group_order':
        return {
          icon: <Users className="w-4 h-4" />,
          label: '拼单结算',
          color: 'bg-purple-500 text-white',
          bg: 'bg-purple-50 border-purple-200',
          textColor: 'text-purple-700',
        };
      default:
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          label: '特殊事件',
          color: 'bg-yellow-500 text-white',
          bg: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-700',
        };
    }
  };

  const config = getConfig();

  return (
    <div className={`border-2 rounded-xl p-4 ${config.bg} animate-slide-in-up`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${config.color}`}>
          {config.icon}
          {config.label}
        </span>
      </div>
      <p className={`text-sm font-medium ${config.textColor}`}>
        {event.description}
      </p>
      {event.ruleExplanation && (
        <p className={`text-sm mt-2 ${config.textColor} opacity-80`}>
          {event.ruleExplanation}
        </p>
      )}
    </div>
  );
}
