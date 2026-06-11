import { useMemo } from 'react'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import type { ShelfConfig } from '@/types'

interface ShelfModelProps {
  shelf: ShelfConfig
}

export default function ShelfModel({ shelf }: ShelfModelProps) {
  const { width, depth, layers } = shelf
  const halfW = width / 2
  const halfD = depth / 2
  const maxLayer = layers.reduce(
    (max, l) => Math.max(max, l.heightFromGround),
    0
  )
  const poleHeight = maxLayer + 15
  const S = 0.01

  const corners = useMemo(
    () => [
      [-halfW, 0, -halfD],
      [halfW, 0, -halfD],
      [halfW, 0, halfD],
      [-halfW, 0, halfD],
    ],
    [halfW, halfD]
  )

  const topBars = useMemo(
    () => [
      { from: corners[0], to: corners[1] },
      { from: corners[2], to: corners[3] },
    ],
    [corners]
  )

  return (
    <group scale={S}>
      {corners.map((pos, i) => (
        <mesh key={`pole-${i}`} position={[pos[0], poleHeight / 2, pos[2]]}>
          <cylinderGeometry args={[1, 1, poleHeight, 8]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {topBars.map((bar, i) => {
        const from = bar.from as number[]
        const to = bar.to as number[]
        const mid = [
          (from[0] + to[0]) / 2,
          poleHeight,
          (from[2] + to[2]) / 2,
        ]
        const length = Math.sqrt(
          (to[0] - from[0]) ** 2 + (to[2] - from[2]) ** 2
        )
        const angle = Math.atan2(to[2] - from[2], to[0] - from[0])
        return (
          <mesh
            key={`bar-${i}`}
            position={mid as [number, number, number]}
            rotation={[0, -angle, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.8, 0.8, length, 8]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.3} />
          </mesh>
        )
      })}

      {layers.map((layer) => (
        <group key={layer.id}>
          <mesh position={[0, layer.heightFromGround, 0]}>
            <boxGeometry args={[width, 1.5, depth]} />
            <meshStandardMaterial
              color="#a16207"
              transparent
              opacity={0.85}
            />
            <Edges threshold={15} color="#78350f" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
