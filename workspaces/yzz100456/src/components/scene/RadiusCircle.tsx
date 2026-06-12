import { useMemo } from 'react';
import * as THREE from 'three';
import type { LiftOperation } from '@/types';
import type { OperationRisk } from '@/hooks/useRiskEngine';
import { degToRad } from '@/utils/geometry';

interface Props {
  center: [number, number, number];
  operations: LiftOperation[];
  operationRisks: OperationRisk[];
  activeOpId?: string;
  hasDanger: boolean;
}

export default function RadiusCircle({
  center, operations, operationRisks, activeOpId, hasDanger
}: Props) {
  const arcs = useMemo(() => {
    return operations.map((op) => {
      const risk = operationRisks.find(r => r.operationId === op.id);
      const r = risk?.maxSafeRadius || 20;
      let start = op.startAngle, end = op.endAngle;
      while (end < start) end += 360;
      const isActive = activeOpId ? op.id === activeOpId : operations[0]?.id === op.id;
      const hasRiskDanger = risk?.risks.some(x => x.level === 'danger') ?? false;
      return { op, r, start, end, isActive, hasRiskDanger, risk };
    });
  }, [operations, operationRisks, activeOpId]);

  const buildArcGeom = (r: number, startDeg: number, endDeg: number, radialSeg = 128) => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];
    const cx = 0, cy = 0;
    positions.push(cx, 0, cy);
    let start = startDeg, end = endDeg;
    while (end < start) end += 360;
    const span = end - start;
    for (let i = 0; i <= radialSeg; i++) {
      const a = degToRad(start + (span * i) / radialSeg);
      positions.push(Math.sin(a) * r, 0, Math.cos(a) * r);
    }
    for (let i = 1; i <= radialSeg; i++) {
      indices.push(0, i, i + 1);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  return (
    <group position={[center[0], center[1] + 0.04, center[2]]}>
      {arcs.map(({ op, r, start, end, isActive, hasRiskDanger, risk }, idx) => {
        const color = hasRiskDanger ? '#FF4757' : risk?.risks.some(x => x.level === 'warning') ? '#FFA502' : '#2ED573';
        const opacity = isActive ? 0.22 : 0.1;
        const ringColor = hasRiskDanger ? '#FF4757' : isActive ? '#FF8A3D' : '#7EC8FF';
        return (
          <group key={op.id + idx}>
            <mesh geometry={buildArcGeom(r, start, end)}>
              <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            {risk && r > 0 && (
              <mesh geometry={buildArcGeom(r, start, end)}>
                <meshBasicMaterial color={color} transparent opacity={0.06} side={THREE.DoubleSide} wireframe depthWrite={false} />
              </mesh>
            )}
            {[start, end].map((ang, i) => {
              const a = degToRad(ang);
              const x = Math.sin(a) * r;
              const z = Math.cos(a) * r;
              return (
                <group key={`edge-${op.id}-${i}`}>
                  <mesh position={[x / 2, 0.01, z / 2]} rotation={[0, -a, 0]}>
                    <boxGeometry args={[r, 0.03, 0.08]} />
                    <meshBasicMaterial color={ringColor} transparent opacity={isActive ? 0.8 : 0.5} />
                  </mesh>
                  <mesh position={[x, 0.02, z]}>
                    <cylinderGeometry args={[0.22, 0.22, 0.1, 16]} />
                    <meshStandardMaterial color={ringColor} emissive={ringColor} emissiveIntensity={0.8} />
                  </mesh>
                </group>
              );
            })}
            <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[r - 0.04, r, 256, 1, degToRad(start), degToRad(end - start)]} />
              <meshBasicMaterial color={ringColor} transparent opacity={isActive ? 0.9 : 0.5} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.0, 64]} />
        <meshBasicMaterial color={hasDanger ? '#FF4757' : '#2ED573'} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 0.3, 24]} />
        <meshStandardMaterial
          color={hasDanger ? '#FF4757' : '#2ED573'}
          emissive={hasDanger ? '#FF4757' : '#2ED573'}
          emissiveIntensity={0.7}
        />
      </mesh>
    </group>
  );
}
