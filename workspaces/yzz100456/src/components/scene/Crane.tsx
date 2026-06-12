import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CraneSpec, LiftOperation } from '@/types';
import { degToRad } from '@/utils/geometry';

interface Props {
  crane: CraneSpec;
  operations: LiftOperation[];
  activeOperationId?: string;
  animate?: boolean;
}

export default function Crane({ crane, operations, activeOperationId, animate = true }: Props) {
  const turretRef = useRef<THREE.Group>(null);
  const armGroupRef = useRef<THREE.Group>(null);
  const armPistonRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const activeOp = operations.find(o => o.id === activeOperationId) ?? operations[0];
  const armLength = activeOp?.armLength ?? crane.maxArmLength * 0.7;
  const displayArm = Math.min(armLength, crane.maxArmLength);

  const armAngle = useMemo(() => {
    const h = 20;
    const r = 20;
    const angle = Math.atan2(h, r);
    return Math.max(0.35, angle);
  }, []);

  useFrame((_, dt) => {
    if (!animate) return;
    timeRef.current += dt;
    if (turretRef.current && activeOp) {
      const start = degToRad(activeOp.startAngle);
      const end = degToRad(activeOp.endAngle);
      const span = Math.abs(end - start) || Math.PI * 0.5;
      const t = (Math.sin(timeRef.current * 0.35) + 1) / 2;
      turretRef.current.rotation.y = start + t * span;
    }
    if (armPistonRef.current) {
      const target = displayArm;
      const current = armPistonRef.current.scale.x;
      armPistonRef.current.scale.x = THREE.MathUtils.lerp(current, target / 10, 0.04);
    }
  });

  const outriggerLen = 4.5;
  const baseColor = '#F2C24D';

  return (
    <group position={crane.basePosition}>
      <group>
        {[
          [outriggerLen, 0, outriggerLen],
          [-outriggerLen, 0, outriggerLen],
          [outriggerLen, 0, -outriggerLen],
          [-outriggerLen, 0, -outriggerLen],
        ].map((p, i) => (
          <group key={`outr-${i}`} position={p as [number, number, number]}>
            <mesh position={[0, -0.1, 0]} castShadow>
              <cylinderGeometry args={[0.9, 1.0, 0.35, 16]} />
              <meshStandardMaterial color="#1A2740" roughness={0.7} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.55, 0.6, 0.2, 12]} />
              <meshStandardMaterial color="#FF4757" emissive="#FF4757" emissiveIntensity={0.2} />
            </mesh>
          </group>
        ))}

        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[7, 0.8, 7]} />
          <meshStandardMaterial color={baseColor} roughness={0.4} metalness={0.55} />
        </mesh>

        {[
          [outriggerLen - 0.2, 0.7, 0],
          [-outriggerLen + 0.2, 0.7, 0],
          [0, 0.7, outriggerLen - 0.2],
          [0, 0.7, -outriggerLen + 0.2],
        ].map((p, i) => (
          <mesh key={`beam-${i}`} position={p as [number, number, number]} castShadow>
            <boxGeometry args={i < 2 ? [outriggerLen * 1.7, 0.3, 0.35] : [0.35, 0.3, outriggerLen * 1.7]} />
            <meshStandardMaterial color="#D4A93C" roughness={0.5} metalness={0.6} />
          </mesh>
        ))}
      </group>

      <group ref={turretRef} position={[0, 0.8, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[2.1, 2.3, 0.7, 32]} />
          <meshStandardMaterial color="#E2B43C" roughness={0.4} metalness={0.6} />
        </mesh>

        <mesh position={[-1.6, 2, 0]} castShadow>
          <boxGeometry args={[1.8, 2.5, 3]} />
          <meshStandardMaterial color={baseColor} roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[-2.52, 2, 0]}>
          <boxGeometry args={[0.15, 1.8, 2.2]} />
          <meshStandardMaterial color="#0B1A2E" roughness={0.2} metalness={0.1} emissive="#2A6FA8" emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[-1.6, 3.5, 0]} castShadow>
          <boxGeometry args={[1.9, 0.3, 3.1]} />
          <meshStandardMaterial color="#E03838" roughness={0.6} />
        </mesh>

        <group position={[0, 2.8, 0]} rotation={[0, 0, armAngle]}>
          <mesh ref={armPistonRef} position={[displayArm / 2, 0, 0]} scale={[displayArm / 10, 1, 1]} castShadow>
            <boxGeometry args={[10, 0.55, 0.7]} />
            <meshStandardMaterial color="#FF8A3D" roughness={0.35} metalness={0.65} />
          </mesh>
          <mesh position={[displayArm - 0.2, 0, 0]} castShadow>
            <boxGeometry args={[0.4, 0.7, 0.85]} />
            <meshStandardMaterial color="#2B3A50" roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[1.2, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.5, 10]} />
            <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} />
          </mesh>
          <group position={[displayArm, 0, 0]}>
            <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.35, 0.06, 10, 24, Math.PI]} />
              <meshStandardMaterial color="#666" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
          <line>
            <bufferGeometry
              attach="geometry"
              onUpdate={(g) => {
                const pts: THREE.Vector3[] = [];
                const n = 8;
                const cableLen = displayArm * 0.9;
                for (let i = 0; i <= n; i++) {
                  const t = i / n;
                  const x = cableLen * t;
                  const sag = Math.sin(t * Math.PI) * 0.4;
                  pts.push(new THREE.Vector3(x, -0.3 - sag, 0));
                }
                g.setFromPoints(pts);
                g.attributes.position.needsUpdate = true;
              }}
            />
            <lineBasicMaterial color="#222" />
          </line>
        </group>

        <mesh position={[0, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.3, 2.5, 48]} />
          <meshBasicMaterial color="#FF8A3D" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.4, 4.6, 64]} />
        <meshBasicMaterial color="#FF4757" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
