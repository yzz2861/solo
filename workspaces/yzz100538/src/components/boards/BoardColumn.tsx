import type { ReactNode } from 'react';

interface BoardColumnProps {
  title: string;
  count: number;
  icon: ReactNode;
  colorClass: string;
  bgClass: string;
  children: ReactNode;
}

export default function BoardColumn({
  title,
  count,
  icon,
  colorClass,
  bgClass,
  children,
}: BoardColumnProps) {
  return (
    <div className="flex flex-col h-full">
      <div className={`${bgClass} rounded-t-xl p-4 border-b-2 ${colorClass}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClass.replace('border-', 'bg-').replace('border', 'text')}`}>
            {icon}
          </div>
          <div>
            <h2 className="font-bold text-gray-800">{title}</h2>
            <p className="text-sm text-gray-500">
              {count} 个预订
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-50/50 rounded-b-xl p-3 space-y-3 min-h-[400px] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
