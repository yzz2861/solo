import { useMemo } from 'react';

const BubbleBackground = () => {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 60 + Math.random() * 140,
        delay: Math.random() * 4,
        duration: 6 + Math.random() * 8,
      })),
    [],
  );

  return (
    <div className="bubble-bg" aria-hidden>
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="bubble animate-float"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

export default BubbleBackground;
