import { useRef, useEffect, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import Ground from './Ground'
import DumpTruck from './DumpTruck'
import Gate from './Gate'
import Barriers from './Barrier'
import Walkway from './Walkway'
import Commander from './Commander'
import BlindZone from './BlindZone'
import TurnPath from './TurnPath'
import { useStore } from '@/store/useStore'

function CameraController() {
  const { camera } = useThree()
  const { cameraMode, layout } = useStore()

  useEffect(() => {
    if (cameraMode === 'driver') {
      const truck = layout.truck
      const eyeOffset = new THREE.Vector3(0.8, 2.8, -1)
      const rotatedOffset = eyeOffset.clone().applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        truck.rotation
      )
      const driverPos = new THREE.Vector3(
        truck.x + rotatedOffset.x,
        rotatedOffset.y,
        truck.z + rotatedOffset.z
      )
      camera.position.copy(driverPos)
      const lookDir = new THREE.Vector3(0, 0, -5).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        truck.rotation
      )
      camera.lookAt(driverPos.x + lookDir.x, 1.5, driverPos.z + lookDir.z)
    } else {
      camera.position.set(12, 18, 12)
      camera.lookAt(0, 0, 2)
    }
  }, [cameraMode, layout.truck, camera])

  return null
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#aabbdd" />
      <directionalLight
        position={[10, 20, 5]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} color="#aaccff" />
    </>
  )
}

function SceneContent() {
  const { setSelectedObject } = useStore()

  const handleMissedClick = useCallback(() => {
    setSelectedObject(null)
  }, [setSelectedObject])

  return (
    <>
      <SceneLighting />
      <CameraController />
      <Ground onPointerDown={handleMissedClick} />
      <DumpTruck />
      <Gate />
      <Barriers />
      <Walkway />
      <Commander />
      <BlindZone />
      <TurnPath />
    </>
  )
}

export default function Scene3D() {
  const { cameraMode } = useStore()

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{
          position: cameraMode === 'driver' ? [0.8, 2.8, 11] : [12, 18, 12],
          fov: cameraMode === 'driver' ? 90 : 50,
          near: 0.1,
          far: 100,
        }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        {cameraMode === 'overview' && (
          <OrbitControls
            makeDefault
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI / 2.2}
            minDistance={5}
            maxDistance={40}
            target={[0, 0, 2]}
          />
        )}
        <SceneContent />
        <fog attach="fog" args={['#1a1a2e', 30, 60]} />
      </Canvas>
    </div>
  )
}

export { CameraController }
