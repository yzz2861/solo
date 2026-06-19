import { Truck, Shield, Fence, Route, RotateCcw } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function Toolbar() {
  const { resetLayout, setSelectedObject, showBlindZone, showTurnPath, setShowBlindZone, setShowTurnPath } = useStore()

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
      <div className="bg-[#12122a]/90 backdrop-blur-md rounded-xl border border-white/10 p-1.5 flex flex-col gap-1">
        <ToolbarButton
          icon={<Truck className="w-4 h-4" />}
          label="土方车"
          onClick={() => setSelectedObject('truck')}
        />
        <ToolbarButton
          icon={<Shield className="w-4 h-4" />}
          label="指挥员"
          onClick={() => setSelectedObject('commander')}
        />
        <ToolbarButton
          icon={<Fence className="w-4 h-4" />}
          label="围栏"
          onClick={() => {
            const { addTempBarrier } = useStore.getState()
            addTempBarrier()
          }}
        />
        <ToolbarButton
          icon={<Route className="w-4 h-4" />}
          label="转弯路径"
          active={showTurnPath}
          onClick={() => setShowTurnPath(!showTurnPath)}
        />
        <div className="w-6 h-px bg-white/10 mx-auto my-1" />
        <ToolbarButton
          icon={<RotateCcw className="w-4 h-4" />}
          label="重置"
          onClick={resetLayout}
        />
      </div>
    </div>
  )
}

function ToolbarButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        w-9 h-9 flex items-center justify-center rounded-lg transition-all
        ${active
          ? 'bg-[#FF6B35]/20 text-[#FF6B35]'
          : 'text-white/40 hover:text-white/70 hover:bg-white/5'
        }
      `}
    >
      {icon}
    </button>
  )
}
