import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ClassValue = Parameters<typeof clsx>[0];

type BadgeVariant = 'solid' | 'outline';

interface BadgeProps {
  label: string;
  color: string;
  variant?: BadgeVariant;
  className?: string;
}

export default function Badge({
  label,
  color,
  variant = 'solid',
  className,
}: BadgeProps) {
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        variant === 'solid' && 'text-white',
        variant === 'outline' && 'bg-transparent border',
        className,
      )}
      style={{
        backgroundColor: variant === 'solid' ? color : undefined,
        borderColor: variant === 'outline' ? color : undefined,
        color: variant === 'outline' ? color : undefined,
      }}
    >
      {label}
    </motion.span>
  );
}
