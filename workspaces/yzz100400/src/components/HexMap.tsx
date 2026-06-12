import React, { useMemo, useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import HexCell, { HexGlowFilter } from "./HexCell";
import type { HexCoord, TouristGroup, RescueBoat } from "@/types/game";
import { hexToPixel, hexKey } from "@/engine/hexUtils";

interface HexMapProps {
  size?: number;
}

const RISK_COLORS: Record<string, string> = {
  low: "#10B981",
  medium: "#F59E0B",
  high: "#FF6B6B",
  critical: "#DC2626",
};

const BOAT_COLORS: Record<string, string> = {
  idle: "#00C9A7",
  moving: "#3B82F6",
  loading: "#F59E0B",
  returning: "#8B5CF6",
};

function TouristMarker({
  group,
  size,
}: {
  group: TouristGroup;
  size: number;
}) {
  const pos = hexToPixel(group.position.q, group.position.r, size);
  const color = RISK_COLORS[group.riskLevel] || "#10B981";
  const radius = size * 0.32;

  return (
    <g transform={`translate(${pos.x}, ${pos.y})`}>
      <circle r={radius} fill={color} stroke="#fff" strokeWidth={1.5} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={radius * 0.95}
        fill="#fff"
        fontWeight="bold"
        pointerEvents="none"
      >
        {group.count}
      </text>
      <rect
        x={-radius}
        y={radius + 2}
        width={radius * 2}
        height={3}
        rx={1.5}
        fill="rgba(0,0,0,0.3)"
      />
      <rect
        x={-radius}
        y={radius + 2}
        width={radius * 2 * (group.stamina / group.maxStamina)}
        height={3}
        rx={1.5}
        fill={color}
      />
      {group.rescued && (
        <g>
          <circle r={radius + 2} fill="none" stroke="#10B981" strokeWidth={2} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={radius * 0.7}
            fill="#10B981"
            fontWeight="bold"
            x={radius * 0.5}
            y={-radius * 0.5}
          >
            ✓
          </text>
        </g>
      )}
    </g>
  );
}

function BoatMarker({
  boat,
  size,
  isSelected,
  onSelect,
}: {
  boat: RescueBoat;
  size: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const pos = hexToPixel(boat.position.q, boat.position.r, size);
  const color = BOAT_COLORS[boat.status] || "#00C9A7";
  const s = size * 0.3;

  return (
    <g transform={`translate(${pos.x}, ${pos.y})`} onClick={onSelect} style={{ cursor: "pointer" }}>
      {isSelected && (
        <circle r={s + 6} fill="none" stroke="#00C9A7" strokeWidth={2} opacity={0.7}>
          <animate
            attributeName="r"
            values={`${s + 4};${s + 10};${s + 4}`}
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.7;0.2;0.7"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      <polygon
        points={`0,${-s} ${s * 0.6},${s * 0.3} ${s * 0.4},${s} ${-s * 0.4},${s} ${-s * 0.6},${s * 0.3}`}
        fill={color}
        stroke="#fff"
        strokeWidth={1}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        y={s * 0.2}
        fontSize={s * 0.6}
        fill="#fff"
        pointerEvents="none"
      >
        {boat.currentLoad}/{boat.capacity}
      </text>
    </g>
  );
}

function PathLine({
  path,
  size,
  color,
}: {
  path: HexCoord[];
  size: number;
  color: string;
}) {
  if (path.length < 2) return null;
  const points = path
    .map((c) => {
      const p = hexToPixel(c.q, c.r, size);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <polyline
      points={points}
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeDasharray="8 4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-path-dash"
      pointerEvents="none"
    />
  );
}

function WaterLevelIndicator({
  waterLevel,
  height,
}: {
  waterLevel: number;
  height: number;
}) {
  const barWidth = 18;
  const maxLevel = 10;
  const fillRatio = Math.min(waterLevel / maxLevel, 1);
  const fillHeight = height * fillRatio;
  const y = height - fillHeight;

  return (
    <g transform="translate(0, 0)">
      <rect
        x={0}
        y={0}
        width={barWidth}
        height={height}
        rx={4}
        fill="rgba(0,0,0,0.2)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1}
      />
      <defs>
        <pattern
          id="water-wave-indicator"
          x="0"
          y="0"
          width="20"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 4 Q5 0 10 4 Q15 8 20 4"
            fill="none"
            stroke="rgba(120,200,255,0.5)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect
        x={0}
        y={y}
        width={barWidth}
        height={fillHeight}
        rx={4}
        fill="rgba(0,100,180,0.7)"
      >
        <animate
          attributeName="y"
          values={`${y - 2};${y + 2};${y - 2}`}
          dur="3s"
          repeatCount="indefinite"
        />
      </rect>
      <rect
        x={0}
        y={y}
        width={barWidth}
        height={fillHeight}
        rx={4}
        fill="url(#water-wave-indicator)"
      >
        <animate
          attributeName="y"
          values={`${y - 2};${y + 2};${y - 2}`}
          dur="3s"
          repeatCount="indefinite"
        />
      </rect>
      <text
        x={barWidth / 2}
        y={height + 14}
        textAnchor="middle"
        fontSize={9}
        fill="rgba(255,255,255,0.7)"
      >
        Lv.{waterLevel.toFixed(1)}
      </text>
    </g>
  );
}

function pathSafetyColor(path: HexCoord[], cells: Map<string, { isSubmerged: boolean }>): string {
  const submergedCount = path.filter((c) => {
    const cell = cells.get(hexKey(c.q, c.r));
    return cell?.isSubmerged;
  }).length;
  const ratio = path.length > 0 ? submergedCount / path.length : 0;
  if (ratio < 0.3) return "#10B981";
  if (ratio < 0.6) return "#F59E0B";
  return "#FF6B6B";
}

const HexMap = React.memo(function HexMap({ size = 36 }: HexMapProps) {
  const cells = useGameStore((s) => s.cells);
  const touristGroups = useGameStore((s) => s.touristGroups);
  const boats = useGameStore((s) => s.boats);
  const selectedBoatId = useGameStore((s) => s.selectedBoatId);
  const hoveredCell = useGameStore((s) => s.hoveredCell);
  const previewPath = useGameStore((s) => s.previewPath);
  const pendingDispatches = useGameStore((s) => s.pendingDispatches);
  const waterLevel = useGameStore((s) => s.waterLevel);
  const phase = useGameStore((s) => s.phase);
  const selectBoat = useGameStore((s) => s.selectBoat);
  const setHoveredCell = useGameStore((s) => s.setHoveredCell);
  const dispatchBoat = useGameStore((s) => s.dispatchBoat);

  const cellEntries = useMemo(() => {
    const entries: {
      q: number;
      r: number;
      terrain: string;
      baseElevation: number;
      currentWaterLevel: number;
      isSubmerged: boolean;
      key: string;
    }[] = [];
    for (const [key, cell] of cells) {
      entries.push({
        q: cell.q,
        r: cell.r,
        terrain: cell.terrain,
        baseElevation: cell.baseElevation,
        currentWaterLevel: cell.currentWaterLevel,
        isSubmerged: cell.isSubmerged,
        key,
      });
    }
    return entries;
  }, [cells]);

  const viewBox = useMemo(() => {
    if (cellEntries.length === 0) return "-100 -100 200 200";
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const cell of cellEntries) {
      const p = hexToPixel(cell.q, cell.r, size);
      const cx = p.x;
      const cy = p.y;
      if (cx - size < minX) minX = cx - size;
      if (cy - size < minY) minY = cy - size;
      if (cx + size > maxX) maxX = cx + size;
      if (cy + size > maxY) maxY = cy + size;
    }
    const padding = size * 2;
    return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
  }, [cellEntries, size]);

  const handleCellClick = useCallback(
    (q: number, r: number) => {
      const group = touristGroups.find(
        (g) => g.position.q === q && g.position.r === r && !g.rescued
      );
      const boat = boats.find((b) => b.position.q === q && b.position.r === r);

      if (boat) {
        selectBoat(boat.id === selectedBoatId ? null : boat.id);
        return;
      }

      if (selectedBoatId && group) {
        dispatchBoat(selectedBoatId, group.id);
        return;
      }
    },
    [touristGroups, boats, selectedBoatId, selectBoat, dispatchBoat]
  );

  const handleCellHover = useCallback(
    (q: number, r: number | null) => {
      if (r === null) {
        setHoveredCell(null);
      } else {
        setHoveredCell({ q, r });
      }
    },
    [setHoveredCell]
  );

  const isPathCell = useCallback(
    (q: number, r: number): boolean => {
      const checkPath = (path: HexCoord[] | null) =>
        path?.some((c) => c.q === q && c.r === r) ?? false;
      if (checkPath(previewPath)) return true;
      for (const d of pendingDispatches) {
        if (checkPath(d.path)) return true;
      }
      return false;
    },
    [previewPath, pendingDispatches]
  );

  const allPaths = useMemo(() => {
    const result: { path: HexCoord[]; color: string }[] = [];
    if (previewPath && previewPath.length > 1) {
      result.push({
        path: previewPath,
        color: pathSafetyColor(previewPath, cells),
      });
    }
    for (const d of pendingDispatches) {
      if (d.path.length > 1) {
        result.push({
          path: d.path,
          color: pathSafetyColor(d.path, cells),
        });
      }
    }
    return result;
  }, [previewPath, pendingDispatches, cells]);

  const waterBarHeight = useMemo(() => {
    if (cellEntries.length === 0) return 100;
    let minY = Infinity,
      maxY = -Infinity;
    for (const cell of cellEntries) {
      const p = hexToPixel(cell.q, cell.r, size);
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return maxY - minY;
  }, [cellEntries, size]);

  return (
    <svg
      viewBox={viewBox}
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      <HexGlowFilter />

      <style>{`
        .animate-path-dash {
          animation: dash-move 1s linear infinite;
        }
        @keyframes dash-move {
          to {
            stroke-dashoffset: -12;
          }
        }
      `}</style>

      {cellEntries.map((cell) => (
        <HexCell
          key={cell.key}
          q={cell.q}
          r={cell.r}
          size={size}
          terrain={cell.terrain as "reef" | "shallow" | "deep" | "safe" | "rock"}
          baseElevation={cell.baseElevation}
          currentWaterLevel={cell.currentWaterLevel}
          isSubmerged={cell.isSubmerged}
          isHighlighted={
            hoveredCell !== null &&
            hoveredCell.q === cell.q &&
            hoveredCell.r === cell.r
          }
          isSelected={false}
          isPath={isPathCell(cell.q, cell.r)}
          onClick={() => handleCellClick(cell.q, cell.r)}
          onMouseEnter={() => handleCellHover(cell.q, cell.r)}
          onMouseLeave={() => handleCellHover(cell.q, null)}
        />
      ))}

      {touristGroups
        .filter((g) => !g.rescued)
        .map((g) => (
          <TouristMarker key={g.id} group={g} size={size} />
        ))}

      {boats.map((b) => (
        <BoatMarker
          key={b.id}
          boat={b}
          size={size}
          isSelected={selectedBoatId === b.id}
          onSelect={() => selectBoat(b.id === selectedBoatId ? null : b.id)}
        />
      ))}

      {allPaths.map((p, i) => (
        <PathLine key={i} path={p.path} size={size} color={p.color} />
      ))}

      <WaterLevelIndicator waterLevel={waterLevel} height={waterBarHeight} />
    </svg>
  );
});

export default HexMap;
