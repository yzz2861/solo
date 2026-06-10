import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ZoneObject } from '@/types/scene';
import * as THREE from 'three';

interface ZoneProps {
  object: ZoneObject;
  selected?: boolean;
  onClick?: () => void;
}

export function Zone({ object, selected, onClick }: ZoneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const stripeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (stripeRef.current) {
      const material = stripeRef.current.material as THREE.MeshBasicMaterial;
      const offset = (state.clock.elapsedTime * 0.5) % 1;
      if (material.map) {
        material.map.offset.y = offset;
      }
    }
  });

  const { width, depth, zoneType } = object;

  const colors = {
    forbidden: {
      base: '#dc2626',
      light: '#ef4444',
      dark: '#991b1b',
    },
    pedestrian: {
      base: '#eab308',
      light: '#facc15',
      dark: '#a16207',
    },
  };

  const color = colors[zoneType];

  const stripeTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = color.base;
    ctx.fillRect(0, 0, 32, 64);

    ctx.fillStyle = color.dark;
    for (let i = -32; i < 64; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 16, 0);
      ctx.lineTo(i + 32, 64);
      ctx.lineTo(i + 16, 64);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(width * 2, depth * 2);
    return tex;
  }, [zoneType, width, depth, color]);

  return (
    <group
      ref={groupRef}
      position={[object.position.x, object.position.y + 0.02, object.position.z]}
      rotation={[0, (object.rotation * Math.PI) / 180, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <mesh ref={stripeRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial map={stripeTexture} transparent opacity={0.5} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[Math.min(width, depth) / 2 - 0.05, Math.min(width, depth) / 2, 4]} />
        <meshBasicMaterial color={color.light} />
      </mesh>

      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`corner-${sx}-${sz}`} position={[sx * (width / 2 - 0.1), 0.05, sz * (depth / 2 - 0.1)]}>
            <cylinderGeometry args={[0.08, 0.08, 0.1, 8]} />
            <meshStandardMaterial color={color.light} />
          </mesh>
        )),
      )}

      {selected && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(width, depth) / 2, Math.max(width, depth) / 2 + 0.2, 4]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
      )}
    </group>
  );
}
