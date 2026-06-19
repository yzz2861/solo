import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

const TRUCK_L = 8
const TRUCK_W = 2.5
const CAB_L = 2.5
const CAB_H = 2.8
const BED_H = 1.8
const WHEEL_R = 0.5

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.3, 16]} />
      <meshStandardMaterial color="#111111" />
    </mesh>
  )
}

export default function DumpTruck() {
  const groupRef = useRef<THREE.Group>(null)
  const { isPlaying, animProgress, setAnimProgress, setPlaying, layout, updateTruck, setCameraMode } = useStore()

  const turnCurve = useMemo(() => {
    const R = 8
    const gateZ = -2
    const points: THREE.Vector3[] = []

    points.push(new THREE.Vector3(0, 0, layout.truck.z))
    points.push(new THREE.Vector3(0, 0, gateZ + 4))
    points.push(new THREE.Vector3(0, 0, gateZ + 1))

    const arcSteps = 20
    for (let i = 1; i <= arcSteps; i++) {
      const t = i / arcSteps
      const angle = t * (Math.PI / 2)
      const x = R * (1 - Math.cos(angle))
      const z = gateZ - R * Math.sin(angle)
      points.push(new THREE.Vector3(x, 0, z))
    }

    points.push(new THREE.Vector3(R + 4, 0, gateZ - R))
    points.push(new THREE.Vector3(R + 10, 0, gateZ - R))

    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3)
  }, [layout.truck.z, layout.gate?.z])

  useEffect(() => {
    if (!isPlaying && animProgress === 0) {
      if (groupRef.current) {
        groupRef.current.position.set(layout.truck.x, 0, layout.truck.z)
        groupRef.current.rotation.set(0, layout.truck.rotation, 0)
      }
    }
  }, [isPlaying, animProgress, layout.truck])

  useFrame((_, delta) => {
    if (!isPlaying || !groupRef.current) return

    const speed = layout.truck.speed / 100
    const newProgress = Math.min(animProgress + delta * speed, 1)
    setAnimProgress(newProgress)

    const point = turnCurve.getPointAt(newProgress)
    const tangent = turnCurve.getTangentAt(newProgress)
    const angle = Math.atan2(tangent.x, tangent.z)

    groupRef.current.position.set(point.x, 0, point.z)
    groupRef.current.rotation.set(0, angle, 0)

    updateTruck({ x: point.x, z: point.z, rotation: angle })

    if (newProgress >= 1) {
      setPlaying(false)
    }
  })

  const currentRotation = isPlaying || animProgress > 0 ? layout.truck.rotation : layout.truck.rotation
  const currentX = isPlaying || animProgress > 0 ? layout.truck.x : layout.truck.x
  const currentZ = isPlaying || animProgress > 0 ? layout.truck.z : layout.truck.z

  return (
    <group
      ref={groupRef}
      position={[currentX, 0, currentZ]}
      rotation={[0, currentRotation, 0]}
    >
      <mesh position={[0, BED_H / 2 + 0.3, (TRUCK_L - CAB_L) / 2]} castShadow>
        <boxGeometry args={[TRUCK_W, BED_H, TRUCK_L - CAB_L]} />
        <meshStandardMaterial color="#C17817" />
      </mesh>
      <mesh position={[0, CAB_H / 2 + 0.3, -CAB_L / 2 + 0.3]} castShadow>
        <boxGeometry args={[TRUCK_W - 0.2, CAB_H, CAB_L]} />
        <meshStandardMaterial color="#D4881C" />
      </mesh>
      <mesh position={[0, CAB_H + 0.8, -CAB_L / 2 + 0.3]} castShadow>
        <boxGeometry args={[TRUCK_W - 0.4, 0.8, CAB_L - 0.3]} />
        <meshStandardMaterial color="#88ccee" metalness={0.6} roughness={0.2} opacity={0.6} transparent />
      </mesh>
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[TRUCK_W + 0.2, 0.3, TRUCK_L + 0.2]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <Wheel position={[-TRUCK_W / 2 - 0.15, WHEEL_R, -CAB_L / 2 + 0.8]} />
      <Wheel position={[TRUCK_W / 2 + 0.15, WHEEL_R, -CAB_L / 2 + 0.8]} />
      <Wheel position={[-TRUCK_W / 2 - 0.15, WHEEL_R, TRUCK_L - CAB_L - 0.5]} />
      <Wheel position={[TRUCK_W / 2 + 0.15, WHEEL_R, TRUCK_L - CAB_L - 0.5]} />
      <Wheel position={[-TRUCK_W / 2 - 0.15, WHEEL_R, TRUCK_L - CAB_L - 1.5]} />
      <Wheel position={[TRUCK_W / 2 + 0.15, WHEEL_R, TRUCK_L - CAB_L - 1.5]} />
      <mesh position={[0, 0.6, TRUCK_L / 2 + 0.05]}>
        <boxGeometry args={[TRUCK_W, 0.8, 0.1]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      <mesh position={[0, 0.5, -TRUCK_L / 2 - 0.05]}>
        <boxGeometry args={[TRUCK_W, 0.6, 0.1]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
    </group>
  )
}
