import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CargoSpec } from '@/types';
import { toTon } from '@/utils/unitConvert';

interface Props {
  cargo: CargoSpec;
  cranePosition: [number, number, number];
  active?: boolean;
}

export default function Cargo({ cargo, cranePosition, active = true }: Props) {
  const ref = useRef<THREE.Group>(null);
  const tRef = useRef(0);
  const h = cargo.height ?? 3;
  const cargoTon = toTon(cargo.weight, cargo.weightUnit);
  const tagColor = cargoTon > 40 ? '#FF4757' : cargoTon > 20 ? '#FFA502' : '#2ED573';

  useFrame((_, dt) => {
    if (!ref.current) return;
    tRef.current += dt;
    if (active) {
      const t = (Math.sin(tRef.current * 0.7) + 1) / 2;
      const sx = THREE.MathUtils.lerp(cargo.position[0], cranePosition[0] + 10, t);
      const sz = THREE.MathUtils.lerp(cargo.position[2], cranePosition[2] - 8, t);
      const sy = THREE.MathUtils.lerp(cargo.position[1] + h / 2, h / 2 + 6, Math.sin(t * Math.PI));
      ref.current.position.set(sx, sy, sz);
      ref.current.rotation.y = Math.sin(tRef.current * 0.2) * 0.05;
    } else {
      ref.current.position.set(cargo.position[0], cargo.position[1] + h / 2, cargo.position[2]);
    }
  });

  return (
    <group ref={ref}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[cargo.length, h, cargo.width]} />
        <meshStandardMaterial color="#5B6E8A" roughness={0.75} metalness={0.25} />
      </mesh>
      <mesh position={[0, h / 2 + 0.02, 0]}>
        <boxGeometry args={[cargo.length + 0.08, 0.04, cargo.width + 0.08]} />
        <meshStandardMaterial color={tagColor} emissive={tagColor} emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
      <mesh position={[0, -h / 2 - 0.1, 0]}>
        <boxGeometry args={[cargo.length + 0.3, 0.2, cargo.width + 0.3]} />
        <meshStandardMaterial color="#7A4A1F" roughness={0.95} />
      </mesh>
      <group position={[cargo.liftPointOffsetX, h / 2 + 0.5, cargo.liftPointOffsetY]}>
        <mesh>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#FF4757" emissive="#FF4757" emissiveIntensity={1.2} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.36, 32]} />
          <meshBasicMaterial color="#FF4757" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {(Math.abs(cargo.liftPointOffsetX) > 0.001 || Math.abs(cargo.liftPointOffsetY) > 0.001) && (
        <group>
          <line>
            <bufferGeometry
              attach="geometry"
              onUpdate={(g) => {
                const pts = [
                  new THREE.Vector3(0, h / 2 + 0.1, 0),
                  new THREE.Vector3(cargo.liftPointOffsetX, h / 2 + 0.1, cargo.liftPointOffsetY),
                ];
                g.setFromPoints(pts);
              }}
            />
            <lineDashedMaterial color="#FF4757" dashSize={0.3} gapSize={0.15} />
          </line>
          <mesh position={[0, h / 2 + 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.55, 48]} />
            <meshBasicMaterial color="#A0AEC0" transparent opacity={0.35} />
          </mesh>
        </group>
      )}
      <group position={[0, h / 2 + 1.8, 0]}>
        <mesh>
          <planeGeometry args={[2.6, 1.1]} />
          <meshBasicMaterial color="#060e1c" transparent opacity={0.85} />
        </mesh>
      </group>
    </group>
  );
}
