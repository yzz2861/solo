import React, { useCallback, useMemo, useState } from 'react';
import { Stone } from '@/components/Stone/Stone';
import { LibertyMarker } from '@/components/LibertyMarker/LibertyMarker';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import type { Position, StoneColor } from '@/types';
import { cn } from '@/lib/utils';

interface GoBoardProps {
  size?: number;
  showCoordinates?: boolean;
  onCellClick?: (pos: Position) => void;
  disabled?: boolean;
  className?: string;
}

export function GoBoard({
  size = 7,
  showCoordinates = true,
  onCellClick,
  disabled = false,
  className,
}: GoBoardProps) {
  const {
    board,
    boardSize,
    stoneGroups,
    showLiberties,
    lastMove,
    lastCapturedStones,
    makeMove,
    setIsAnimating,
    isAnimating,
    currentProblem,
  } = useGameStore();

  const { addAttempt } = useProgressStore();
  const [hoveredPos, setHoveredPos] = useState<Position | null>(null);

  const cellSize = useMemo(() => {
    const maxSize = Math.min(500, window.innerWidth - 40);
    return Math.floor(maxSize / boardSize);
  }, [boardSize]);

  const starPoints = useMemo(() => {
    if (boardSize === 7) {
      return [
        { row: 2, col: 2 }, { row: 2, col: 4 },
        { row: 4, col: 2 }, { row: 4, col: 4 },
        { row: 3, col: 3 },
      ];
    }
    if (boardSize === 9) {
      return [
        { row: 2, col: 2 }, { row: 2, col: 6 },
        { row: 6, col: 2 }, { row: 6, col: 6 },
        { row: 4, col: 4 },
      ];
    }
    return [];
  }, [boardSize]);

  const libertyMap = useMemo(() => {
    const map = new Map<string, number>();
    const posKey = (p: Position) => `${p.row},${p.col}`;
    
    stoneGroups.forEach(group => {
      group.stones.forEach(stone => {
        map.set(posKey(stone), group.libertyCount);
      });
    });
    
    return map;
  }, [stoneGroups]);

  const handleCellClick = useCallback(async (pos: Position) => {
    if (disabled || isAnimating) return;
    if (!currentProblem) return;

    setIsAnimating(true);
    
    const result = await makeMove(pos);
    
    addAttempt(currentProblem.id, {
      problemId: currentProblem.id,
      position: pos,
      isCorrect: result.isCorrect,
      errorType: result.errorType,
      timestamp: Date.now(),
    });

    if (lastCapturedStones.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsAnimating(false);
    
    onCellClick?.(pos);
  }, [disabled, isAnimating, currentProblem, makeMove, addAttempt, lastCapturedStones, onCellClick, setIsAnimating]);

  const renderGrid = () => {
    const grid = [];
    const padding = cellSize / 2;
    
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const isStarPoint = starPoints.some(p => p.row === row && p.col === col);
        const stone = board[row]?.[col];
        const posKey = `${row},${col}`;
        const libertyCount = libertyMap.get(posKey);
        const isLast = lastMove?.row === row && lastMove?.col === col;
        const isCaptured = lastCapturedStones.some(p => p.row === row && p.col === col);
        const isHovered = hoveredPos?.row === row && hoveredPos?.col === col;

        const lines = [];
        if (row < boardSize - 1) {
          lines.push(
            <line
              key={`v-${row}-${col}`}
              x1={padding + col * cellSize}
              y1={padding + row * cellSize}
              x2={padding + col * cellSize}
              y2={padding + (row + 1) * cellSize}
              stroke="#4A3728"
              strokeWidth="1"
            />
          );
        }
        if (col < boardSize - 1) {
          lines.push(
            <line
              key={`h-${row}-${col}`}
              x1={padding + col * cellSize}
              y1={padding + row * cellSize}
              x2={padding + (col + 1) * cellSize}
              y2={padding + row * cellSize}
              stroke="#4A3728"
              strokeWidth="1"
            />
          );
        }

        grid.push(
          <g key={`cell-${row}-${col}`}>
            {lines}
            {isStarPoint && (
              <circle
                cx={padding + col * cellSize}
                cy={padding + row * cellSize}
                r={4}
                fill="#4A3728"
              />
            )}
            <rect
              className={cn(
                'cursor-pointer transition-all duration-150',
                !stone && !disabled && !isAnimating && 'hover:fill-black hover:fill-opacity-10',
                isHovered && !stone && !disabled && !isAnimating && 'fill-black fill-opacity-10'
              )}
              x={padding + col * cellSize - cellSize / 2}
              y={padding + row * cellSize - cellSize / 2}
              width={cellSize}
              height={cellSize}
              fill="transparent"
              onClick={() => handleCellClick({ row, col })}
              onMouseEnter={() => setHoveredPos({ row, col })}
              onMouseLeave={() => setHoveredPos(null)}
            />
          </g>
        );
      }
    }
    return grid;
  };

  const renderStones = () => {
    const padding = cellSize / 2;
    const stoneSize = cellSize * 0.9;
    
    return board.map((row, rowIndex) =>
      row.map((stone, colIndex) => {
        if (!stone) return null;
        
        const posKey = `${rowIndex},${colIndex}`;
        const libertyCount = libertyMap.get(posKey);
        const isLast = lastMove?.row === rowIndex && lastMove?.col === colIndex;
        const isCaptured = lastCapturedStones.some(
          p => p.row === rowIndex && p.col === colIndex
        );

        return (
          <g key={`stone-${rowIndex}-${colIndex}`}>
            <foreignObject
              x={padding + colIndex * cellSize - stoneSize / 2}
              y={padding + rowIndex * cellSize - stoneSize / 2}
              width={stoneSize}
              height={stoneSize}
            >
              <div className="flex items-center justify-center w-full h-full">
                <Stone
                  color={stone}
                  size={stoneSize}
                  isLastMove={isLast}
                  isCaptured={isCaptured}
                />
                {showLiberties && libertyCount !== undefined && (
                  <div className="absolute -top-1 -right-1 z-10">
                    <LibertyMarker count={libertyCount} size={stoneSize * 0.4} />
                  </div>
                )}
              </div>
            </foreignObject>
          </g>
        );
      })
    );
  };

  const renderCoordinates = () => {
    if (!showCoordinates) return null;
    
    const padding = cellSize / 2;
    const letters = 'ABCDEFGHJKLMNOPQRST';
    const coords = [];
    
    for (let i = 0; i < boardSize; i++) {
      coords.push(
        <text
          key={`col-top-${i}`}
          x={padding + i * cellSize}
          y={12}
          textAnchor="middle"
          className="text-xs fill-gray-600 select-none"
          fontSize="10"
        >
          {letters[i]}
        </text>,
        <text
          key={`row-left-${i}`}
          x={8}
          y={padding + i * cellSize + 4}
          textAnchor="middle"
          className="text-xs fill-gray-600 select-none"
          fontSize="10"
        >
          {boardSize - i}
        </text>
      );
    }
    
    return coords;
  };

  const boardWidth = cellSize * (boardSize - 1) + cellSize;
  const boardHeight = cellSize * (boardSize - 1) + cellSize;

  return (
    <div className={cn('relative', className)}>
      <div
        className="relative rounded-lg shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #D4A574 0%, #C4956A 50%, #B8865A 100%)',
          width: `${boardWidth + 20}px`,
          height: `${boardHeight + 20}px`,
          padding: '10px',
        }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(0,0,0,0.03) 10px,
              rgba(0,0,0,0.03) 20px
            )`,
          }}
        />
        <svg
          width={boardWidth}
          height={boardHeight}
          className="relative"
        >
          {renderCoordinates()}
          {renderGrid()}
          {renderStones()}
        </svg>
      </div>
    </div>
  );
}
