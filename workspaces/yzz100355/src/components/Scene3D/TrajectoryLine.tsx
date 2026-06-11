import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { TrajectoryPoint } from '@/types';
import { downsamplePoints } from '@/services/trajectoryService';

interface TrajectoryLineProps {
  points: TrajectoryPoint[];
  color?: string;
  lineWidth?: number;
  visible?: boolean;
  showProgress?: boolean;
  progress?: number;
}

export function TrajectoryLine({
  points,
  color = '#3b82f6',
  lineWidth = 2,
  visible = true,
  showProgress = false,
  progress = 0,
}: TrajectoryLineProps) {
  const lineRef = useRef<any>(null);
  const progressLineRef = useRef<any>(null);
  
  const geometry = useMemo(() => {
    const downsampled = downsamplePoints(points, 300);
    const positions = new Float32Array(downsampled.length * 3);
    
    downsampled.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y + 0.1;
      positions[i * 3 + 2] = point.z;
    });
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    return geo;
  }, [points]);
  
  const progressGeometry = useMemo(() => {
    if (!showProgress || progress <= 0) return null;
    
    const downsampled = downsamplePoints(points, 300);
    const totalPoints = Math.floor(downsampled.length * Math.min(progress, 1));
    const positions = new Float32Array(totalPoints * 3);
    
    for (let i = 0; i < totalPoints; i++) {
      const point = downsampled[i];
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y + 0.15;
      positions[i * 3 + 2] = point.z;
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    return geo;
  }, [points, progress, showProgress]);
  
  if (!visible || points.length < 2) return null;
  
  return (
    <group>
      <lineSegments ref={lineRef} geometry={geometry as any}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          linewidth={lineWidth}
        />
      </lineSegments>
      
      {progressGeometry && (
        <lineSegments ref={progressLineRef} geometry={progressGeometry as any}>
          <lineBasicMaterial
            color={color}
            transparent
            opacity={0.9}
            linewidth={lineWidth + 1}
          />
        </lineSegments>
      )}
    </group>
  );
}
