import { Eye, User, Baby, Armchair, Save, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useSchemeStore } from '@/stores/schemeStore'
import type { ViewMode } from '@/types'

const VIEW_MODES: { mode: ViewMode; label: string; icon: typeof Eye }[] = [
  { mode: 'free', label: '自由视角', icon: Eye },
  { mode: 'adult', label: '成人视线', icon: User },
  { mode: 'child', label: '儿童视线', icon: Baby },
  { mode: 'restock', label: '补货范围', icon: Armchair },
]

export default function Toolbar() {
  const viewMode = useUIStore((s) => s.viewMode)
  const setViewMode = useUIStore((s) => s.setViewMode)
  const currentSchemeId = useSchemeStore((s) => s.currentSchemeId)
  const createScheme = useSchemeStore((s) => s.createScheme)
  const updateScheme = useSchemeStore((s) => s.updateScheme)

  const handleNewScheme = () => {
    const name = window.prompt('请输入方案名称', '新方案')
    if (name) {
      createScheme(name)
    }
  }

  const handleSave = () => {
    if (currentSchemeId) {
      updateScheme(currentSchemeId, { updatedAt: new Date().toISOString() })
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 flex items-center justify-center gap-2 border-t border-gray-800 bg-[#1e1e2e] py-2 px-4">
      <div className="flex items-center gap-1 rounded-lg bg-gray-900 p-1">
        {VIEW_MODES.map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition',
              viewMode === mode
                ? 'bg-amber-500 text-gray-900 font-medium'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="mx-2 h-4 w-px bg-gray-700" />

      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
      >
        <Save size={14} />
        保存
      </button>

      <button
        onClick={handleNewScheme}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
      >
        <Plus size={14} />
        新建方案
      </button>
    </div>
  )
}
