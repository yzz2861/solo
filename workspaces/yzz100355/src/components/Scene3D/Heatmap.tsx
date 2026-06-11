import { useMemo } from 'react';
import type { HeatmapCell } from '@/types';
import { heatmapColor } from '@/utils/colors';

interface HeatmapProps {
  data: HeatmapCell[];
  gridSize?: number;
  visible?: boolean;
}

export function Heatmap({ data, gridSize = 5, visible = true }: HeatmapProps) {
  const cells = useMemo(() => {
    if (data.length === 0) return [];
    
    const maxValue = Math.max(...data.map(d => d.value));
    
    return data.map((cell) => {
      const color = heatmapColor(cell.value, maxValue);
      
      return {
        position: [cell.x, 0.01, cell.y] as [number, number, number],
        color,
        size: gridSize - 0.5,
      };
    });
  }, [data, gridSize]);
  
  if (!visible || cells.length === 0) return null;
  
  return (
    <group>
      {cells.map((cell, i) => (
        <mesh key={i} position={cell.position} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cell.size, cell.size]} />
          <meshBasicMaterial
            color={cell.color}
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
