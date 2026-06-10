import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

type TagVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';
type TagSize = 'sm' | 'md';

interface TagProps {
  children: React.ReactNode;
  variant?: TagVariant;
  size?: TagSize;
  onRemove?: () => void;
  className?: string;
}

const Tag: React.FC<TagProps> = ({
  children,
  variant = 'default',
  size = 'md',
  onRemove,
  className,
}) => {
  const variants: Record<TagVariant, string> = {
    default: 'bg-coffee-100 text-coffee-700',
    primary: 'bg-coffee-700 text-white',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    outline: 'border border-coffee-300 text-coffee-600 bg-transparent',
  };

  const sizes: Record<TagSize, string> = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full transition-all duration-200',
        variants[variant],
        sizes[size],
        onRemove && 'pr-1.5',
        className
      )}
    >
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 rounded-full hover:bg-black/10 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

export default Tag;
