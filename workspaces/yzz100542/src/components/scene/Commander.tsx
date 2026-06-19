import { useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

export default function Commander() {
  const { layout, selectedObject, setSelectedObject, updateCommander } = useStore()
  const { x, z } = layout.commander
  const isSelected = selectedObject === 'commander'
  const groupRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const isDragging = useRef(false)
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const intersectPoint = useRef(new THREE.Vector3())
  const offset = useRef(new THREE.Vector3())
  const { camera, gl } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const pointer = useRef(new THREE.Vector2())

  useFrame((state) => {
    if (glowRef.current) {
      const t = state.clock.elapsedTime
      glowRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.1)
    }
  })

  const handlePointerDown = useCallback(
    (e: THREE.Event) => {
      e.stopPropagation()
      setSelectedObject('commander')
      if (isSelected) {
        isDragging.current = true
        const rect = gl.domElement.getBoundingClientRect()
        pointer.current.x = ((e as any).clientX - rect.left) / rect.width * 2 - 1
        pointer.current.y = -((e as any).clientY - rect.top) / rect.height * 2 + 1
        raycaster.current.setFromCamera(pointer.current, camera)
        if (raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint.current)) {
          offset.current.copy(intersectPoint.current).sub(new THREE.Vector3(x, 0, z))
        }
        ;(e as any).target?.setPointerCapture?.((e as any).pointerId)
      }
    },
    [camera, gl, isSelected, setSelectedObject, x, z]
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
        updateCommander({
          x: Number(newPos.x.toFixed(2)),
          z: Number(newPos.z.toFixed(2)),
        })
      }
    },
    [camera, gl, updateCommander]
  )

  const handlePointerUp = useCallback((e: THREE.Event) => {
    isDragging.current = false
    ;(e as any).target?.releasePointerCapture?.((e as any).pointerId)
  }, [])

  return (
    <group
      ref={groupRef}
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation()
        setSelectedObject('commander')
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 1.4, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#FFD166' : '#FF6B35'}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
      <mesh position={[0, 1.85, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color="#FFCCAA" />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.4, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#FFD166' : '#FF6B35'}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
      <mesh position={[0.15, 1.6, 0.15]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
        <meshStandardMaterial color="#FFCCAA" />
      </mesh>
      <mesh position={[-0.15, 1.6, 0.15]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
        <meshStandardMaterial color="#FFCCAA" />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.8, 6]} />
        <meshStandardMaterial color="#333344" />
      </mesh>
      <mesh position={[0.12, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.8, 6]} />
        <meshStandardMaterial color="#333344" />
      </mesh>
      {isSelected && (
        <mesh ref={glowRef} position={[0, 2.3, 0]}>
          <ringGeometry args={[0.15, 0.25, 16]} />
          <meshStandardMaterial
            color="#FFD166"
            emissive="#FFD166"
            emissiveIntensity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}
