import { useState, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Placement, Product } from '@/types'
import { useSchemeStore } from '@/stores/schemeStore'
import { useUIStore } from '@/stores/uiStore'
import type { ThreeEvent } from '@react-three/fiber'

interface ProductModelProps {
  placement: Placement
  product: Product
  layerHeight: number
  shelfWidth: number
  shelfDepth: number
  isSelected: boolean
  hasIssue: boolean
  onClick: () => void
}

export default function ProductModel({
  placement,
  product,
  layerHeight,
  shelfWidth,
  shelfDepth,
  isSelected,
  hasIssue,
  onClick,
}: ProductModelProps) {
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const ref = useRef<THREE.Mesh>(null)
  const { raycaster, mouse, gl } = useThree()
  const S = 0.01

  const currentSchemeId = useSchemeStore((s) => s.currentSchemeId)
  const updatePlacement = useSchemeStore((s) => s.updatePlacement)
  const setSelectedPlacement = useUIStore((s) => s.setSelectedPlacement)

  const targetScale = hovered || isSelected ? 1.05 : 1.0

  useFrame(() => {
    if (!ref.current) return
    const cur = ref.current.scale.x
    const next = cur + (targetScale - cur) * 0.15
    ref.current.scale.setScalar(next)

    if (dragging && ref.current && currentSchemeId) {
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((mouse.x * rect.width) / 2) + rect.width / 2
      const y = (-(mouse.y * rect.height) / 2) + rect.height / 2
      
      const intersects = raycaster.intersectObject(ref.current.parent!, true)
      if (intersects.length > 0) {
        const intersect = intersects[0]
        const point = intersect.point
        const newX = Math.max(
          product.width / 2,
          Math.min(shelfWidth - product.width / 2, (point.x / S) + shelfWidth / 2)
        )
        const newZ = Math.max(
          0,
          Math.min(shelfDepth - product.depth / 2, point.z / S)
        )
        updatePlacement(currentSchemeId, placement.id, { positionX: newX, positionZ: newZ })
      }
    }
  })

  const x = (placement.positionX - shelfWidth / 2 + product.width / 2) * S
  const y = (layerHeight + product.height / 2) * S
  const z = placement.positionZ * S

  const emissiveProps = isSelected
    ? { emissive: new THREE.Color('#f59e0b'), emissiveIntensity: 0.3 }
    : { emissive: new THREE.Color('#000000'), emissiveIntensity: 0 }

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onClick()
    setDragging(true)
    const rect = gl.domElement.getBoundingClientRect()
    mouse.set(
      ((e.point.x * rect.width) / 2) / rect.width * 2 - 1,
      -((e.point.y * rect.height) / 2) / rect.height * 2 + 1
    )
  }

  const handlePointerUp = () => {
    setDragging(false)
  }

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return
    const rect = gl.domElement.getBoundingClientRect()
    mouse.set(
      (e.clientX / rect.width) * 2 - 1,
      -(e.clientY / rect.height) * 2 + 1
    )
  }

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
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = dragging ? 'grabbing' : 'pointer'
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
