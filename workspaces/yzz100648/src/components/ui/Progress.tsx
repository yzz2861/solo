import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ClassValue = Parameters<typeof clsx>[0];

interface ProgressProps {
  value: number;
  color?: string;
  className?: string;
}

export default function Progress({
  value,
  color = '#F59E0B',
  className,
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-white/5',
        className,
      )}
    >
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
