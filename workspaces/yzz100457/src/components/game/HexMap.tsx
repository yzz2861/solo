import { useState, useCallback } from 'react';
import type { HexCoord, CurrentZone, GarbagePatch, SupplyPoint, DangerZone, Boat, HexDirection } from '@/types/game';
import { TERRAIN_COLORS, GARBAGE_COLORS, findTile } from '@/types/level';
import { hexToPixel, hexCorners, HEX_SIZE, HEX_DIRECTIONS, getMapBounds } from '@/utils/hex';
import { useGameStore } from '@/store/gameStore';

const TERRAIN_ORDER = ['water', 'shallow'] as const;

function DirectionArrow({ cx, cy, direction }: { cx: number; cy: number; direction: HexDirection }) {
  const d = HEX_DIRECTIONS[direction];
  const len = HEX_SIZE * 0.35;
  const endX = cx + d.q * len + (d.r * len * 0.5);
  const endY = cy + d.r * len * 1.5;
  const angle = Math.atan2(endY - cy, endX - cx);
  const headLen = 5;
  const headAngle = Math.PI / 6;
  return (
    <g>
      <line x1={cx} y1={cy} x2={endX} y2={endY} stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
      <polygon
        points={`0,0 ${-headLen},${-headLen * 0.6} ${-headLen},${headLen * 0.6}`}
        fill="rgba(255,255,255,0.7)"
        transform={`translate(${endX},${endY}) rotate(${angle * 180 / Math.PI})`}
      />
    </g>
  );
}

function BoatMarker({ boat, isSelected }: { boat: Boat; isSelected: boolean }) {
  const { x, y } = hexToPixel(boat.q, boat.r);
  const loadRatio = boat.capacity > 0 ? boat.currentLoad / boat.capacity : 0;
  return (
    <g transform={`translate(${x},${y})`}>
      {isSelected && <circle r={HEX_SIZE * 0.55} fill="none" stroke="white" strokeWidth="2" strokeDasharray="4 2" opacity={0.6} />}
      <polygon
        points={`0,${-10} ${7},4 ${-7},4`}
        fill={boat.color}
        stroke="white"
        strokeWidth="1.5"
      />
      <rect x={0} y={6} width={1} height={5} fill={boat.color} />
      <line x1={-7} y1={6} x2={7} y2={6} stroke={boat.color} strokeWidth="2" />
      <rect x={-8} y={9} width={16} height={3} rx={1} fill="rgba(0,0,0,0.4)" />
      <rect x={-8} y={9} width={16 * loadRatio} height={3} rx={1} fill={loadRatio >= 0.8 ? '#e74c3c' : loadRatio >= 0.6 ? '#f1c40f' : '#2ecc71'} />
    </g>
  );
}

