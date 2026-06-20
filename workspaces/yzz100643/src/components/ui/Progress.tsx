interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

const Progress = ({ 
  value, 
  max = 100, 
  className = '', 
  showLabel = false,
  variant = 'default'
}: ProgressProps) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const variants = {
    default: 'bg-archive-600',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error'
  };
  
  return (
    <div className={`w-full ${className}`}>
      <div className="w-full h-2 bg-archive-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${variants[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-archive-500">
          <span>{value} / {max}</span>
          <span>{percentage.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};

export default Progress;
