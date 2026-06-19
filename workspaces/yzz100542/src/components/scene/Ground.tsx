import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Ground() {
  const gridHelper = useMemo(
    () => new THREE.GridHelper(60, 60, 0x333355, 0x222244),
    []
  )

  const roadRef = useRef<THREE.Mesh>(null)

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <primitive object={gridHelper} position={[0, 0, 0]} />
      <mesh ref={roadRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 5]} receiveShadow>
        <planeGeometry args={[10, 24]} />
        <meshStandardMaterial color="#2a2a3e" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[9, 0.01, -4]} receiveShadow>
        <planeGeometry args={[14, 5]} />
        <meshStandardMaterial color="#2a2a3e" />
      </mesh>
    </group>
  )
}
