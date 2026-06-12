import { useState, useCallback } from 'react';
import type { HexCoord, HexDirection } from '@/types/game';
import { TERRAIN_COLORS, GARBAGE_COLORS, findTile, hexCoordKey } from '@/types/level';
import { hexToPixel, hexCorners, HEX_SIZE, HEX_DIRECTIONS, getMapBounds } from '@/utils/hex';
import { useEditorStore } from '@/store/editorStore';

function DirectionArrow({ cx, cy, direction }: { cx: number; cy: number; direction: HexDirection }) {
  const d = HEX_DIRECTIONS[direction];
  const len = HEX_SIZE * 0.35;
  const endX = cx + d.q * len + (d.r * len * 0.5);
  const endY = cy + d.r * len * 1.5;
  const angle = Math.atan2(endY - cy, endX - cx);
  const headLen = 5;
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

const TOOL_HOVER_COLORS: Record<string, string> = {
  terrain: 'rgba(255,255,255,0.3)',
  current: 'rgba(0,200,255,0.3)',
  garbage: 'rgba(46,204,113,0.3)',
  supply: 'rgba(41,128,185,0.3)',
  danger: 'rgba(231,76,60,0.3)',
  boat: 'rgba(0,212,170,0.3)',
  eraser: 'rgba(255,255,255,0.15)',
};

export default function EditorMap() {
  const level = useEditorStore(s => s.level);
  const activeTool = useEditorStore(s => s.activeTool);
  const terrainBrush = useEditorStore(s => s.terrainBrush);
  const handleHexClick = useEditorStore(s => s.handleHexClick);
  const handleHexDrag = useEditorStore(s => s.handleHexDrag);

  const [hoveredHex, setHoveredHex] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { tiles, currents, garbage, supplyPoints, dangerZones, boats } = level;

  const currentMap = new Map<string, typeof currents>();
  for (const c of currents) {
    const key = hexCoordKey(c.q, c.r);
    if (!currentMap.has(key)) currentMap.set(key, []);
    currentMap.get(key)!.push(c);
  }

  const garbageMap = new Map<string, typeof garbage>();
  for (const g of garbage) {
    const key = hexCoordKey(g.q, g.r);
    if (!garbageMap.has(key)) garbageMap.set(key, []);
    garbageMap.get(key)!.push(g);
  }

  const bounds = getMapBounds(tiles);
  const pad = HEX_SIZE * 2;
  const viewBox = `${bounds.minX - pad} ${bounds.minY - pad} ${bounds.maxX - bounds.minX + pad * 2} ${bounds.maxY - bounds.minY + pad * 2}`;

  const pixelToHexLocal = useCallback((x: number, y: number): HexCoord => {
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
  }, []);

  const getSvgCoords = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = (bounds.maxX - bounds.minX + pad * 2) / rect.width;
    const scaleY = (bounds.maxY - bounds.minY + pad * 2) / rect.height;
    const px = (e.clientX - rect.left) * scaleX + (bounds.minX - pad);
    const py = (e.clientY - rect.top) * scaleY + (bounds.minY - pad);
    return pixelToHexLocal(px, py);
  }, [bounds, pad, pixelToHexLocal]);

  const onHexDown = useCallback((q: number, r: number) => {
    setIsDragging(true);
    handleHexClick(q, r);
  }, [handleHexClick]);

  const onHexMove = useCallback((q: number, r: number) => {
    setHoveredHex(hexCoordKey(q, r));
    if (isDragging) handleHexDrag(q, r);
  }, [isDragging, handleHexDrag]);

  const onMouseUp = useCallback(() => setIsDragging(false), []);
  const onMouseLeave = useCallback(() => { setHoveredHex(null); setIsDragging(false); }, []);

  const hoverColor = activeTool === 'terrain'
    ? TERRAIN_COLORS[terrainBrush]
    : TOOL_HOVER_COLORS[activeTool] || 'rgba(255,255,255,0.2)';

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full"
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d2137 50%, #0f2a46 100%)' }}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      <defs>
        <pattern id="editor-danger" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(231,76,60,0.5)" strokeWidth="3" />
        </pattern>
      </defs>

      <g>
        {tiles.map(tile => {
          const { x, y } = hexToPixel(tile.q, tile.r);
          const corners = hexCorners(x, y, HEX_SIZE - 1);
          const points = corners.map(c => `${c.x},${c.y}`).join(' ');
          const key = hexCoordKey(tile.q, tile.r);
          const isHovered = hoveredHex === key;
          return (
            <polygon
              key={key}
              points={points}
              fill={TERRAIN_COLORS[tile.terrain]}
              stroke={isHovered ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.3)'}
              strokeWidth={isHovered ? 2.5 : 1}
              style={{ cursor: 'pointer' }}
              onMouseDown={() => onHexDown(tile.q, tile.r)}
              onMouseEnter={() => onHexMove(tile.q, tile.r)}
              onMouseMove={() => onHexMove(tile.q, tile.r)}
            />
          );
        })}
      </g>

      {hoveredHex && (() => {
        const [hq, hr] = hoveredHex.split(',').map(Number);
        const tile = findTile(tiles, hq, hr);
        if (!tile) return null;
        const { x, y } = hexToPixel(hq, hr);
        const corners = hexCorners(x, y, HEX_SIZE - 1);
        const points = corners.map(c => `${c.x},${c.y}`).join(' ');
        return <polygon points={points} fill={hoverColor} stroke="rgba(255,255,255,0.6)" strokeWidth="2" pointerEvents="none" />;
      })()}

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
                <text textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#1a1a2e" fontWeight="bold">{g.amount}</text>
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
              <polygon points={points} fill="url(#editor-danger)" />
            </g>
          );
        })}
      </g>

      <g>
        {boats.map(boat => {
          const { x, y } = hexToPixel(boat.q, boat.r);
          return (
            <g key={boat.id} transform={`translate(${x},${y})`}>
              <polygon points={`0,${-10} ${7},4 ${-7},4`} fill={boat.color} stroke="white" strokeWidth="1.5" />
              <line x1={-7} y1={6} x2={7} y2={6} stroke={boat.color} strokeWidth="2" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
