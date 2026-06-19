import { useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

export default function TurnPath() {
  const { layout, showTurnPath } = useStore()

  const curvePoints = useMemo(() => {
    const R = 8
    const gateZ = layout.gate.z
    const points: THREE.Vector3[] = []

    points.push(new THREE.Vector3(0, 0.3, layout.truck.z))
    points.push(new THREE.Vector3(0, 0.3, gateZ + 4))
    points.push(new THREE.Vector3(0, 0.3, gateZ + 1))

    const arcSteps = 20
    for (let i = 1; i <= arcSteps; i++) {
      const t = i / arcSteps
      const angle = t * (Math.PI / 2)
      const x = R * (1 - Math.cos(angle))
      const z = gateZ - R * Math.sin(angle)
      points.push(new THREE.Vector3(x, 0.3, z))
    }

    points.push(new THREE.Vector3(R + 4, 0.3, gateZ - R))
    points.push(new THREE.Vector3(R + 10, 0.3, gateZ - R))

    return points
  }, [layout.truck.z, layout.gate.z])

  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.3)
    const tubeGeom = new THREE.TubeGeometry(curve, 64, 0.08, 8, false)
    return tubeGeom
  }, [curvePoints])

  const dashPositions = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.3)
    const positions: THREE.Vector3[] = []
    const count = 12
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count
      const point = curve.getPointAt(t)
      const tangent = curve.getTangentAt(t)
      positions.push(point)
    }
    return positions
  }, [curvePoints])

  if (!showTurnPath) return null

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#FFD166"
          emissive="#FFD166"
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      {dashPositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <coneGeometry args={[0.15, 0.4, 6]} />
          <meshStandardMaterial
            color="#FFD166"
            emissive="#FFD166"
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
    </group>
  )
}
