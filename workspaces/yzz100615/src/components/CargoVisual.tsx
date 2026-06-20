import { useRef, useState, useCallback, useEffect } from 'react';
import type { Cargo } from '@/types';
import { checkCargoOutOfCarriage } from '@/utils/calculator';

interface CargoVisualProps {
  cargoes: Cargo[];
  carriageLength: number;
  wheelbase: number;
  carriageOffset?: number;
  onCargoMove?: (cargoId: string, newPosition: number) => void;
  selectedCargoId?: string | null;
  onSelectCargo?: (cargoId: string | null) => void;
  height?: number;
}

export default function CargoVisual({
  cargoes,
  carriageLength,
  wheelbase,
  carriageOffset = 0,
  onCargoMove,
  selectedCargoId,
  onSelectCargo,
  height = 120,
}: CargoVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const getPixelPerMm = useCallback(() => {
    if (!containerRef.current) return 0.1;
    const containerWidth = containerRef.current.clientWidth - 40;
    return containerWidth / carriageLength;
  }, [carriageLength]);

  const handleMouseDown = (e: React.MouseEvent, cargo: Cargo) => {
    e.stopPropagation();
    if (!onCargoMove) return;
    setDraggingId(cargo.id);
    onSelectCargo?.(cargo.id);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    setDragOffset(offsetX);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingId || !containerRef.current || !onCargoMove) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pixelPerMm = getPixelPerMm();
      const relativeX = e.clientX - rect.left - 20 - dragOffset;
      let position = relativeX / pixelPerMm;
      const cargo = cargoes.find((c) => c.id === draggingId);
      if (!cargo) return;
      const halfWidth = cargo.width / 2;
      position = Math.max(halfWidth, Math.min(carriageLength - halfWidth, position));
      onCargoMove(draggingId, Math.round(position));
    },
    [draggingId, cargoes, carriageLength, getPixelPerMm, onCargoMove, dragOffset],
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleTouchStart = (e: React.TouchEvent, cargo: Cargo) => {
    e.stopPropagation();
    if (!onCargoMove) return;
    setDraggingId(cargo.id);
    onSelectCargo?.(cargo.id);
    const touch = e.touches[0];
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const offsetX = touch.clientX - rect.left - rect.width / 2;
    setDragOffset(offsetX);
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!draggingId || !containerRef.current || !onCargoMove) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const pixelPerMm = getPixelPerMm();
      const relativeX = touch.clientX - rect.left - 20 - dragOffset;
      let position = relativeX / pixelPerMm;
      const cargo = cargoes.find((c) => c.id === draggingId);
      if (!cargo) return;
      const halfWidth = cargo.width / 2;
      position = Math.max(halfWidth, Math.min(carriageLength - halfWidth, position));
      onCargoMove(draggingId, Math.round(position));
    },
    [draggingId, cargoes, carriageLength, getPixelPerMm, onCargoMove, dragOffset],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  const pixelPerMm = getPixelPerMm();

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden"
      style={{ height: height + 60 }}
      onClick={() => onSelectCargo?.(null)}
    >
      <div className="absolute top-2 left-5 right-5 flex justify-between text-xs text-gray-500">
        <span>前</span>
        <span className="text-blue-600 font-medium">车厢侧视图</span>
        <span>后</span>
      </div>

      <div
        className="absolute bg-amber-100 border-2 border-amber-300 rounded"
        style={{
          left: 20,
          top: 28,
          width: carriageLength * pixelPerMm,
          height: height - 10,
        }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-amber-400" />
      </div>

      <div
        className="absolute w-3 h-3 bg-slate-700 rounded-full -translate-x-1/2"
        style={{
          left: 20 + carriageOffset * pixelPerMm,
          top: 28 + height - 4,
        }}
        title="前轴"
      />
      <div
        className="absolute w-3 h-3 bg-slate-700 rounded-full -translate-x-1/2"
        style={{
          left: 20 + (carriageOffset + wheelbase) * pixelPerMm,
          top: 28 + height - 4,
        }}
        title="后轴"
      />

      {cargoes.map((cargo) => {
        const { outOfBounds } = checkCargoOutOfCarriage(cargo, carriageLength, 0);
        const isSelected = selectedCargoId === cargo.id;
        const isDragging = draggingId === cargo.id;

        return (
          <div
            key={cargo.id}
            className={`absolute rounded cursor-grab transition-all ${
              isDragging ? 'cursor-grabbing z-20 scale-105 shadow-lg' : 'z-10'
            } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''} ${
              outOfBounds ? 'animate-pulse' : ''
            }`}
            style={{
              left: 20 + (cargo.position - cargo.width / 2) * pixelPerMm,
              top: 35,
              width: cargo.width * pixelPerMm,
              height: height - 25,
              backgroundColor: cargo.color,
              opacity: outOfBounds ? 0.6 : 0.9,
              border: outOfBounds ? '2px dashed #ef4444' : '1px solid rgba(0,0,0,0.2)',
              transition: isDragging ? 'none' : 'all 0.2s ease',
            }}
            onMouseDown={(e) => handleMouseDown(e, cargo)}
            onTouchStart={(e) => handleTouchStart(e, cargo)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectCargo?.(cargo.id);
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium px-1 text-center overflow-hidden">
              <span className="truncate drop-shadow-sm">{cargo.name}</span>
            </div>
            {outOfBounds && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-red-500 font-bold whitespace-nowrap">
                超出边界
              </div>
            )}
          </div>
        );
      })}

      <div className="absolute bottom-1 left-5 right-5 flex justify-between text-xs text-gray-400">
        <span>0</span>
        <span>{(carriageLength / 1000).toFixed(1)} m</span>
      </div>
    </div>
  );
}
