import React from 'react';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  formatFn?: (v: number) => string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 2,
  duration = 450,
  className = '',
  prefix = '',
  suffix = '',
  formatFn,
}) => {
  const [display, setDisplay] = React.useState<number>(value || 0);
  const prevRef = React.useRef<number>(value || 0);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const from = prevRef.current;
    const to = isFinite(value) ? value : 0;
    if (from === to) return;

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = Math.min(now - start, duration);
      const t = elapsed / duration;
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (elapsed < duration) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const formatted = !isFinite(display)
    ? '-'
    : formatFn
    ? formatFn(display)
    : display.toFixed(decimals);

  return <span className={className}>{prefix}{formatted}{suffix}</span>;
};
