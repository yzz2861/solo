import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useSchemeStore } from '@/stores/schemeStore'
import { useProductStore } from '@/stores/productStore'
import { useUIStore } from '@/stores/uiStore'
import { useValidationStore } from '@/stores/validationStore'
import { VIEW_HEIGHTS } from '@/types'
import GroundGrid from './GroundGrid'
import ShelfModel from './ShelfModel'
import ProductModel from './ProductModel'
import ViewLineIndicator from './ViewLineIndicator'

function CameraController() {
  const viewMode = useUIStore((s) => s.viewMode)
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3())

  useFrame(() => {
    let goalY = 1.5
    let goalZ = 2

    if (viewMode === 'adult') {
      goalY = VIEW_HEIGHTS.adult * 0.01
      goalZ = 2
    } else if (viewMode === 'child') {
      goalY = VIEW_HEIGHTS.child * 0.01
      goalZ = 2
    } else if (viewMode === 'restock') {
      goalY = 1.0
      goalZ = 2.5
    }

    target.current.set(2, goalY, goalZ)
    camera.position.lerp(target.current, 0.03)
  })

  return null
}

function SceneContent({ schemeId }: { schemeId?: string | null }) {
  const currentSchemeId = useSchemeStore((s) => s.currentSchemeId)
  const schemes = useSchemeStore((s) => s.schemes)
  const products = useProductStore((s) => s.products)
  const selectedPlacementId = useUIStore((s) => s.selectedPlacementId)
  const setSelectedPlacement = useUIStore((s) => s.setSelectedPlacement)
  const viewMode = useUIStore((s) => s.viewMode)
  const issues = useValidationStore((s) => s.issues)

  const activeId = schemeId ?? currentSchemeId
  const scheme = activeId ? schemes[activeId] : null

  const layerMap = useMemo(() => {
    if (!scheme) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const layer of scheme.shelf.layers) {
      map.set(layer.id, layer.heightFromGround)
    }
    return map
  }, [scheme])

  const issuePlacementIds = useMemo(() => {
    const set = new Set<string>()
    for (const issue of issues) {
      for (const pid of issue.placementIds) {
        set.add(pid)
      }
    }
    return set
  }, [issues])

  const productMap = useMemo(() => {
    const map = new Map<string, typeof products[number]>()
    for (const p of products) map.set(p.id, p)
    return map
  }, [products])

  if (!scheme) return null

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        castShadow
      />
      <CameraController />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
      />
      <GroundGrid />
      <ShelfModel shelf={scheme.shelf} />
      <ViewLineIndicator
        viewMode={viewMode}
        shelfWidth={scheme.shelf.width}
        shelfDepth={scheme.shelf.depth}
      />
      {scheme.placements.map((placement) => {
        const product = productMap.get(placement.productId)
        if (!product) return null
        const layerHeight = layerMap.get(placement.shelfLayerId)
        if (layerHeight === undefined) return null

        return (
          <ProductModel
            key={placement.id}
            placement={placement}
            product={product}
            layerHeight={layerHeight}
            shelfWidth={scheme.shelf.width}
            shelfDepth={scheme.shelf.depth}
            layers={scheme.shelf.layers}
            isSelected={selectedPlacementId === placement.id}
            hasIssue={issuePlacementIds.has(placement.id)}
            onClick={() =>
              setSelectedPlacement(
                selectedPlacementId === placement.id ? null : placement.id
              )
            }
          />
        )
      })}
    </>
  )
}

export default function Scene3D({ schemeId }: { schemeId?: string | null }) {
  return (
    <Canvas
      camera={{ position: [2, 1.5, 2], fov: 50 }}
      style={{ background: '#111827' }}
    >
      <SceneContent schemeId={schemeId} />
    </Canvas>
  )
}
