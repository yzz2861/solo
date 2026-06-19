import { useState, useEffect } from 'react'
import Scene3D from '@/components/scene/Scene3D'
import AlertBar from '@/components/ui/AlertBar'
import ControlPanel from '@/components/ui/ControlPanel'
import Toolbar from '@/components/ui/Toolbar'
import { useStore } from '@/store/useStore'
import { useAlertDetection } from '@/components/ui/AlertBar'
import { FileText, ClipboardList, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Home() {
  const { cameraMode, alerts } = useStore()
  useAlertDetection()

  const dangerCount = alerts.filter((a) => a.severity === 'danger').length

  return (
    <div className="w-full h-screen bg-[#0d0d1a] overflow-hidden relative">
      <div className="absolute inset-0 right-80">
        <Scene3D />
      </div>

      <AlertBar />

      <Toolbar />

      <ControlPanel />

      <div className="absolute top-4 left-4 z-40">
        <div className="bg-[#12122a]/90 backdrop-blur-md rounded-xl border border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
            <h1 className="text-sm font-bold text-white/90">土方车盲区预演系统</h1>
          </div>
          <div className="text-[10px] text-white/30">Construction Blind Spot Rehearsal</div>
          <div className="mt-2 flex items-center gap-2">
            <Link
              to="/briefing"
              className="flex items-center gap-1 text-[10px] text-[#FF6B35]/80 hover:text-[#FF6B35] transition-colors"
            >
              <FileText className="w-3 h-3" />
              交底方案
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {cameraMode === 'driver' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-[#12122a]/90 backdrop-blur-md rounded-lg border border-[#FF6B35]/30 px-4 py-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
            <span className="text-xs text-[#FF6B35]">司机第一人称视角</span>
            {dangerCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-400 ml-2">
                {dangerCount}处盲区危险
              </span>
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-84 z-40">
        <div className="bg-[#12122a]/90 backdrop-blur-md rounded-lg border border-white/10 px-3 py-2">
          <div className="text-[10px] text-white/30 mb-1">图例</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <span className="text-[10px] text-white/50">盲区/禁停区</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#2EC4B6]/60" />
              <span className="text-[10px] text-white/50">安全站位</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1 bg-[#FFD166] rounded" />
              <span className="text-[10px] text-white/50">转弯路径</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
