import { useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Placement, Product } from '@/types'

interface ProductModelProps {
  placement: Placement
  product: Product
  layerHeight: number
  shelfWidth: number
  isSelected: boolean
  hasIssue: boolean
  onClick: () => void
}

export default function ProductModel({
  placement,
  product,
  layerHeight,
  shelfWidth,
  isSelected,
  hasIssue,
  onClick,
}: ProductModelProps) {
  const [hovered, setHovered] = useState(false)
  const ref = useRef<THREE.Mesh>(null)
  const S = 0.01

  const targetScale = hovered ? 1.05 : 1.0

  useFrame(() => {
    if (!ref.current) return
    const cur = ref.current.scale.x
    const next = cur + (targetScale - cur) * 0.15
    ref.current.scale.setScalar(next)
  })

  const x = (placement.positionX - shelfWidth / 2 + product.width / 2) * S
  const y = (layerHeight + product.height / 2) * S
  const z = placement.positionZ * S

  const emissiveProps = isSelected
    ? { emissive: new THREE.Color('#f59e0b'), emissiveIntensity: 0.3 }
    : { emissive: new THREE.Color('#000000'), emissiveIntensity: 0 }

  return (
    <group
      position={[x, y, z]}
      rotation={[0, (placement.rotationY * Math.PI) / 180, 0]}
    >
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
        scale={S}
      >
        <boxGeometry args={[product.width, product.height, product.depth]} />
        <meshStandardMaterial
          color={product.color}
          transparent
          opacity={0.9}
          {...emissiveProps}
        />
      </mesh>

      {hasIssue && (
        <mesh scale={S}>
          <boxGeometry
            args={[product.width + 0.5, product.height + 0.5, product.depth + 0.5]}
          />
          <meshBasicMaterial color="#ef4444" wireframe transparent opacity={0.6} />
        </mesh>
      )}

      {isSelected && (
        <Html
          position={[0, (product.height / 2 + 8) * S, 0]}
          center
          distanceFactor={8}
          style={{
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 13,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {product.name}
        </Html>
      )}
    </group>
  )
}
