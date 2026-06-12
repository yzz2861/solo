import { useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';

export interface FactoryFloorProps {
  /** 点击网格地面时触发，参数为交点 x/z（米） */
  onClick?: (x: number, z: number, event: ThreeEvent<MouseEvent>) => void;
  size?: number;
  divisions?: number;
}

/**
 * 工厂地面组件
 * 尺寸 60x60，灰色工业纹理 + 网格辅助线，支持点击触发布局
 */
export default function FactoryFloor({
  onClick,
  size = 60,
  divisions = 60,
}: FactoryFloorProps) {
  const edgesGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(size, 0, size);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [size]);

  return (
    <group>
      {/* 主地面：深灰色工业环氧地坪 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        receiveShadow
        onClick={(e) => {
          if (!onClick) return;
          e.stopPropagation();
          const p = e.point;
          onClick(p.x, p.z, e);
        }}
      >
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color="#1E293B"
          metalness={0.15}
          roughness={0.85}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* 细分小网格（1m x 1m）线框色 #475569 */}
      <Grid
        args={[size, divisions]}
        cellColor="#475569"
        sectionColor="#64748B"
        cellThickness={0.6}
        sectionThickness={1.2}
        sectionSize={10}
        fadeDistance={120}
        fadeStrength={1}
        position={[0, 0.002, 0]}
        infiniteGrid={false}
      />

      {/* 外边框：工业感粗线框 */}
      <lineSegments
        geometry={edgesGeometry as unknown as THREE.BufferGeometry}
        position={[0, 0.005, 0]}
      >
        <lineBasicMaterial color="#475569" />
      </lineSegments>
    </group>
  );
}
