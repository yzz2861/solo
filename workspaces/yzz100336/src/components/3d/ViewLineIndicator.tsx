import { Line } from '@react-three/drei'
import type { ViewMode } from '@/types'
import { VIEW_HEIGHTS } from '@/types'

interface ViewLineIndicatorProps {
  viewMode: ViewMode
  shelfWidth: number
  shelfDepth: number
}

export default function ViewLineIndicator({
  viewMode,
  shelfWidth,
  shelfDepth,
}: ViewLineIndicatorProps) {
  const S = 0.01

  if (viewMode === 'free') return null

  if (viewMode === 'adult' || viewMode === 'child') {
    const height = VIEW_HEIGHTS[viewMode] * S
    const color = viewMode === 'adult' ? '#3b82f6' : '#10b981'
    const halfW = (shelfWidth / 2) * S
    const halfD = (shelfDepth / 2) * S

    return (
      <group>
        <mesh position={[0, height, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[shelfWidth * S, shelfDepth * S]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.15}
            side={2}
          />
        </mesh>
        <Line
          points={[
            [-halfW, height, halfD + 0.1],
            [halfW, height, halfD + 0.1],
          ]}
          color={color}
          lineWidth={2}
        />
      </group>
    )
  }

  if (viewMode === 'restock') {
    const zoneHeight = VIEW_HEIGHTS.restock * S
    return (
      <mesh position={[0, zoneHeight / 2, 0]}>
        <boxGeometry args={[shelfWidth * S, zoneHeight, shelfDepth * S]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.08}
          side={2}
        />
      </mesh>
    )
  }

  return null
}
