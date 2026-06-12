import { useRef, useState, useEffect, useCallback } from 'react';
import { Bike, Construction, Signpost, Car, Zap, AlertTriangle, MapPin, Eye, Trash2, Newspaper, CircleDot } from 'lucide-react';
import type { Block, Obstacle, ObstacleType, ClickRecord } from '../../types';

interface MapCanvasProps {
  block: Block;
  onObstacleClick?: (obstacle: Obstacle) => void;
  onMapClick?: (x: number, y: number) => void;
  foundObstacles?: Map<string, ClickRecord>;
  falsePositiveClicks?: ClickRecord[];
  showAllObstacles?: boolean;
  selectedObstacleId?: string | null;
  interactive?: boolean;
  highlightMissed?: boolean;
}

const OBSTACLE_ICONS: Record<ObstacleType, typeof Bike> = {
  shared_bike: Bike,
  low_signboard: Signpost,
  construction: Construction,
  crossing_gap: Zap,
  parked_car: Car,
  utility_pole: MapPin,
  manhole_cover: CircleDot,
  side_object: Eye,
  temp_construction: Construction,
  low_visibility: Eye,
  trash_bin: Trash2,
  newsstand: Newspaper,
};

const OBSTACLE_COLORS: Record<ObstacleType, string> = {
  shared_bike: '#FF9800',
  low_signboard: '#9C27B0',
  construction: '#795548',
  crossing_gap: '#F44336',
  parked_car: '#2196F3',
  utility_pole: '#607D8B',
  manhole_cover: '#3F51B5',
  side_object: '#4CAF50',
  temp_construction: '#FF9800',
  low_visibility: '#673AB7',
  trash_bin: '#8BC34A',
  newsstand: '#FF5722',
};

