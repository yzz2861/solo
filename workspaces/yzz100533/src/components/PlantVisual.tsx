import { useState } from 'react';
import type { PlantType } from '@/types';

interface PlantVisualProps {
  plantType: PlantType;
  health: number;
  soilMoisture: number;
  isWatering: boolean;
  viewMode: 'leaf' | 'root';
}

function getLeafColor(health: number): string {
  if (health >= 70) return '#4ADE80';
  if (health >= 50) return '#86EFAC';
  if (health >= 30) return '#FCD34D';
  if (health >= 15) return '#FB923C';
  return '#92400E';
}

function getStemColor(health: number): string {
  if (health >= 50) return '#16A34A';
  if (health >= 25) return '#A16207';
  return '#78350F';
}

function getDroopAngle(health: number): number {
  if (health >= 70) return 0;
  if (health >= 50) return 15;
  if (health >= 30) return 30;
  if (health >= 15) return 50;
  return 70;
}

function getRootColor(moisture: number): string {
  if (moisture >= 75) return '#78350F';
  if (moisture >= 40) return '#F5F5F4';
  return '#A8A29E';
}

function getRootThickness(moisture: number): number {
  if (moisture >= 75) return 3.5;
  if (moisture >= 40) return 2.5;
  return 1.5;
}

function Droplets() {
  return (
    <g className="animate-pulse">
      {[40, 80, 120].map((x, i) => (
        <g key={i}>
          <ellipse cx={x} cy={30 + i * 8} rx={3} ry={5} fill="#60A5FA" opacity={0.8}>
            <animate
              attributeName="cy"
              from={20 + i * 5}
              to={140}
              dur={`${0.6 + i * 0.2}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              from={0.9}
              to={0}
              dur={`${0.6 + i * 0.2}s`}
              repeatCount="indefinite"
            />
          </ellipse>
        </g>
      ))}
    </g>
  );
}

function SucculentShape({ health }: { health: number }) {
  const leafColor = getLeafColor(health);
  const droop = getDroopAngle(health);
  return (
    <g transform={`rotate(${droop * 0.2}, 80, 80)`}>
      <ellipse cx={80} cy={70} rx={28} ry={18} fill={leafColor} />
      <ellipse cx={55} cy={78} rx={22} ry={14} fill={leafColor} opacity={0.9} transform="rotate(-20, 55, 78)" />
      <ellipse cx={105} cy={78} rx={22} ry={14} fill={leafColor} opacity={0.9} transform="rotate(20, 105, 78)" />
      <ellipse cx={48} cy={90} rx={18} ry={12} fill={leafColor} opacity={0.85} transform="rotate(-35, 48, 90)" />
      <ellipse cx={112} cy={90} rx={18} ry={12} fill={leafColor} opacity={0.85} transform="rotate(35, 112, 90)" />
      <ellipse cx={80} cy={58} rx={16} ry={20} fill={leafColor} opacity={0.95} />
    </g>
  );
}

function MintShape({ health }: { health: number }) {
  const leafColor = getLeafColor(health);
  const stemColor = getStemColor(health);
  const droop = getDroopAngle(health);
  return (
    <g>
      <line x1={80} y1={130} x2={80} y2={30} stroke={stemColor} strokeWidth={3} />
      {[50, 70, 90].map((y, i) => (
        <g key={i}>
          <ellipse
            cx={i % 2 === 0 ? 60 : 100}
            cy={y}
            rx={16}
            ry={8}
            fill={leafColor}
            transform={`rotate(${i % 2 === 0 ? -droop : droop}, ${i % 2 === 0 ? 60 : 100}, ${y})`}
          />
        </g>
      ))}
      <ellipse cx={80} cy={28} rx={10} ry={12} fill={leafColor} />
    </g>
  );
}

function SeedlingShape({ health }: { health: number }) {
  const leafColor = getLeafColor(health);
  const stemColor = getStemColor(health);
  const droop = getDroopAngle(health);
  return (
    <g>
      <line x1={80} y1={130} x2={80} y2={65} stroke={stemColor} strokeWidth={2.5} />
      <ellipse
        cx={62}
        cy={58}
        rx={14}
        ry={8}
        fill={leafColor}
        transform={`rotate(${-20 - droop}, 62, 58)`}
      />
      <ellipse
        cx={98}
        cy={58}
        rx={14}
        ry={8}
        fill={leafColor}
        transform={`rotate(${20 + droop}, 98, 58)`}
      />
    </g>
  );
}

function FloweringShape({ health }: { health: number }) {
  const leafColor = getLeafColor(health);
  const stemColor = getStemColor(health);
  const droop = getDroopAngle(health);
  const petalColor = health >= 50 ? '#F472B6' : '#A8A29E';
  return (
    <g>
      <line x1={80} y1={130} x2={80} y2={30} stroke={stemColor} strokeWidth={3} />
      {[60, 85].map((y, i) => (
        <ellipse
          key={i}
          cx={i % 2 === 0 ? 60 : 100}
          cy={y}
          rx={16}
          ry={8}
          fill={leafColor}
          transform={`rotate(${i % 2 === 0 ? -droop : droop}, ${i % 2 === 0 ? 60 : 100}, ${y})`}
        />
      ))}
      <g transform={`translate(80, 25)`}>
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse
            key={angle}
            cx={0}
            cy={-10}
            rx={7}
            ry={12}
            fill={petalColor}
            transform={`rotate(${angle})`}
          />
        ))}
        <circle cx={0} cy={0} r={5} fill="#FCD34D" />
      </g>
    </g>
  );
}

function RootView({ soilMoisture }: { soilMoisture: number }) {
  const rootColor = getRootColor(soilMoisture);
  const thickness = getRootThickness(soilMoisture);
  return (
    <g>
      <rect x={20} y={40} width={120} height={100} rx={8} fill="#92400E" opacity={0.2} />
      <line x1={80} y1={20} x2={80} y2={60} stroke={rootColor} strokeWidth={thickness} />
      <line x1={80} y1={60} x2={50} y2={110} stroke={rootColor} strokeWidth={thickness} />
      <line x1={80} y1={60} x2={110} y2={110} stroke={rootColor} strokeWidth={thickness} />
      <line x1={80} y1={60} x2={80} y2={120} stroke={rootColor} strokeWidth={thickness} />
      <line x1={50} y1={110} x2={35} y2={130} stroke={rootColor} strokeWidth={thickness * 0.7} />
      <line x1={110} y1={110} x2={125} y2={130} stroke={rootColor} strokeWidth={thickness * 0.7} />
      {soilMoisture >= 75 && (
        <>
          <ellipse cx={50} cy={85} rx={20} ry={8} fill="#1E3A5F" opacity={0.3} />
          <ellipse cx={110} cy={95} rx={18} ry={7} fill="#1E3A5F" opacity={0.3} />
        </>
      )}
    </g>
  );
}

const plantShapes: Record<PlantType, React.FC<{ health: number }>> = {
  succulent: SucculentShape,
  mint: MintShape,
  seedling: SeedlingShape,
  flowering: FloweringShape,
};

export default function PlantVisual({ plantType, health, soilMoisture, isWatering, viewMode }: PlantVisualProps) {
  const [mode, setMode] = useState<'leaf' | 'root'>(viewMode);
  const currentMode = viewMode || mode;
  const PlantShape = plantShapes[plantType];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-56 w-56">
        <svg viewBox="0 0 160 160" className="h-full w-full">
          <rect x={5} y={120} width={150} height={35} rx={6} fill="#92400E" opacity={0.3} />
          {currentMode === 'leaf' ? (
            <PlantShape health={health} />
          ) : (
            <RootView soilMoisture={soilMoisture} />
          )}
          {isWatering && <Droplets />}
        </svg>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => setMode('leaf')}
          className={`rounded-full px-3 py-1 text-xs transition-colors ${
            currentMode === 'leaf'
              ? 'bg-[#4A7C59] text-white'
              : 'bg-stone-100 text-stone-500'
          }`}
        >
          枝叶
        </button>
        <button
          onClick={() => setMode('root')}
          className={`rounded-full px-3 py-1 text-xs transition-colors ${
            currentMode === 'root'
              ? 'bg-[#4A7C59] text-white'
              : 'bg-stone-100 text-stone-500'
          }`}
        >
          根系
        </button>
      </div>
    </div>
  );
}
