import { useState, useCallback, useRef } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  Camera,
  Download,
  Save,
  Gauge,
  Shield,
  Route,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import {
  generateAnnotatedTopView,
  generateDriverViewEducation,
  generateTempBarrierSetup,
  downloadImage,
  captureWithMode,
  type ExportAnnotationData,
} from '@/utils/exportUtils'
import { Link } from 'react-router-dom'

type ToastType = 'success' | 'error' | 'info'
interface Toast {
  id: number
  message: string
  type: ToastType
}

export default function ControlPanel() {
  const {
    layout,
    isPlaying,
    animProgress,
    showBlindZone,
    showTurnPath,
    cameraMode,
    alerts,
    isPlaying: _isPlaying,
    updateTruck,
    updateCommander,
    updateWalkway,
    setPlaying,
    resetAnimation,
    setCameraMode,
    setShowBlindZone,
    setShowTurnPath,
    addTempBarrier,
    savePlan,
    plans,
  } = useStore()

  const [activeTab, setActiveTab] = useState<'control' | 'scene' | 'export'>('control')
  const [planName, setPlanName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastIdRef = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateTruck({ speed: Number(e.target.value) })
    },
    [updateTruck]
  )

  const handleCommanderX = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateCommander({ x: Number(e.target.value) })
    },
    [updateCommander]
  )

  const handleCommanderZ = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateCommander({ z: Number(e.target.value) })
    },
    [updateCommander]
  )

  const handleWalkwayX = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateWalkway({ x: Number(e.target.value) })
    },
    [updateWalkway]
  )

  const handlePlayToggle = useCallback(() => {
    if (animProgress >= 1) {
      resetAnimation()
    }
    setPlaying(!isPlaying)
  }, [isPlaying, animProgress, setPlaying, resetAnimation])

  const handleReset = useCallback(() => {
    resetAnimation()
    updateTruck({ x: 0, z: 12, rotation: 0 })
  }, [resetAnimation, updateTruck])

  const dangerCount = alerts.filter((a) => a.severity === 'danger').length
  const warningCount = alerts.filter((a) => a.severity === 'warning').length

  const turnAngle = useCallback(() => {
    const state = useStore.getState()
    return state.isPlaying || state.animProgress > 0
      ? Math.min(state.animProgress * Math.PI / 0.7, Math.PI / 2)
      : 0
  }, [])

  const getExportData = useCallback((): ExportAnnotationData => {
    const state = useStore.getState()
    const ta = state.isPlaying || state.animProgress > 0
      ? Math.min(state.animProgress * Math.PI / 0.7, Math.PI / 2)
      : 0
    return {
      layout: state.layout,
      turnAngle: ta,
    }
  }, [])

  const handleSavePlan = useCallback(async () => {
    const name = planName.trim()
    if (!name) {
      showToast('请输入方案名称', 'error')
      return
    }

    setIsProcessing(true)
    try {
      const exportData = getExportData()
      const state = useStore.getState()
      const prevMode = state.cameraMode

      const topViewPromise = generateAnnotatedTopView(exportData)

      let driverViewData = ''
      try {
        const { dataUrl, restore } = await captureWithMode(
          'driver',
          setCameraMode,
          prevMode
        )
        driverViewData = await generateDriverViewEducation(dataUrl)
        restore()
      } catch (e) {
        console.warn('Driver view capture failed, using fallback', e)
      }

      const topViewAnnotated = await topViewPromise

      savePlan(name, topViewAnnotated, driverViewData)

      setPlanName('')
      showToast(`方案"${name}"保存成功！`, 'success')
    } catch (err) {
      console.error('Save plan failed:', err)
      showToast('保存失败，请重试', 'error')
    } finally {
      setIsProcessing(false)
    }
  }, [planName, getExportData, savePlan, setCameraMode, showToast])

  const handleExportAnnotated = useCallback(async () => {
    setIsProcessing(true)
    try {
      const exportData = getExportData()
      const annotated = await generateAnnotatedTopView(exportData)
      downloadImage(annotated, `盲区安全交底图_${new Date().toLocaleDateString('zh-CN')}.png`)
      showToast('标注图导出成功', 'success')
    } catch (err) {
      console.error('Export failed:', err)
      showToast('导出失败，请重试', 'error')
    } finally {
      setIsProcessing(false)
    }
  }, [getExportData, showToast])

  const handleExportDriverView = useCallback(async () => {
    setIsProcessing(true)
    try {
      const state = useStore.getState()
      const prevMode = state.cameraMode
      const { dataUrl, restore } = await captureWithMode(
        'driver',
        setCameraMode,
        prevMode
      )
      const annotated = await generateDriverViewEducation(dataUrl)
      restore()
      downloadImage(annotated, `班前教育-司机视角_${new Date().toLocaleDateString('zh-CN')}.png`)
      showToast('司机视角教育图导出成功', 'success')
    } catch (err) {
      console.error('Export failed:', err)
      showToast('导出失败，请重试', 'error')
    } finally {
      setIsProcessing(false)
    }
  }, [setCameraMode, showToast])

  const handleExportBarrierSetup = useCallback(async () => {
    setIsProcessing(true)
    try {
      const exportData = getExportData()
      const setup = await generateTempBarrierSetup(exportData)
      downloadImage(setup, `门岗临时围栏设置_${new Date().toLocaleDateString('zh-CN')}.png`)
      showToast('围栏设置图导出成功', 'success')
    } catch (err) {
      console.error('Export failed:', err)
      showToast('导出失败，请重试', 'error')
    } finally {
      setIsProcessing(false)
    }
  }, [getExportData, showToast])

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-[#12122a]/95 backdrop-blur-md border-l border-white/10 flex flex-col z-40">
      <div className="px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-bold text-white/90 tracking-wide">控制面板</h2>
      </div>

      <div className="flex border-b border-white/10">
        {(
          [
            { key: 'control', label: '模拟', icon: <Play className="w-3.5 h-3.5" /> },
            { key: 'scene', label: '场景', icon: <Settings className="w-3.5 h-3.5" /> },
            { key: 'export', label: '交底', icon: <Download className="w-3.5 h-3.5" /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs transition-colors ${
              activeTab === tab.key
                ? 'text-[#FF6B35] border-b-2 border-[#FF6B35] bg-[#FF6B35]/5'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'control' && (
          <>
            <div className="flex gap-2">
              <button
                onClick={handlePlayToggle}
                disabled={isProcessing}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isPlaying
                    ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-600/40'
                    : 'bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/30 hover:bg-[#FF6B35]/30'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? '暂停' : '开始模拟'}
              </button>
              <button
                onClick={handleReset}
                disabled={isProcessing}
                className={`px-3 py-2.5 rounded-lg text-sm text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/60 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  车速 (km/h)
                </label>
                <span className={`text-xs font-mono ${layout.truck.speed > 8 ? 'text-red-400' : 'text-[#FF6B35]'}`}>
                  {layout.truck.speed}
                  {layout.truck.speed > 8 && ' ⚠️'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={layout.truck.speed}
                onChange={handleSpeedChange}
                className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-[#FF6B35]"
              />
              <div className="flex justify-between text-[10px] text-white/30">
                <span>1</span>
                <span className={layout.truck.speed <= 8 ? 'text-green-400/60' : 'text-red-400/60'}>
                  安全范围: ≤8
                </span>
                <span>20</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/60 flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5" />
                模拟进度
              </label>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF6B35] to-[#FFD166] rounded-full transition-all duration-100"
                  style={{ width: `${animProgress * 100}%` }}
                />
              </div>
              <div className="text-right text-[10px] text-white/30">
                {(animProgress * 100).toFixed(0)}%
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/60 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                视角切换
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCameraMode('overview')}
                  disabled={isProcessing}
                  className={`py-2 rounded-lg text-xs transition-all ${
                    cameraMode === 'overview'
                      ? 'bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/30'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  俯瞰视角
                </button>
                <button
                  onClick={() => setCameraMode('driver')}
                  disabled={isProcessing}
                  className={`py-2 rounded-lg text-xs transition-all ${
                    cameraMode === 'driver'
                      ? 'bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/30'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  司机视角
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/60 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                显示控制
              </label>
              <div className="space-y-1.5">
                <button
                  onClick={() => setShowBlindZone(!showBlindZone)}
                  disabled={isProcessing}
                  className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs bg-white/5 border border-white/10 hover:bg-white/10 transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-white/70">盲区显示</span>
                  {showBlindZone ? (
                    <Eye className="w-3.5 h-3.5 text-[#E63946]" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-white/30" />
                  )}
                </button>
                <button
                  onClick={() => setShowTurnPath(!showTurnPath)}
                  disabled={isProcessing}
                  className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs bg-white/5 border border-white/10 hover:bg-white/10 transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-white/70">转弯路径</span>
                  {showTurnPath ? (
                    <Eye className="w-3.5 h-3.5 text-[#FFD166]" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-white/30" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
              <div className="text-xs text-white/50 font-medium">告警状态</div>
              <div className="flex items-center gap-2 flex-wrap">
                {dangerCount > 0 ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-400">
                    危险 {dangerCount}
                  </span>
                ) : null}
                {warningCount > 0 ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/50 text-yellow-400">
                    警告 {warningCount}
                  </span>
                ) : null}
                {dangerCount === 0 && warningCount === 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/50 text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    安全
                  </span>
                )}
              </div>
              {dangerCount > 0 && (
                <div className="text-[10px] text-red-400/70 mt-1 flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 mt-px shrink-0" />
                  <span>存在危险项，请调整布局后再保存方案</span>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'scene' && (
          <>
            <div className="space-y-3">
              <div className="text-xs text-white/50 font-medium flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#FF6B35]" />
                指挥员位置
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-white/40 w-8">X</label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.5"
                    value={layout.commander.x}
                    onChange={handleCommanderX}
                    disabled={isProcessing}
                    className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-[#FF6B35]"
                  />
                  <span className="text-[10px] font-mono text-white/50 w-10 text-right">
                    {layout.commander.x.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-white/40 w-8">Z</label>
                  <input
                    type="range"
                    min="-8"
                    max="14"
                    step="0.5"
                    value={layout.commander.z}
                    onChange={handleCommanderZ}
                    disabled={isProcessing}
                    className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-[#FF6B35]"
                  />
                  <span className="text-[10px] font-mono text-white/50 w-10 text-right">
                    {layout.commander.z.toFixed(1)}
                  </span>
                </div>
                <div className="text-[10px] text-white/30 pt-1">
                  💡 提示：在3D场景中点击指挥员选中后，可直接拖拽移动
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-white/50 font-medium flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#2EC4B6]" />
                行人通道位置
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-white/40 w-8">X</label>
                  <input
                    type="range"
                    min="-5"
                    max="10"
                    step="0.5"
                    value={layout.walkway.x}
                    onChange={handleWalkwayX}
                    disabled={isProcessing}
                    className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-[#2EC4B6]"
                  />
                  <span className="text-[10px] font-mono text-white/50 w-10 text-right">
                    {layout.walkway.x.toFixed(1)}
                  </span>
                </div>
                <div className="text-[10px] text-white/30 pt-1">
                  💡 通道应远离车辆右侧盲区和转弯内侧
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-white/50 font-medium flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#FFD166]" />
                临时围栏（橙色）
              </div>
              <button
                onClick={addTempBarrier}
                disabled={isProcessing}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs text-[#FF6B35] bg-[#FF6B35]/10 border border-[#FF6B35]/20 hover:bg-[#FF6B35]/20 transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                + 添加临时围栏
              </button>
              {layout.tempBarriers.length === 0 && (
                <div className="text-[10px] text-white/20 py-2 text-center px-3">
                  还未添加临时围栏，用于标记司机盲区边界
                </div>
              )}
              {layout.tempBarriers.map((b, idx) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-[#FF6B35]/5 border border-[#FF6B35]/20"
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-[#FF6B35] shrink-0" />
                    <span className="text-[10px] text-white/60 truncate">
                      围栏{idx + 1} ({b.x.toFixed(1)}, {b.z.toFixed(1)})
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const { removeTempBarrier } = useStore.getState()
                      removeTempBarrier(b.id)
                    }}
                    disabled={isProcessing}
                    className="text-red-400/60 hover:text-red-400 text-[10px] shrink-0 px-1.5 py-0.5 rounded hover:bg-red-900/20 transition-colors"
                  >
                    删除
                  </button>
                </div>
              ))}
              <div className="text-[10px] text-white/30 pt-1">
                💡 提示：在3D场景中点击围栏选中后，可直接拖拽移动；选中后点击红色球删除
              </div>
            </div>
          </>
        )}

        {activeTab === 'export' && (
          <>
            <div className="space-y-3">
              <div className="text-xs text-white/50 font-medium flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" />
                保存交底方案
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2.5">
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="输入方案名称，如：北门土方车入口"
                  disabled={isProcessing}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 text-white/80 placeholder:text-white/30 focus:outline-none focus:border-[#FF6B35]/50 disabled:opacity-50"
                />
                <button
                  onClick={handleSavePlan}
                  disabled={isProcessing || !planName.trim()}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs text-white bg-[#FF6B35]/20 border border-[#FF6B35]/30 hover:bg-[#FF6B35]/30 transition-all ${
                    isProcessing || !planName.trim() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      生成并保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      保存当前布局为方案
                    </>
                  )}
                </button>
                <div className="text-[10px] text-white/30 flex items-center gap-1">
                  保存时自动生成：俯视标注图 + 司机视角教育图
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-white/50 font-medium flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                立即导出图片
              </div>

              <button
                onClick={handleExportAnnotated}
                disabled={isProcessing}
                className={`w-full flex items-center justify-between gap-2 py-2.5 px-3 rounded-lg text-xs bg-[#2EC4B6]/10 border border-[#2EC4B6]/20 hover:bg-[#2EC4B6]/20 transition-all text-[#2EC4B6] ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  俯视安全交底图
                </span>
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleExportDriverView}
                disabled={isProcessing}
                className={`w-full flex items-center justify-between gap-2 py-2.5 px-3 rounded-lg text-xs bg-[#FFD166]/10 border border-[#FFD166]/20 hover:bg-[#FFD166]/20 transition-all text-[#FFD166] ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  班前教育-司机视角图
                </span>
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleExportBarrierSetup}
                disabled={isProcessing}
                className={`w-full flex items-center justify-between gap-2 py-2.5 px-3 rounded-lg text-xs bg-[#FF6B35]/10 border border-[#FF6B35]/20 hover:bg-[#FF6B35]/20 transition-all text-[#FF6B35] ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5" />
                  门岗临时围栏设置图
                </span>
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/50 font-medium">已保存方案</div>
                <Link
                  to="/briefing"
                  className="text-[10px] text-[#FF6B35]/70 hover:text-[#FF6B35] transition-colors"
                >
                  查看全部 →
                </Link>
              </div>
              {plans.length === 0 && (
                <div className="text-[10px] text-white/20 py-6 text-center px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  暂无保存的方案
                  <br />
                  上方输入名称并保存
                </div>
              )}
              {plans.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {plans.slice(-4).reverse().map((p) => (
                    <div
                      key={p.id}
                      className="text-[10px] text-white/50 px-2.5 py-2 rounded bg-white/[0.03] border border-white/[0.05] flex items-center justify-between"
                    >
                      <span className="truncate flex-1">{p.name}</span>
                      <span className="text-white/30 ml-2 shrink-0">
                        {new Date(p.timestamp).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="fixed top-20 right-84 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              px-4 py-2.5 rounded-lg shadow-xl backdrop-blur-md animate-slide-down
              flex items-center gap-2 text-xs
              ${t.type === 'success'
                ? 'bg-green-900/90 border border-green-500/40 text-green-100'
                : t.type === 'error'
                ? 'bg-red-900/90 border border-red-500/40 text-red-100'
                : 'bg-[#12122a]/95 border border-white/15 text-white/90'
              }
            `}
          >
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {t.type === 'info' && <Camera className="w-4 h-4" />}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}
