import * as THREE from 'three'
import { useStore } from '@/store/useStore'

export default function Gate() {
  const { layout } = useStore()
  const { x, z } = layout.gate

  const pillarHeight = 3.5
  const pillarRadius = 0.2
  const gateWidth = 10
  const crossbarY = pillarHeight - 0.3

  return (
    <group position={[x, 0, z]}>
      <mesh position={[-gateWidth / 2, pillarHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[pillarRadius, pillarRadius, pillarHeight, 8]} />
        <meshStandardMaterial color="#888899" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[gateWidth / 2, pillarHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[pillarRadius, pillarRadius, pillarHeight, 8]} />
        <meshStandardMaterial color="#888899" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, crossbarY, 0]} castShadow>
        <boxGeometry args={[gateWidth, 0.15, 0.15]} />
        <meshStandardMaterial color="#FF6B35" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, crossbarY - 0.4, 0]}>
        <boxGeometry args={[0.3, 0.2, 0.3]} />
        <meshStandardMaterial color="#FF6B35" emissive="#FF6B35" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[3, 0.6, 0.05]} />
        <meshStandardMaterial color="#222233" />
      </mesh>
      <mesh position={[0, 2.5, 0.03]}>
        <boxGeometry args={[2.8, 0.4, 0.01]} />
        <meshStandardMaterial color="#FF6B35" emissive="#FF6B35" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}
