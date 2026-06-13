import { useRef, useState, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Sign, WarningLevel } from '@/types';
import { SIGN_TEMPLATES } from '@/types';

interface SignMeshProps {
  sign: Sign;
  selected: boolean;
  warningLevel: WarningLevel | null;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, pos: { x: number; y: number; z: number }) => void;
  floorSize: { w: number; d: number };
  disabled?: boolean;
}

export default function SignMesh({ sign, selected, warningLevel, onSelect, onDragEnd, floorSize, disabled }: SignMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const hoverRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const tpl = SIGN_TEMPLATES[sign.type];

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -sign.position.y), [sign.position.y]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (selected && !dragging) {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = sign.position.y + Math.sin(t * 2.2) * 0.012;
    } else if (!dragging) {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, sign.position.y, delta * 10);
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (disabled) return;
    e.stopPropagation();
    onSelect(sign.id);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(e.pointer, e.camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hit)) {
      dragOffset.current = { x: hit.x - sign.position.x, z: hit.z - sign.position.z };
    }
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging || !groupRef.current) return;
    e.stopPropagation();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(e.pointer, e.camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hit)) {
      const nx = THREE.MathUtils.clamp(hit.x - dragOffset.current.x, 0.5, floorSize.w - 0.5);
      const nz = THREE.MathUtils.clamp(hit.z - dragOffset.current.z, 0.5, floorSize.d - 0.5);
      groupRef.current.position.x = nx;
      groupRef.current.position.z = nz;
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    setDragging(false);
    if (groupRef.current) {
      onDragEnd(sign.id, {
        x: Number(groupRef.current.position.x.toFixed(3)),
        y: sign.position.y,
        z: Number(groupRef.current.position.z.toFixed(3)),
      });
    }
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const borderColor = warningLevel === 'error' ? '#EF4444'
    : warningLevel === 'warning' ? '#F59E0B'
    : selected ? '#1E3A5F' : 'transparent';

  const emissiveColor = selected ? '#4A7AB4' : hovered ? '#7DA4D1' : '#000000';
  const emissiveIntensity = selected ? 0.35 : hovered ? 0.2 : 0;

  const renderContent = () => {
    if (sign.type === 'floor_standing') {
      return (
        <>
          <mesh position={[0, -sign.position.y + 0.04, 0]} castShadow>
            <boxGeometry args={[sign.width * 0.9, 0.08, 0.35]} />
            <meshStandardMaterial color="#1F2937" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, -sign.position.y + sign.height * 0.28, 0]} castShadow>
            <boxGeometry args={[0.08, sign.height * 0.55, 0.08]} />
            <meshStandardMaterial color="#6B7280" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, sign.height / 2, 0]} castShadow>
            <boxGeometry args={[sign.width, sign.height * 0.55, 0.08]} />
            <meshStandardMaterial color={tpl.color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[0, sign.height / 2, 0.042]}>
            <planeGeometry args={[sign.width - 0.08, sign.height * 0.55 - 0.08]} />
            <meshBasicMaterial color={tpl.color} toneMapped={false} />
          </mesh>
        </>
      );
    }
    return (
      <>
        <mesh position={[0, sign.height / 2, 0]} castShadow>
          <boxGeometry args={[sign.width, sign.height, 0.05]} />
          <meshStandardMaterial
            color={tpl.color}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            metalness={sign.material === 'metal' ? 0.5 : 0.05}
            roughness={sign.material === 'acrylic' ? 0.3 : 0.7}
          />
        </mesh>
        <mesh position={[0, sign.height / 2, 0.026]}>
          <planeGeometry args={[sign.width - 0.04, sign.height - 0.04]} />
          <meshStandardMaterial color={tpl.color} emissive={tpl.color} emissiveIntensity={0.25} roughness={0.3} />
        </mesh>
      </>
    );
  };

  return (
    <group
      ref={groupRef}
      position={[sign.position.x, sign.position.y, sign.position.z]}
      rotation={[0, sign.rotationY, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {renderContent()}
      {(selected || hovered || warningLevel) && (
        <mesh ref={hoverRef} position={[0, sign.height / 2, -0.001]}>
          <boxGeometry args={[sign.width + 0.04, sign.height + 0.04, 0.005]} />
          <meshBasicMaterial color={borderColor} transparent opacity={selected ? 0.95 : warningLevel ? 0.8 : 0.5} />
        </mesh>
      )}
      {warningLevel && (
        <mesh position={[0, sign.height + 0.22, 0]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial
            color={warningLevel === 'error' ? '#EF4444' : '#F59E0B'}
            emissive={warningLevel === 'error' ? '#EF4444' : '#F59E0B'}
            emissiveIntensity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}
