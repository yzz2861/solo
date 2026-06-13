import { useMemo } from 'react';
import * as THREE from 'three';
import type { FloorPlan } from '@/types';

interface FloorSceneProps {
  floor: FloorPlan;
}

export default function FloorScene({ floor }: FloorSceneProps) {
  const wallMeshes = useMemo(() => {
    return floor.walls.map((w) => {
      const dx = w.end.x - w.start.x;
      const dz = w.end.z - w.start.z;
      const length = Math.sqrt(dx * dx + dz * dz) || 0.01;
      const angle = Math.atan2(dz, dx);
      return {
        id: w.id,
        position: [(w.start.x + w.end.x) / 2, w.height / 2, (w.start.z + w.end.z) / 2] as [number, number, number],
        size: [length, w.height, w.thickness] as [number, number, number],
        rotation: [0, -angle, 0] as [number, number, number],
      };
    });
  }, [floor.walls]);

  const floorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#F5F1E8';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#D6CFBF';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(floor.size.w / 4, floor.size.d / 4);
    return tex;
  }, [floor.size.w, floor.size.d]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[floor.size.w / 2, 0, floor.size.d / 2]} receiveShadow>
        <planeGeometry args={[floor.size.w + 0.4, floor.size.d + 0.4]} />
        <meshStandardMaterial color="#E8E3D4" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[floor.size.w / 2, 0.005, floor.size.d / 2]} receiveShadow>
        <planeGeometry args={[floor.size.w, floor.size.d]} />
        <meshStandardMaterial map={floorTexture} roughness={0.85} />
      </mesh>

      {wallMeshes.map((w) => (
        <mesh key={w.id} position={w.position} rotation={w.rotation} castShadow receiveShadow>
          <boxGeometry args={w.size} />
          <meshStandardMaterial color="#FAFBFC" roughness={0.9} />
        </mesh>
      ))}

      {floor.columns.map((c) => (
        <group key={c.id} position={[c.position.x, 0, c.position.z]}>
          <mesh position={[0, c.size.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[c.size.w, c.size.h, c.size.d]} />
            <meshStandardMaterial color="#E5E7EB" roughness={0.7} metalness={0.1} />
          </mesh>
          <mesh position={[0, c.size.h + 0.03, 0]}>
            <boxGeometry args={[c.size.w + 0.04, 0.06, c.size.d + 0.04]} />
            <meshStandardMaterial color="#9CA3AF" />
          </mesh>
        </group>
      ))}

      {floor.elevators.map((e) => (
        <group key={e.id} position={[e.position.x, 0, e.position.z]}>
          <mesh position={[0, e.height / 2, 0]}>
            <boxGeometry args={[e.width, e.height, 0.08]} />
            <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, e.height / 2, 0.05]}>
            <boxGeometry args={[e.width - 0.1, e.height - 0.2, 0.02]} />
            <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.2} emissive="#0F172A" emissiveIntensity={0.1} />
          </mesh>
          <mesh position={[0, 2.55, 0.1]}>
            <planeGeometry args={[0.6, 0.2]} />
            <meshStandardMaterial color="#0F172A" emissive="#F26B3A" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}

      {floor.fireHydrants.map((fh) => (
        <group key={fh.id} position={[fh.position.x, 0, fh.position.z]} rotation={[0, fh.facing, 0]}>
          <mesh position={[0, fh.size.h / 2 + 0.1, fh.size.d / 2]}>
            <boxGeometry args={[fh.size.w, fh.size.h, fh.size.d]} />
            <meshStandardMaterial color="#EF4444" roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh position={[0, fh.size.h / 2 + 0.1, fh.size.d / 2 + 0.015]}>
            <boxGeometry args={[fh.size.w - 0.06, fh.size.h - 0.1, 0.02]} />
            <meshStandardMaterial color="#B91C1C" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, fh.size.h + 0.02 + 0.1, fh.size.d / 2 + 0.02]}>
            <sphereGeometry args={[0.03]} />
            <meshStandardMaterial color="#FACC15" emissive="#FACC15" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}

      {floor.accessiblePaths.map((ap) => {
        if (ap.points.length < 2) return null;
        const a = ap.points[0];
        const b = ap.points[ap.points.length - 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        return (
          <group key={ap.id} position={[(a.x + b.x) / 2, 0.015, (a.z + b.z) / 2]} rotation={[-Math.PI / 2, 0, angle]}>
            <mesh>
              <planeGeometry args={[length, ap.width]} />
              <meshStandardMaterial color="#BAE6FD" transparent opacity={0.55} />
            </mesh>
            <mesh position={[0, 0.001, 0]} rotation={[0, 0, 0]}>
              <planeGeometry args={[length, ap.width - 0.05]} />
              <meshStandardMaterial color="#7DD3FC" transparent opacity={0.7} />
            </mesh>
            {Array.from({ length: Math.floor(length / 1.5) }).map((_, i) => (
              <mesh key={i} position={[-length / 2 + 0.75 + i * 1.5, 0.003, 0]}>
                <circleGeometry args={[0.08, 16]} />
                <meshStandardMaterial color="#0284C7" />
              </mesh>
            ))}
          </group>
        );
      })}

      {floor.rooms.map((r) => (
        <group key={r.id} position={[r.position.x + r.size.w / 2, 0, r.position.z + r.size.d / 2]}>
          <mesh position={[0, 3.02, 0]}>
            <boxGeometry args={[r.size.w, 0.04, r.size.d]} />
            <meshStandardMaterial color="#DBEAFE" transparent opacity={0.6} />
          </mesh>
        </group>
      ))}

      <group>
        <ambientLight intensity={0.65} color="#F1F5F9" />
        <directionalLight position={[floor.size.w * 0.3, 12, floor.size.d * 0.8]} intensity={0.9} color="#FFF8EC" castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[floor.size.w * 0.8, 10, floor.size.d * 0.2]} intensity={0.45} color="#EFF6FF" />
      </group>
    </group>
  );
}
