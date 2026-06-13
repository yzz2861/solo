import React from 'react';
import { ToothRegion, REGION_NAMES } from '@/types';

interface ToothModelProps {
  region: ToothRegion;
  cleanliness: number;
  cleanedCells: Set<string>;
  gridCols: number;
  gridRows: number;
  brushPosition?: { x: number; y: number } | null;
  isActive?: boolean;
  showGrid?: boolean;
}

const ToothModel: React.FC<ToothModelProps> = ({
  region,
  cleanliness,
  cleanedCells,
  gridCols,
  gridRows,
  brushPosition,
  isActive = true,
  showGrid = false,
}) => {
  const cellWidth = 100 / gridCols;
  const cellHeight = 100 / gridRows;

  const renderToothShape = () => {
    switch (region) {
      case 'outer':
        return (
          <>
            <path
              d="M 15 30 Q 15 15 25 15 L 75 15 Q 85 15 85 30 L 85 70 Q 85 85 70 90 L 30 90 Q 15 85 15 70 Z"
              fill="url(#toothGradient)"
              stroke="#4ECDC4"
              strokeWidth="2"
            />
            <path
              d="M 20 50 Q 50 55 80 50"
              fill="none"
              stroke="#4ECDC4"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <path
              d="M 25 70 Q 50 75 75 70"
              fill="none"
              stroke="#4ECDC4"
              strokeWidth="1.5"
              opacity="0.5"
            />
          </>
        );
      case 'inner':
        return (
          <>
            <path
              d="M 15 30 Q 15 15 25 15 L 75 15 Q 85 15 85 30 L 85 70 Q 85 85 70 90 L 30 90 Q 15 85 15 70 Z"
              fill="url(#toothGradient)"
              stroke="#4ECDC4"
              strokeWidth="2"
            />
            <path
              d="M 22 40 Q 50 45 78 40"
              fill="none"
              stroke="#4ECDC4"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <path
              d="M 28 65 Q 50 70 72 65"
              fill="none"
              stroke="#4ECDC4"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <ellipse cx="50" cy="35" rx="15" ry="8" fill="#f0f9ff" opacity="0.6" />
          </>
        );
      case 'occlusal':
        return (
          <>
            <ellipse
              cx="50"
              cy="50"
              rx="40"
              ry="30"
              fill="url(#occlusalGradient)"
              stroke="#4ECDC4"
              strokeWidth="2"
            />
            <path
              d="M 20 50 Q 35 35 50 50 Q 65 65 80 50"
              fill="none"
              stroke="#4ECDC4"
              strokeWidth="2"
              opacity="0.7"
            />
            <path
              d="M 25 35 Q 50 45 75 35"
              fill="none"
              stroke="#4ECDC4"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <path
              d="M 25 65 Q 50 55 75 65"
              fill="none"
              stroke="#4ECDC4"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <path
              d="M 50 20 L 50 80"
              fill="none"
              stroke="#4ECDC4"
              strokeWidth="1.5"
              opacity="0.5"
            />
          </>
        );
      case 'lingual':
        return (
          <>
            <path
              d="M 25 25 Q 20 15 30 12 L 70 12 Q 80 15 75 25 L 75 75 Q 70 88 50 92 Q 30 88 25 75 Z"
              fill="url(#toothGradient)"
              stroke="#4ECDC4"
              strokeWidth="2"
            />
            <path
              d="M 30 45 Q 50 50 70 45"
              fill="none"
              stroke="#4ECDC4"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <path
              d="M 32 65 Q 50 70 68 65"
              fill="none"
              stroke="#4ECDC4"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <path
              d="M 50 25 L 50 80"
              fill="none"
              stroke="#4ECDC4"
              strokeWidth="1"
              opacity="0.4"
            />
          </>
        );
      default:
        return null;
    }
  };

  const renderCleanOverlay = () => {
    const cells: JSX.Element[] = [];
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const cellKey = `${col}-${row}`;
        const isClean = cleanedCells.has(cellKey);
        if (isClean) {
          cells.push(
            <rect
              key={cellKey}
              x={col * cellWidth + 2}
              y={row * cellHeight + 10}
              width={cellWidth - 4}
              height={cellHeight - 4}
              fill="white"
              opacity="0.7"
              rx="3"
              className="animate-fade-in"
            />
          );
        }
      }
    }
    return cells;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className={`w-full h-full max-w-md mx-auto transition-opacity duration-300 ${
          isActive ? 'opacity-100' : 'opacity-40'
        }`}
        style={{ touchAction: 'none' }}
      >
        <defs>
          <linearGradient id="toothGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>
          <linearGradient id="occlusalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#fcd34d" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {showGrid && (
          <g opacity="0.3">
            {Array.from({ length: gridCols + 1 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * cellWidth}
                y1="10"
                x2={i * cellWidth}
                y2="90"
                stroke="#9ca3af"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            ))}
            {Array.from({ length: gridRows + 1 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1="2"
                y1={10 + i * cellHeight}
                x2="98"
                y2={10 + i * cellHeight}
                stroke="#9ca3af"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            ))}
          </g>
        )}

        {renderToothShape()}

        <g clipPath="url(#toothClip)">
          {renderCleanOverlay()}
        </g>

        {cleanliness >= 80 && (
          <g className="animate-sparkle">
            <circle cx="30" cy="30" r="2" fill="white" filter="url(#glow)" />
            <circle cx="70" cy="25" r="1.5" fill="white" filter="url(#glow)" />
            <circle cx="50" cy="75" r="2" fill="white" filter="url(#glow)" />
            <circle cx="80" cy="60" r="1.5" fill="white" filter="url(#glow)" />
          </g>
        )}

        {brushPosition && isActive && (
          <g transform={`translate(${brushPosition.x}, ${brushPosition.y})`}>
            <circle r="8" fill="#4ECDC4" opacity="0.3" className="animate-pulse" />
            <circle r="4" fill="#4ECDC4" opacity="0.6" />
          </g>
        )}
      </svg>

      <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-mint-500 text-white rounded-full text-sm font-medium shadow-md">
        {REGION_NAMES[region]}
      </div>
    </div>
  );
};

export default ToothModel;
