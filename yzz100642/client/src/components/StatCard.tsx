interface Props {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'cyan' | 'pink';
  trend?: number;
  trendLabel?: string;
}

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
  pink: 'bg-pink-500',
};

const bgColorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  purple: 'bg-purple-50 text-purple-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  pink: 'bg-pink-50 text-pink-600',
};

export default function StatCard({ title, value, icon, color = 'blue', trend, trendLabel }: Props) {
  return (
    <div className="card p-5 animate-slide-up hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-sm font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
              {trendLabel && <span className="text-xs text-slate-400">{trendLabel}</span>}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bgColorClasses[color]}`}>
          <div className="w-6 h-6">
            {icon}
          </div>
        </div>
      </div>
      <div className={`h-1 ${colorClasses[color]} rounded-full mt-4 opacity-60`} />
    </div>
  );
}
