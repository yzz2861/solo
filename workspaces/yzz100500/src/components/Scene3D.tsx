import { useRef, useState, useCallback } from 'react'
import { Canvas, useThree, useFrame, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { BoxSelect, Minus, Pilcrow, Layers, AlertTriangle, Camera, Trash2 } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { ComponentType, Annotation } from '@/types'

const MODE_CONFIG: Record<ComponentType, { icon: typeof BoxSelect; label: string }> = {
  beam: { icon: BoxSelect, label: '梁' },
  purlin: { icon: Minus, label: '檩' },
  pillar: { icon: Pilcrow, label: '柱' },
  dougong: { icon: Layers, label: '斗栱' },
  disease: { icon: AlertTriangle, label: '病害' },
}

function Pillar({ position }: { position: [number, number, number] }) {
  return <mesh position={position}><cylinderGeometry args={[0.15, 0.18, 4, 8]} /><meshStandardMaterial color="#8B6914" roughness={0.7} /></mesh>
}

function Beam({ position }: { position: [number, number, number] }) {
  return <mesh position={position}><boxGeometry args={[3, 0.2, 0.25]} /><meshStandardMaterial color="#A0522D" roughness={0.6} /></mesh>
}

function Purlin({ position }: { position: [number, number, number] }) {
  return <mesh position={position}><cylinderGeometry args={[0.08, 0.08, 3.5, 8]} /><meshStandardMaterial color="#CD853F" roughness={0.5} /></mesh>
}

function Dougong({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh><boxGeometry args={[0.5, 0.12, 0.5]} /><meshStandardMaterial color="#6B4226" roughness={0.7} /></mesh>
      <mesh position={[0, 0.12, 0]}><boxGeometry args={[0.7, 0.08, 0.7]} /><meshStandardMaterial color="#8B5A2B" roughness={0.6} /></mesh>
      <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.4, 0.12, 0.4]} /><meshStandardMaterial color="#6B4226" roughness={0.7} /></mesh>
    </group>
  )
}

function TimberFrame() {
  const s = 2.5
  return (
    <group>
      {[-1, 0, 1].map((i) => <Pillar key={`p${i}`} position={[i * s, 2, 0]} />)}
      {[-1, 0, 1].map((i) => <Pillar key={`pb${i}`} position={[i * s, 2, s * 1.2]} />)}
      <Beam position={[0, 4.05, 0]} />
      <Beam position={[0, 4.05, s * 1.2]} />
      <Purlin position={[-1.2, 4.25, s * 0.6]} />
      <Purlin position={[1.2, 4.25, s * 0.6]} />
      {[-1, 0, 1].map((i) => <Dougong key={`d${i}`} position={[i * s, 4.15, 0]} />)}
      {[-1, 0, 1].map((i) => <Dougong key={`db${i}`} position={[i * s, 4.15, s * 1.2]} />)}
    </group>
  )
}

function AnnotationMarker({ annotation }: { annotation: Annotation }) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)
  const isDisease = annotation.type === 'disease'
  const color = isDisease ? '#C73E3A' : '#4A7C6F'
  const { setSelectedComponentId, setSelectedAnnotationId, selectedAnnotationId } = useStore()

  useFrame((state) => {
    if (isDisease && meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.15)
    }
  })

  return (
    <group position={[annotation.positionX, annotation.positionY, annotation.positionZ]}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); setSelectedComponentId(annotation.componentId); setSelectedAnnotationId(annotation.id) }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selectedAnnotationId === annotation.id ? 1.5 : hovered ? 1 : 0.4} roughness={0.3} />
      </mesh>
      {hovered && (
        <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div className="glass-panel rounded px-2 py-1 text-xs whitespace-nowrap text-ink-100">{annotation.label}</div>
        </Html>
      )}
    </group>
  )
}

