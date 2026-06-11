import { useSchemeStore } from '@/stores/schemeStore'
import ProductPanel from '@/components/ProductPanel'
import PropertyPanel from '@/components/PropertyPanel'
import ValidationBar from '@/components/ValidationBar'
import Scene3D from '@/components/3d/Scene3D'
import Toolbar from '@/components/Toolbar'
import { Plus } from 'lucide-react'

export default function Editor() {
  const currentSchemeId = useSchemeStore((s) => s.currentSchemeId)
  const createScheme = useSchemeStore((s) => s.createScheme)

  if (!currentSchemeId) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0f1a]">
        <button
          onClick={() => createScheme('新方案')}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-amber-400"
        >
          <Plus size={18} />
          创建新方案
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <ProductPanel />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ValidationBar />
        <div className="flex-1">
          <Scene3D />
        </div>
        <Toolbar />
      </div>
      <PropertyPanel />
    </div>
  )
}
