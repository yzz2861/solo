import * as THREE from 'three'
import { useStore } from '@/store/useStore'

export default function Walkway() {
  const { layout } = useStore()
  const { x, z, rotation, width, length } = layout.walkway

  const stripeCount = Math.floor(length / 1.2)

  return (
    <group position={[x, 0.02, z]} rotation={[0, rotation, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#3a3a5e" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[width - 0.1, length - 0.1]} />
        <meshStandardMaterial color="#4a4a7e" />
      </mesh>
      {Array.from({ length: stripeCount }).map((_, i) => {
        const stripeZ = -length / 2 + 0.6 + i * 1.2
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, stripeZ]}>
            <planeGeometry args={[width - 0.2, 0.3]} />
            <meshStandardMaterial color="#FFD166" />
          </mesh>
        )
      })}
      <mesh position={[-width / 2, 0.05, 0]}>
        <boxGeometry args={[0.08, 0.1, length]} />
        <meshStandardMaterial color="#2EC4B6" emissive="#2EC4B6" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[width / 2, 0.05, 0]}>
        <boxGeometry args={[0.08, 0.1, length]} />
        <meshStandardMaterial color="#2EC4B6" emissive="#2EC4B6" emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}