function ClickSurface() {
  const { annotationMode, addAnnotation, components } = useStore()
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (!annotationMode) return
    e.stopPropagation()
    const comp = components.find((c) => c.type === annotationMode)
    addAnnotation({
      id: `ann-${Date.now()}`,
      componentId: comp?.id || '',
      type: annotationMode,
      positionX: e.point.x,
      positionY: e.point.y,
      positionZ: e.point.z,
      label: `${MODE_CONFIG[annotationMode].label}-${components.length + 1}`,
      description: '',
    })
  }, [annotationMode, addAnnotation, components])

  return (
    <mesh position={[0, 2, 1.5]} visible={false} onClick={handleClick}>
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

let pendingViewpoint: string | null = null
let capturedCamera: THREE.Camera | null = null

export function restoreViewpoint(id: string) { pendingViewpoint = id }

function CameraController() {
  const { camera } = useThree()
  const viewpoints = useStore((s) => s.viewpoints)
  useFrame(() => {
    capturedCamera = camera
    if (pendingViewpoint) {
      const vp = viewpoints.find((v) => v.id === pendingViewpoint)
      if (vp) {
        camera.position.set(vp.camera.position.x, vp.camera.position.y, vp.camera.position.z)
        camera.lookAt(vp.target.x, vp.target.y, vp.target.z)
        ;(camera as THREE.PerspectiveCamera).fov = vp.camera.fov
        ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()
      }
      pendingViewpoint = null
    }
  })
  return null
}

function SceneContent() {
  const annotations = useStore((s) => s.annotations)
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[-2, 5, 1]} intensity={1.2} color="#FFD699" distance={15} />
      <pointLight position={[2, 5, 3]} intensity={0.9} color="#FFE0B2" distance={12} />
      <pointLight position={[0, 1, 0]} intensity={0.4} color="#FFCC80" distance={8} />
      <TimberFrame />
      {annotations.map((a) => <AnnotationMarker key={a.id} annotation={a} />)}
      <ClickSurface />
      <CameraController />
      <OrbitControls enableDamping dampingFactor={0.1} minDistance={2} maxDistance={20} target={[0, 2, 1.5]} />
    </>
  )
}

function AnnotationToolbar() {
  const { annotationMode, setAnnotationMode } = useStore()
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 glass-panel rounded-xl px-2 py-1.5 flex gap-1 shadow-glass">
      {(Object.keys(MODE_CONFIG) as ComponentType[]).map((mode) => {
        const Icon = MODE_CONFIG[mode].icon
        const active = annotationMode === mode
        return (
          <button key={mode} onClick={() => setAnnotationMode(active ? null : mode)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200', active ? 'bg-sandalwood-700/60 text-sandalwood-100 shadow-glow' : 'text-ink-400 hover:text-ink-200 hover:bg-ink-700/50')}>
            <Icon size={16} /><span className="font-serif">{MODE_CONFIG[mode].label}</span>
          </button>
        )
      })}
    </div>
  )
}

function ViewpointPanel() {
  const { viewpoints, addViewpoint, deleteViewpoint } = useStore()
  const handleSave = useCallback(() => {
    const cam = capturedCamera
    if (!cam) return
    addViewpoint({
      id: `vp-${Date.now()}`, projectId: '', name: `视点 ${viewpoints.length + 1}`,
      camera: { position: { x: cam.position.x, y: cam.position.y, z: cam.position.z }, rotation: { x: cam.rotation.x, y: cam.rotation.y, z: cam.rotation.z }, fov: (cam as THREE.PerspectiveCamera).fov || 50 },
      target: { x: 0, y: 2, z: 1.5 }, createdAt: new Date().toISOString(),
    })
  }, [addViewpoint, viewpoints.length])

  return (
    <div className="absolute bottom-4 right-4 z-10 glass-panel rounded-xl w-56 shadow-glass overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ink-700/50">
        <span className="text-xs font-serif text-sandalwood-200">视点管理</span>
        <button onClick={handleSave} className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-celadon-700/50 text-celadon-200 hover:bg-celadon-600/50 transition-colors">
          <Camera size={12} />保存
        </button>
      </div>
      <div className="max-h-40 overflow-y-auto">
        {viewpoints.length === 0 && <div className="px-3 py-3 text-xs text-ink-500 text-center">暂无保存的视点</div>}
        {viewpoints.map((vp) => (
          <div key={vp.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-ink-700/40 transition-colors cursor-pointer group" onClick={() => restoreViewpoint(vp.id)}>
            <span className="text-xs text-ink-300 group-hover:text-ink-100">{vp.name}</span>
            <button onClick={(e) => { e.stopPropagation(); deleteViewpoint(vp.id) }} className="opacity-0 group-hover:opacity-100 text-ink-500 hover:text-cinnabar-400 transition-all"><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Scene3D() {
  return (
    <div className="relative w-full h-full" style={{ background: '#0d0d12' }}>
      <Canvas camera={{ position: [6, 4, 8], fov: 50, near: 0.1, far: 1000 }} onCreated={({ camera }) => camera.lookAt(0, 2, 1.5)}>
        <SceneContent />
      </Canvas>
      <AnnotationToolbar />
      <ViewpointPanel />
    </div>
  )
}
