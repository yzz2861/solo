import { useCallback, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import type { BarrierItem, TempBarrierItem } from '@/store/useStore'

function BarrierSegment({
  barrier,
  onUpdate,
  isSelected,
  onSelect,
  isTemp,
  onRemove,
}: {
  barrier: BarrierItem | TempBarrierItem
  onUpdate: (id: string, update: Partial<BarrierItem | TempBarrierItem>) => void
  isSelected: boolean
  onSelect: (id: string) => void
  isTemp?: boolean
  onRemove?: (id: string) => void
}) {
  const length = 'length' in barrier ? barrier.length : 3
  const postCount = Math.max(2, Math.ceil(length / 2) + 1)
  const height = 1.2
  const groupRef = useRef<THREE.Group>(null)
  const isDragging = useRef(false)
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const intersectPoint = useRef(new THREE.Vector3())
  const offset = useRef(new THREE.Vector3())
  const { camera, gl } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const pointer = useRef(new THREE.Vector2())

  const handlePointerDown = useCallback(
    (e: THREE.Event) => {
      e.stopPropagation()
      onSelect(barrier.id)
      if (isSelected) {
        isDragging.current = true
        const rect = gl.domElement.getBoundingClientRect()
        pointer.current.x = ((e as any).clientX - rect.left) / rect.width * 2 - 1
        pointer.current.y = -((e as any).clientY - rect.top) / rect.height * 2 + 1
        raycaster.current.setFromCamera(pointer.current, camera)
        if (raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint.current)) {
          offset.current.copy(intersectPoint.current).sub(new THREE.Vector3(barrier.x, 0, barrier.z))
        }
        ;(e as any).target?.setPointerCapture?.((e as any).pointerId)
      }
    },
    [barrier.id, barrier.x, barrier.z, camera, gl, isSelected, onSelect]
  )

  const handlePointerMove = useCallback(
    (e: THREE.Event) => {
      if (!isDragging.current) return
      e.stopPropagation()
      const rect = gl.domElement.getBoundingClientRect()
      pointer.current.x = ((e as any).clientX - rect.left) / rect.width * 2 - 1
      pointer.current.y = -((e as any).clientY - rect.top) / rect.height * 2 + 1
      raycaster.current.setFromCamera(pointer.current, camera)
      if (raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint.current)) {
        const newPos = intersectPoint.current.sub(offset.current)
        onUpdate(barrier.id, {
          x: Number(newPos.x.toFixed(2)),
          z: Number(newPos.z.toFixed(2)),
        })
      }
    },
    [barrier.id, camera, gl, onUpdate]
  )

  const handlePointerUp = useCallback((e: THREE.Event) => {
    isDragging.current = false
    ;(e as any).target?.releasePointerCapture?.((e as any).pointerId)
  }, [])

  return (
    <group
      ref={groupRef}
      position={[barrier.x, 0, barrier.z]}
      rotation={[0, barrier.rotation, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(barrier.id)
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {Array.from({ length: postCount }).map((_, i) => {
        const t = i / (postCount - 1)
        const px = 0
        const pz = -length / 2 + t * length
        return (
          <mesh key={i} position={[px, height / 2, pz]} castShadow>
            <boxGeometry args={[0.08, height, 0.08]} />
            <meshStandardMaterial
              color={isTemp ? '#FF6B35' : isSelected ? '#FFD166' : '#778899'}
              metalness={0.3}
              roughness={0.6}
            />
          </mesh>
        )
      })}
      {[0.5, 1.0].map((railY, i) => (
        <mesh key={`rail_${i}`} position={[0, railY, 0]} castShadow>
          <boxGeometry args={[0.05, 0.05, length]} />
          <meshStandardMaterial
            color={isTemp ? '#FF6B35' : isSelected ? '#FFD166' : '#778899'}
            metalness={0.3}
            roughness={0.6}
          />
        </mesh>
      ))}
      {isSelected && (
        <mesh position={[0, height + 0.3, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#FFD166" emissive="#FFD166" emissiveIntensity={0.5} />
        </mesh>
      )}
      {isTemp && isSelected && onRemove && (
        <group position={[0, height + 0.8, 0]}>
          <mesh
            onClick={(e) => {
              e.stopPropagation()
              onRemove(barrier.id)
            }}
          >
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshStandardMaterial color="#E63946" emissive="#E63946" emissiveIntensity={0.4} />
          </mesh>
        </group>
      )}
    </group>
  )
}

export default function Barriers() {
  const {
    layout,
    selectedObject,
    setSelectedObject,
    updateBarrier,
    updateTempBarrier,
    removeTempBarrier,
  } = useStore()

  const handleBarrierUpdate = useCallback(
    (id: string, update: Partial<BarrierItem>) => {
      updateBarrier(id, update)
    },
    [updateBarrier]
  )

  const handleTempBarrierUpdate = useCallback(
    (id: string, update: Partial<TempBarrierItem>) => {
      updateTempBarrier(id, update)
    },
    [updateTempBarrier]
  )

  return (
    <group>
      {layout.barriers.map((barrier) => (
        <BarrierSegment
          key={barrier.id}
          barrier={barrier}
          onUpdate={handleBarrierUpdate}
          isSelected={selectedObject === barrier.id}
          onSelect={setSelectedObject}
        />
      ))}
      {layout.tempBarriers.map((barrier) => (
        <BarrierSegment
          key={barrier.id}
          barrier={barrier}
          onUpdate={handleTempBarrierUpdate}
          isSelected={selectedObject === barrier.id}
          onSelect={setSelectedObject}
          isTemp
          onRemove={() => removeTempBarrier(barrier.id)}
        />
      ))}
    </group>
  )
}
