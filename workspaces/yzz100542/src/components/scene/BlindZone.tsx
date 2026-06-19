import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import { calculateAllBlindZones, type BlindZoneResult } from '@/utils/blindZoneCalc'

function ZoneMesh({
  points,
  color,
  emissiveColor,
  opacity,
}: {
  points: [number, number][]
  color: string
  emissiveColor: string
  opacity: number
}) {
  const shape = useMemo(() => {
    if (points.length < 3) return null
    const shape = new THREE.Shape()
    shape.moveTo(points[0][0], -points[0][1])
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i][0], -points[i][1])
    }
    shape.closePath()
    return shape
  }, [points])

  if (!shape) return null

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial
        color={color}
        emissive={emissiveColor}
        emissiveIntensity={0.3}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function SafeZoneMarker({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = 0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.05
    }
  })

  return (
    <group ref={ref} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshStandardMaterial
          color="#2EC4B6"
          emissive="#2EC4B6"
          emissiveIntensity={0.4}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.35, 0.45, 16]} />
        <meshStandardMaterial
          color="#2EC4B6"
          emissive="#2EC4B6"
          emissiveIntensity={0.6}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function DangerZoneMarker({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ref.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15
      ref.current.scale.set(s, s, s)
    }
  })

  return (
    <group ref={ref} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshStandardMaterial
          color="#E63946"
          emissive="#E63946"
          emissiveIntensity={0.5}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.5, 0.08]} />
        <meshStandardMaterial
          color="#E63946"
          emissive="#E63946"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <planeGeometry args={[0.5, 0.08]} />
        <meshStandardMaterial
          color="#E63946"
          emissive="#E63946"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export default function BlindZone() {
  const { layout, showBlindZone, animProgress, isPlaying } = useStore()
  const glowRef = useRef<THREE.Group>(null)

  const blindZones: BlindZoneResult = useMemo(() => {
    const turnAngle = isPlaying || animProgress > 0 ? Math.min(animProgress * Math.PI / 0.7, Math.PI / 2) : 0
    return calculateAllBlindZones(
      layout.truck.x,
      layout.truck.z,
      layout.truck.rotation,
      turnAngle
    )
  }, [layout.truck, animProgress, isPlaying])

  useFrame((state) => {
    if (glowRef.current) {
      const o = 0.25 + Math.sin(state.clock.elapsedTime * 2) * 0.08
      glowRef.current.children.forEach((child) => {
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
          if (mat.opacity !== undefined) {
            mat.opacity = o
          }
        }
      })
    }
  })

  if (!showBlindZone) return null

  return (
    <group ref={glowRef}>
      <ZoneMesh
        points={blindZones.sideZone}
        color="#E63946"
        emissiveColor="#E63946"
        opacity={0.25}
      />
      <ZoneMesh
        points={blindZones.apillarZone}
        color="#E63946"
        emissiveColor="#E63946"
        opacity={0.25}
      />
      {blindZones.innerWheelZone.length > 0 && (
        <ZoneMesh
          points={blindZones.innerWheelZone}
          color="#ff2244"
          emissiveColor="#ff2244"
          opacity={0.3}
        />
      )}
      <SafeZoneMarker position={[-4, 0, -6]} />
      <SafeZoneMarker position={[-4, 0, 8]} />
      <DangerZoneMarker position={[3, 0, -2]} />
      <DangerZoneMarker position={[1, 0, 0]} />
    </group>
  )
}

export { SafeZoneMarker, DangerZoneMarker }