export default function HexMap() {
  const tiles = useGameStore(s => s.tiles);
  const currents = useGameStore(s => s.currents);
  const garbage = useGameStore(s => s.garbage);
  const supplyPoints = useGameStore(s => s.supplyPoints);
  const dangerZones = useGameStore(s => s.dangerZones);
  const boats = useGameStore(s => s.boats);
  const selectedBoatId = useGameStore(s => s.selectedBoatId);
  const phase = useGameStore(s => s.phase);
  const addRoutePoint = useGameStore(s => s.addRoutePoint);
  const validTileKeys = useGameStore(s => s.validTileKeys);

  const [hoveredHex, setHoveredHex] = useState<string | null>(null);

  const selectedBoat = boats.find(b => b.id === selectedBoatId) ?? null;

  const currentMap = new Map<string, CurrentZone[]>();
  for (const c of currents) {
    const key = `${c.q},${c.r}`;
    if (!currentMap.has(key)) currentMap.set(key, []);
    currentMap.get(key)!.push(c);
  }

  const garbageMap = new Map<string, GarbagePatch[]>();
  for (const g of garbage) {
    const key = `${g.q},${g.r}`;
    if (!garbageMap.has(key)) garbageMap.set(key, []);
    garbageMap.get(key)!.push(g);
  }

  const supplySet = new Set(supplyPoints.map(s => `${s.q},${s.r}`));
  const dangerSet = new Set(dangerZones.map(d => `${d.q},${d.r}`));

  const bounds = getMapBounds(tiles);
  const pad = HEX_SIZE * 2;
  const viewBox = `${bounds.minX - pad} ${bounds.minY - pad} ${bounds.maxX - bounds.minX + pad * 2} ${bounds.maxY - bounds.minY + pad * 2}`;

  const handleHexClick = useCallback((q: number, r: number) => {
    if (phase !== 'planning' || !selectedBoatId) return;
    const key = `${q},${r}`;
    if (!validTileKeys.has(key)) return;
    addRoutePoint(q, r);
  }, [phase, selectedBoatId, addRoutePoint, validTileKeys]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = (bounds.maxX - bounds.minX + pad * 2) / rect.width;
    const scaleY = (bounds.maxY - bounds.minY + pad * 2) / rect.height;
    const px = (e.clientX - rect.left) * scaleX + (bounds.minX - pad);
    const py = (e.clientY - rect.top) * scaleY + (bounds.minY - pad);
    const hex = pixelToHexLocal(px, py);
    const key = `${hex.q},${hex.r}`;
    if (validTileKeys.has(key)) {
      setHoveredHex(key);
    } else {
      setHoveredHex(null);
    }
  }, [bounds, pad, validTileKeys]);

  const handleMouseLeave = useCallback(() => setHoveredHex(null), []);

  function pixelToHexLocal(x: number, y: number): HexCoord {
    const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / HEX_SIZE;
    const r = ((2 / 3) * y) / HEX_SIZE;
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(s);
    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return { q: rq, r: rr };
  }

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full"
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d2137 50%, #0f2a46 100%)' }}
      onClick={(e) => {
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const scaleX = (bounds.maxX - bounds.minX + pad * 2) / rect.width;
        const scaleY = (bounds.maxY - bounds.minY + pad * 2) / rect.height;
        const px = (e.clientX - rect.left) * scaleX + (bounds.minX - pad);
        const py = (e.clientY - rect.top) * scaleY + (bounds.minY - pad);
        const hex = pixelToHexLocal(px, py);
        handleHexClick(hex.q, hex.r);
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <defs>
        <pattern id="danger-pattern" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(231,76,60,0.5)" strokeWidth="3" />
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <style>{`
          @keyframes wave {
            0%, 100% { opacity: 0.85; }
            50% { opacity: 1; }
          }
          .water-tile { animation: wave 3s ease-in-out infinite; }
        `}</style>
      </defs>

      <g>
        {tiles.map(tile => {
          const { x, y } = hexToPixel(tile.q, tile.r);
          const corners = hexCorners(x, y, HEX_SIZE - 1);
          const points = corners.map(c => `${c.x},${c.y}`).join(' ');
          const key = `${tile.q},${tile.r}`;
          const isHovered = hoveredHex === key;
          const isWater = TERRAIN_ORDER.includes(tile.terrain as any);
          const terrainColor = TERRAIN_COLORS[tile.terrain];

          return (
            <polygon
              key={key}
              points={points}
              fill={terrainColor}
              className={isWater ? 'water-tile' : undefined}
              stroke={isHovered && phase === 'planning' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.3)'}
              strokeWidth={isHovered && phase === 'planning' ? 2.5 : 1}
              style={isWater ? { animationDelay: `${(tile.q * 0.3 + tile.r * 0.5) % 3}s` } : undefined}
            />
          );
        })}
      </g>

      <g>
        {Array.from(currentMap.entries()).map(([key, zoneList]) => {
          const [q, r] = key.split(',').map(Number);
          const { x, y } = hexToPixel(q, r);
          return zoneList.map((c, i) => (
            <DirectionArrow key={`${key}-${i}`} cx={x} cy={y} direction={c.direction} />
          ));
        })}
      </g>

      <g>
        {Array.from(garbageMap.entries()).map(([key, patchList]) => {
          const [q, r] = key.split(',').map(Number);
          const { x, y } = hexToPixel(q, r);
          return patchList.map((g, i) => {
            const color = GARBAGE_COLORS[g.type];
            const offsetY = (i - (patchList.length - 1) / 2) * 12;
            return (
              <g key={g.id} transform={`translate(${x},${y + offsetY})`}>
                <circle r={8} fill={color} stroke="rgba(0,0,0,0.4)" strokeWidth="1" opacity={0.9} />
                <text textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#1a1a2e" fontWeight="bold">
                  {g.amount}
                </text>
              </g>
            );
          });
        })}
      </g>

      <g>
        {supplyPoints.map((sp, i) => {
          const { x, y } = hexToPixel(sp.q, sp.r);
          return (
            <g key={i} transform={`translate(${x},${y})`}>
              <circle r={9} fill="#2980b9" stroke="white" strokeWidth="1.5" />
              <path d="M-4,-2 L0,-6 L4,-2 L3,-2 L3,3 L-3,3 L-3,-2 Z" fill="white" />
              <line x1="0" y1="3" x2="0" y2="6" stroke="white" strokeWidth="2" />
              <line x1="-3" y1="6" x2="3" y2="6" stroke="white" strokeWidth="1.5" />
            </g>
          );
        })}
      </g>

      <g>
        {dangerZones.map((dz, i) => {
          const { x, y } = hexToPixel(dz.q, dz.r);
          const corners = hexCorners(x, y, HEX_SIZE - 1);
          const points = corners.map(c => `${c.x},${c.y}`).join(' ');
          return (
            <g key={i}>
              <polygon points={points} fill="rgba(231,76,60,0.25)" stroke="rgba(231,76,60,0.6)" strokeWidth="1.5" />
              <polygon points={points} fill="url(#danger-pattern)" />
            </g>
          );
        })}
      </g>

      {selectedBoat && selectedBoat.route.length >= 2 && (
        <polyline
          points={selectedBoat.route
            .map(pt => {
              const { x, y } = hexToPixel(pt.q, pt.r);
              return `${x},${y}`;
            })
            .join(' ')}
          fill="none"
          stroke={selectedBoat.color}
          strokeWidth="2.5"
          strokeDasharray="6 4"
          opacity={0.8}
          filter="url(#glow)"
        />
      )}

      <g>
        {boats.map(boat => (
          <BoatMarker key={boat.id} boat={boat} isSelected={boat.id === selectedBoatId} />
        ))}
      </g>
    </svg>
  );
}
