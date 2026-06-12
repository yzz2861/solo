import React from "react";
import { hexToPixel, hexCorners } from "@/engine/hexUtils";
import type { Terrain } from "@/types/game";

interface HexCellProps {
  q: number;
  r: number;
  size: number;
  terrain: Terrain;
  baseElevation: number;
  currentWaterLevel: number;
  isSubmerged: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  isPath: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const TERRAIN_COLORS: Record<Terrain, string> = {
  safe: "#10B981",
  shallow: "#F5E6CA",
  reef: "#6B7B8D",
  deep: "#1A365D",
  rock: "#374151",
};

const TERRAIN_ABBREV: Record<Terrain, string> = {
  safe: "安",
  shallow: "浅",
  reef: "礁",
  deep: "深",
  rock: "岩",
};

function HexCell({
  q,
  r,
  size,
  terrain,
  isSubmerged,
  isHighlighted,
  isSelected,
  isPath,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: HexCellProps) {
  const center = hexToPixel(q, r, size);
  const corners = hexCorners(center.x, center.y, size);
  const points = corners.map((c) => `${c.x},${c.y}`).join(" ");

  const baseColor = TERRAIN_COLORS[terrain];
  const lighterColor =
    terrain === "deep" ? "#2A4A7F" : terrain === "rock" ? "#4B5563" : terrain === "reef" ? "#8896A7" : terrain === "safe" ? "#34D399" : "#FFF3E0";

  const gradId = `hex-grad-${q}-${r}`;
  const waveId = `hex-wave-${q}-${r}`;

  const stroke = isSelected
    ? "#00C9A7"
    : isHighlighted
    ? "#00C9A7"
    : "rgba(255,255,255,0.15)";
  const strokeWidth = isSelected ? 3 : isHighlighted ? 2 : 0.5;
  const filterAttr = isSelected ? "url(#hex-glow)" : undefined;

  return (
    <g
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: "pointer" }}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={lighterColor} stopOpacity="0.6" />
          <stop offset="100%" stopColor={baseColor} stopOpacity="1" />
        </radialGradient>
        <pattern
          id={waveId}
          x="0"
          y="0"
          width="12"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 3 Q3 0 6 3 Q9 6 12 3"
            fill="none"
            stroke="rgba(120,200,255,0.4)"
            strokeWidth="0.8"
          />
        </pattern>
      </defs>

      <polygon
        points={points}
        fill={`url(#${gradId})`}
        stroke={stroke}
        strokeWidth={strokeWidth}
        filter={filterAttr}
      />

      {isSubmerged && (
        <>
          <polygon
            points={points}
            fill="rgba(0, 100, 180, 0.55)"
          />
          <polygon points={points} fill={`url(#${waveId})`} />
        </>
      )}

      {isPath && (
        <circle cx={center.x} cy={center.y} r={3} fill="#00C9A7" />
      )}

      <text
        x={center.x}
        y={center.y + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.38}
        fill={isSubmerged ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.5)"}
        pointerEvents="none"
      >
        {TERRAIN_ABBREV[terrain]}
      </text>
    </g>
  );
}

export function HexGlowFilter() {
  return (
    <defs>
      <filter id="hex-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
        <feFlood floodColor="#00C9A7" floodOpacity="0.6" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

export default React.memo(HexCell);
