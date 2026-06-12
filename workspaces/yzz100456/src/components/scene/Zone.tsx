import { useMemo } from 'react';
import * as THREE from 'three';
import type { Zone as ZoneT } from '@/types';

const ZONE_STYLES: Record<ZoneT['type'], { color: string; emissive: string; opacity: number; label: string }> = {
  ship_edge: { color: '#3D6399', emissive: '#1f3a60', opacity: 0.35, label: '船舷' },
  warehouse_door: { color: '#8B5CF6', emissive: '#5b21b6', opacity: 0.3, label: '仓库门' },
  forbidden: { color: '#FF4757', emissive: '#991B1B', opacity: 0.28, label: '禁入区' },
  walkway: { color: '#2ED573', emissive: '#166534', opacity: 0.22, label: '人员通道' },
  obstacle: { color: '#FFA502', emissive: '#854d0e', opacity: 0.4, label: '障碍物' },
};

export default function Zone({ zone }: { zone: ZoneT }) {
  const style = ZONE_STYLES[zone.type];
  const geom = useMemo(() => {
    const pts2d = zone.polygon;
    const shape = new THREE.Shape();
    if (pts2d.length > 0) {
      shape.moveTo(pts2d[0][0], pts2d[0][1]);
      for (let i = 1; i < pts2d.length; i++) shape.lineTo(pts2d[i][0], pts2d[i][1]);
      shape.closePath();
    }
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: zone.height,
      bevelEnabled: false,
      curveSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, 0);
    return geo;
  }, [zone.polygon, zone.height]);

  const bbox = useMemo(() => {
    const xs = zone.polygon.map(p => p[0]);
    const zs = zone.polygon.map(p => p[1]);
    return {
      cx: (Math.min(...xs) + Math.max(...xs)) / 2,
      cz: (Math.min(...zs) + Math.max(...zs)) / 2,
      w: Math.max(...xs) - Math.min(...xs),
      d: Math.max(...zs) - Math.min(...zs),
    };
  }, [zone.polygon]);

  return (
    <group>
      <mesh geometry={geom} castShadow receiveShadow>
        <meshStandardMaterial
          color={style.color}
          transparent
          opacity={style.opacity}
          emissive={style.emissive}
          emissiveIntensity={0.35}
          roughness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geom]} />
        <lineBasicMaterial color={style.color} transparent opacity={0.85} />
      </lineSegments>
      {zone.type === 'forbidden' && (
        <group position={[bbox.cx, 0.08, bbox.cz]}>
          {Array.from({ length: Math.max(6, Math.floor((bbox.w + bbox.d) / 2)) }).map((_, i) => {
            const t = i / 5;
            const x = bbox.cx + (Math.random() - 0.5) * bbox.w * 0.8;
            const z = bbox.cz + (Math.random() - 0.5) * bbox.d * 0.8;
            return (
              <mesh key={`strip-${i}`} position={[x, 0.1 + t * 0.02, z]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
                <planeGeometry args={[0.15, 1.2]} />
                <meshBasicMaterial color={i % 2 ? '#FF4757' : '#F5F5F5'} transparent opacity={0.85} />
              </mesh>
            );
          })}
        </group>
      )}
      {zone.type === 'walkway' && (
        <group position={[bbox.cx, 0.06, bbox.cz]}>
          {Array.from({ length: Math.max(4, Math.floor(Math.max(bbox.w, bbox.d) / 1.5)) }).map((_, i) => {
            const along = bbox.w > bbox.d;
            const t = (i + 0.5) / Math.max(4, Math.floor(Math.max(bbox.w, bbox.d) / 1.5));
            const x = along ? bbox.cx + (t - 0.5) * bbox.w * 0.85 : bbox.cx;
            const z = along ? bbox.cz : bbox.cz + (t - 0.5) * bbox.d * 0.85;
            return (
              <mesh key={`dash-${i}`} position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, along ? 0 : Math.PI / 2]}>
                <planeGeometry args={[0.2, 0.8]} />
                <meshBasicMaterial color="#2ED573" transparent opacity={0.7} />
              </mesh>
            );
          })}
        </group>
      )}
      <mesh position={[bbox.cx, zone.height + 0.3, bbox.cz]}>
        <planeGeometry args={[Math.max(1.6, Math.min(4, bbox.w * 0.6)), 0.5]} />
        <meshBasicMaterial color="#060e1c" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}