export default function MapCanvas({
  block,
  onObstacleClick,
  onMapClick,
  foundObstacles = new Map(),
  falsePositiveClicks = [],
  showAllObstacles = false,
  selectedObstacleId = null,
  interactive = true,
  highlightMissed = false,
}: MapCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(1);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: block.mapWidth, h: block.mapHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setViewBox({ x: 0, y: 0, w: block.mapWidth, h: block.mapHeight });
    setScale(1);
  }, [block.id, block.mapWidth, block.mapHeight]);

  const getSvgPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
      const y = ((clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;
      return { x, y };
    },
    [viewBox]
  );

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive) return;
    if (e.target !== svgRef.current) return;

    const point = getSvgPoint(e.clientX, e.clientY);
    onMapClick?.(point.x, point.y);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.5, Math.min(3, scale * delta));

    if (newScale !== scale) {
      const point = getSvgPoint(e.clientX, e.clientY);
      const newW = block.mapWidth / newScale;
      const newH = block.mapHeight / newScale;
      const ratio = (newScale - scale) / (newScale * scale);

      setScale(newScale);
      setViewBox({
        x: viewBox.x + point.x * ratio * viewBox.w,
        y: viewBox.y + point.y * ratio * viewBox.h,
        w: newW,
        h: newH,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.shiftKey) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = ((e.clientX - dragStart.x) / (svgRef.current?.clientWidth || 1)) * viewBox.w;
    const dy = ((e.clientY - dragStart.y) / (svgRef.current?.clientHeight || 1)) * viewBox.h;

    setViewBox((prev) => ({
      ...prev,
      x: prev.x - dx,
      y: prev.y - dy,
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const renderBlindPath = () => {
    if (block.blindPathPoints.length < 2) return null;

    const pathD = block.blindPathPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    return (
      <g>
        <path
          d={pathD}
          fill="none"
          stroke="#FFF3CD"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={pathD}
          fill="none"
          stroke="#F5A623"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 12"
          style={{
            strokeDashoffset: 0,
            animation: 'dash 3s linear infinite',
          }}
        />
        <path
          d={pathD}
          fill="none"
          stroke="rgba(245, 166, 35, 0.3)"
          strokeWidth="28"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2 8"
        />
      </g>
    );
  };

  const renderBuildings = () => {
    return block.buildings.map((b, i) => (
      <g key={`building-${i}`}>
        <rect
          x={b.x}
          y={b.y}
          width={b.width}
          height={b.height}
          fill={b.color || '#E8DCC4'}
          stroke="#B8A88A"
          strokeWidth="1"
          rx="4"
        />
        <rect
          x={b.x + 4}
          y={b.y + 4}
          width={b.width - 8}
          height={b.height - 8}
          fill="rgba(255,255,255,0.15)"
          rx="2"
        />
      </g>
    ));
  };

  const renderRoads = () => {
    return block.roads.map((r, i) => (
      <line
        key={`road-${i}`}
        x1={r.x1}
        y1={r.y1}
        x2={r.x2}
        y2={r.y2}
        stroke="#4A4A4A"
        strokeWidth={r.width}
        strokeLinecap="butt"
      />
    ));
  };

  const renderObstacles = () => {
    return block.obstacles.map((obstacle) => {
      const isFound = foundObstacles.has(obstacle.id);
      const isSelected = selectedObstacleId === obstacle.id;
      const isMissed = highlightMissed && !isFound && !obstacle.isFalsePositive;

      if (!showAllObstacles && !isFound && !isSelected) {
        return null;
      }

      const Icon = OBSTACLE_ICONS[obstacle.type] || AlertTriangle;
      const color = isMissed
        ? '#E53935'
        : isFound
        ? '#4CAF50'
        : OBSTACLE_COLORS[obstacle.type];

      return (
        <g
          key={obstacle.id}
          className="obstacle-marker"
          onClick={(e) => {
            e.stopPropagation();
            onObstacleClick?.(obstacle);
          }}
          style={{ cursor: interactive ? 'pointer' : 'default' }}
        >
          {isSelected && (
            <circle
              cx={obstacle.x}
              cy={obstacle.y}
              r="24"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeDasharray="4 2"
              style={{
                animation: 'spin 4s linear infinite',
                transformOrigin: `${obstacle.x}px ${obstacle.y}px`,
              }}
            />
          )}
          <circle
            cx={obstacle.x}
            cy={obstacle.y}
            r="18"
            fill="white"
            stroke={color}
            strokeWidth="3"
          />
          <foreignObject
            x={obstacle.x - 12}
            y={obstacle.y - 12}
            width="24"
            height="24"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              <Icon size={18} color={color} />
            </div>
          </foreignObject>
          {isFound && (
            <circle
              cx={obstacle.x + 12}
              cy={obstacle.y - 12}
              r="8"
              fill="#4CAF50"
            />
          )}
          {isMissed && (
            <circle
              cx={obstacle.x + 12}
              cy={obstacle.y - 12}
              r="8"
              fill="#E53935"
            />
          )}
        </g>
      );
    });
  };

  const renderFalsePositives = () => {
    return falsePositiveClicks.map((click) => (
      <g key={`fp-${click.id}`}>
        <circle
          cx={click.clickX}
          cy={click.clickY}
          r="14"
          fill="rgba(229, 57, 53, 0.2)"
          stroke="#E53935"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
        <text
          x={click.clickX}
          y={click.clickY + 4}
          textAnchor="middle"
          fontSize="14"
          fill="#E53935"
          fontWeight="bold"
        >
          ✕
        </text>
      </g>
    ));
  };

  return (
    <div
      className="map-container relative w-full h-full bg-slate-100 rounded-lg overflow-hidden"
      style={{ cursor: isDragging ? 'grabbing' : interactive ? 'crosshair' : 'default' }}
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-full"
        onClick={handleSvgClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect
          x={viewBox.x - 100}
          y={viewBox.y - 100}
          width={viewBox.w + 200}
          height={viewBox.h + 200}
          fill="#F5F5F0"
        />
        <rect
          x={viewBox.x - 100}
          y={viewBox.y - 100}
          width={viewBox.w + 200}
          height={viewBox.h + 200}
          fill="url(#grid)"
        />

        {renderRoads()}
        {renderBuildings()}
        {renderBlindPath()}
        {renderObstacles()}
        {renderFalsePositives()}

        <style>{`
          @keyframes dash {
            to {
              stroke-dashoffset: -16;
            }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .obstacle-marker {
            transition: transform 0.2s ease;
          }
          .obstacle-marker:hover {
            transform: scale(1.1);
            transform-box: fill-box;
            transform-origin: center;
          }
        `}</style>
      </svg>

      {interactive && (
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 bg-white/90 backdrop-blur rounded-lg shadow-md p-1">
          <button
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors text-lg font-medium"
            onClick={() => {
              const newScale = Math.min(3, scale * 1.3);
              setScale(newScale);
              const newW = block.mapWidth / newScale;
              const newH = block.mapHeight / newScale;
              const cx = viewBox.x + viewBox.w / 2;
              const cy = viewBox.y + viewBox.h / 2;
              setViewBox({
                x: cx - newW / 2,
                y: cy - newH / 2,
                w: newW,
                h: newH,
              });
            }}
          >
            +
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors text-lg font-medium"
            onClick={() => {
              const newScale = Math.max(0.5, scale / 1.3);
              setScale(newScale);
              const newW = block.mapWidth / newScale;
              const newH = block.mapHeight / newScale;
              const cx = viewBox.x + viewBox.w / 2;
              const cy = viewBox.y + viewBox.h / 2;
              setViewBox({
                x: cx - newW / 2,
                y: cy - newH / 2,
                w: newW,
                h: newH,
              });
            }}
          >
            −
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors text-sm"
            onClick={() => {
              setScale(1);
              setViewBox({ x: 0, y: 0, w: block.mapWidth, h: block.mapHeight });
            }}
          >
            ⌂
          </button>
        </div>
      )}
    </div>
  );
}
