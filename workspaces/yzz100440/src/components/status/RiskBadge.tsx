interface RiskBadgeProps {
  level: 'high' | 'medium' | 'low';
  size?: 'sm' | 'md' | 'lg';
}

const riskConfig = {
  high: { label: '高风险', color: '#F53F3F', bgColor: '#F53F3F15' },
  medium: { label: '中风险', color: '#FF7D00', bgColor: '#FF7D0015' },
  low: { label: '低风险', color: '#00B42A', bgColor: '#00B42A15' },
};

export function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  const config = riskConfig[level];
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`}
      style={{ 
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      <span 
        className="w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
