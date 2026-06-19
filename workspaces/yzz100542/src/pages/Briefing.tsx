import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Trash2,
  Download,
  Image,
  Eye,
  Calendar,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  Fence,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { BriefingPlan } from '@/store/useStore'
import {
  generateTempBarrierSetup,
  downloadImage,
  type ExportAnnotationData,
} from '@/utils/exportUtils'

type PreviewMode = 'topview' | 'driver' | 'barrier'

export default function Briefing() {
  const { plans, deletePlan } = useStore()
  const [selectedPlan, setSelectedPlan] = useState<BriefingPlan | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState<PreviewMode>('topview')
  const [barrierImage, setBarrierImage] = useState<string>('')
  const [isGeneratingBarrier, setIsGeneratingBarrier] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const generateBarrierImage = useCallback(async (plan: BriefingPlan) => {
    setIsGeneratingBarrier(true)
    try {
      const exportData: ExportAnnotationData = {
        layout: plan.layout,
        turnAngle: 0,
      }
      const img = await generateTempBarrierSetup(exportData)
      setBarrierImage(img)
      return img
    } finally {
      setIsGeneratingBarrier(false)
    }
  }, [])

  useEffect(() => {
    if (previewMode === 'barrier' && selectedPlan && !barrierImage) {
      generateBarrierImage(selectedPlan)
    }
    if (previewMode !== 'barrier') {
      setBarrierImage('')
    }
  }, [previewMode, selectedPlan, barrierImage, generateBarrierImage])

  const handleOpenPreview = (plan: BriefingPlan, mode: PreviewMode) => {
    setSelectedPlan(plan)
    setPreviewMode(mode)
    setBarrierImage('')
    setPreviewOpen(true)
  }

  const handleClosePreview = () => {
    setPreviewOpen(false)
    setSelectedPlan(null)
    setBarrierImage('')
  }

  const handleDownload = async (plan: BriefingPlan, mode: PreviewMode) => {
    const dateStr = new Date(plan.timestamp).toLocaleDateString('zh-CN')
    if (mode === 'topview' && plan.topViewImage) {
      downloadImage(plan.topViewImage, `${plan.name}_安全交底图_${dateStr}.png`)
    } else if (mode === 'driver' && plan.driverViewImage) {
      downloadImage(plan.driverViewImage, `${plan.name}_班前教育-司机视角_${dateStr}.png`)
    } else if (mode === 'barrier') {
      let img = barrierImage
      if (!img) {
        setIsGeneratingBarrier(true)
        try {
          img = await generateBarrierImage(plan)
        } finally {
          setIsGeneratingBarrier(false)
        }
      }
      if (img) {
        downloadImage(img, `${plan.name}_临时围栏设置_${dateStr}.png`)
      }
    }
  }

  const handleDelete = (planId: string) => {
    deletePlan(planId)
    setDeleteConfirm(null)
    if (selectedPlan?.id === planId) {
      handleClosePreview()
    }
  }

  const switchPreviewMode = (mode: PreviewMode) => {
    setPreviewMode(mode)
    if (mode !== 'barrier') {
      setBarrierImage('')
    }
  }

  const getPreviewImage = (): string | null => {
    if (!selectedPlan) return null
    switch (previewMode) {
      case 'topview':
        return selectedPlan.topViewImage || null
      case 'driver':
        return selectedPlan.driverViewImage || null
      case 'barrier':
        return barrierImage || null
    }
  }

  const previewModes: Array<{ key: PreviewMode; label: string; icon: React.ReactNode; color: string }> = [
    { key: 'topview', label: '安全交底图', icon: <Eye className="w-3.5 h-3.5" />, color: '#2EC4B6' },
    { key: 'driver', label: '司机视角教育', icon: <Image className="w-3.5 h-3.5" />, color: '#FFD166' },
    { key: 'barrier', label: '围栏设置图', icon: <Fence className="w-3.5 h-3.5" />, color: '#FF6B35' },
  ]

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      <header className="border-b border-white/10 bg-[#12122a]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回3D预演
            </Link>
            <div className="w-px h-4 bg-white/10" />
            <h1 className="text-base font-bold text-white/90 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#FF6B35]" />
              交底方案管理
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {plans.length > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20">
                共 {plans.length} 个方案
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
              <FileText className="w-9 h-9 text-white/15" />
            </div>
            <h2 className="text-sm text-white/40 mb-2">暂无交底方案</h2>
            <p className="text-xs text-white/20 mb-7 text-center max-w-md leading-relaxed">
              在3D预演页面中布置好围挡、行人通道、指挥员位置后<br />
              输入方案名称并保存，即可在此管理交底方案
            </p>
            <Link
              to="/"
              className="px-5 py-2.5 rounded-lg text-xs bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/30 hover:bg-[#FF6B35]/30 transition-all flex items-center gap-1.5"
            >
              前往3D预演创建方案
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-[#12122a] border border-white/[0.08] rounded-xl overflow-hidden hover:border-[#FF6B35]/30 hover:shadow-[0_8px_32px_rgba(255,107,53,0.06)] transition-all group"
              >
                <div
                  className="aspect-video bg-[#1a1a2e] relative overflow-hidden cursor-pointer"
                  onClick={() => handleOpenPreview(plan, 'topview')}
                >
                  {plan.topViewImage ? (
                    <img
                      src={plan.topViewImage}
                      alt={plan.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-10 h-10 text-white/10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12122a] via-transparent to-transparent opacity-70" />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {plan.driverViewImage && (
                      <span className="px-2 py-0.5 rounded-md text-[9px] bg-[#FFD166]/90 text-[#1a1a1a] font-medium flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5" />
                        司机视角
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-[9px] bg-[#2EC4B6]/90 text-[#0a0a1a] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      标注图
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-white/50">点击预览大图</span>
                      <ChevronRight className="w-3 h-3 text-white/40" />
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-medium text-white/85 mb-1 group-hover:text-white transition-colors truncate">
                    {plan.name}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] text-white/30 mb-4">
                    <Calendar className="w-3 h-3" />
                    {new Date(plan.timestamp).toLocaleString('zh-CN')}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    <button
                      onClick={() => handleOpenPreview(plan, 'topview')}
                      className="py-1.5 rounded-md text-[10px] flex items-center justify-center gap-1 bg-[#2EC4B6]/10 text-[#2EC4B6] border border-[#2EC4B6]/20 hover:bg-[#2EC4B6]/15 transition-all"
                    >
                      <Eye className="w-3 h-3" />
                      交底图
                    </button>
                    <button
                      onClick={() => handleOpenPreview(plan, 'driver')}
                      disabled={!plan.driverViewImage}
                      className={`py-1.5 rounded-md text-[10px] flex items-center justify-center gap-1 border transition-all ${
                        plan.driverViewImage
                          ? 'bg-[#FFD166]/10 text-[#FFD166] border-[#FFD166]/20 hover:bg-[#FFD166]/15'
                          : 'bg-white/[0.02] text-white/20 border-white/[0.05] cursor-not-allowed'
                      }`}
                    >
                      <Image className="w-3 h-3" />
                      司机视角
                    </button>
                    <button
                      onClick={() => handleOpenPreview(plan, 'barrier')}
                      className="py-1.5 rounded-md text-[10px] flex items-center justify-center gap-1 bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20 hover:bg-[#FF6B35]/15 transition-all"
                    >
                      <Fence className="w-3 h-3" />
                      围栏图
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleDownload(plan, 'topview')}
                      className="py-1.5 rounded-md text-[10px] flex items-center justify-center gap-1 bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/80 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      交底图
                    </button>
                    <button
                      onClick={() => handleDownload(plan, 'driver')}
                      disabled={!plan.driverViewImage}
                      className={`py-1.5 rounded-md text-[10px] flex items-center justify-center gap-1 border transition-all ${
                        plan.driverViewImage
                          ? 'bg-white/[0.03] text-white/60 border-white/[0.06] hover:bg-white/[0.06] hover:text-white/80'
                          : 'bg-white/[0.015] text-white/15 border-white/[0.03] cursor-not-allowed'
                      }`}
                    >
                      <Download className="w-3 h-3" />
                      教育图
                    </button>
                    <button
                      onClick={() => {
                        if (deleteConfirm === plan.id) {
                          handleDelete(plan.id)
                        } else {
                          setDeleteConfirm(plan.id)
                          setTimeout(() => setDeleteConfirm(null), 3000)
                        }
                      }}
                      className={`py-1.5 rounded-md text-[10px] flex items-center justify-center gap-1 border transition-all ${
                        deleteConfirm === plan.id
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:bg-red-500/10 hover:text-red-400/70 hover:border-red-500/20'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                      {deleteConfirm === plan.id ? '确认' : '删除'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-14 border-t border-white/[0.08] pt-10">
          <h2 className="text-sm font-bold text-white/60 mb-5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#FFD166]" />
            班前教育参考指南
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#12122a] border border-white/[0.08] rounded-xl p-6">
              <h3 className="text-xs font-medium text-[#E63946] mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E63946] animate-pulse" />
                司机看不到的4大危险区域
              </h3>
              <div className="space-y-3 text-[11px] text-white/45 leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-[#E63946] font-bold shrink-0 mt-0.5">01</span>
                  <p><span className="text-white/70">车辆右前方45°扇形区域</span> — A柱遮挡，行人极难被司机发现，即使距离很近</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#E63946] font-bold shrink-0 mt-0.5">02</span>
                  <p><span className="text-white/70">车身右侧3米范围</span> — 右侧后视镜存在死角，骑行和步行者无法被观察到</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#E63946] font-bold shrink-0 mt-0.5">03</span>
                  <p><span className="text-white/70">右转弯内轮差区域</span> — 前轮通过不代表后轮安全，最容易发生碾压事故</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#E63946] font-bold shrink-0 mt-0.5">04</span>
                  <p><span className="text-white/70">车尾后方2米范围</span> — 倒车时完全无法看到，严禁在此区域停留</p>
                </div>
              </div>
            </div>
            <div className="bg-[#12122a] border border-white/[0.08] rounded-xl p-6">
              <h3 className="text-xs font-medium text-[#2EC4B6] mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2EC4B6]" />
                安全站位与操作指引
              </h3>
              <div className="space-y-3 text-[11px] text-white/45 leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-[#2EC4B6] font-bold shrink-0 mt-0.5">01</span>
                  <p><span className="text-white/70">指挥员站车辆左前方3米外</span> — 确保司机可通过左侧车窗清楚看到你的手势</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#2EC4B6] font-bold shrink-0 mt-0.5">02</span>
                  <p><span className="text-white/70">行人走指定绿色通道</span> — 通道必须设置在转弯外侧，严禁从车头或右侧横穿</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#2EC4B6] font-bold shrink-0 mt-0.5">03</span>
                  <p><span className="text-white/70">围挡设置保证视线通畅</span> — 司机在驾驶位必须能直接看到门岗和指挥员</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#2EC4B6] font-bold shrink-0 mt-0.5">04</span>
                  <p><span className="text-white/70">橙色临时围栏明确禁区</span> — 盲区边界必须物理隔离，与固定围挡颜色区分</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {previewOpen && selectedPlan && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={handleClosePreview}
        >
          <div
            className="bg-[#0d0d1a] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#12122a]/60">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-[#FF6B35] shrink-0" />
                <h3 className="text-sm font-semibold text-white/90 truncate">{selectedPlan.name}</h3>
                <span className="text-[10px] text-white/30 shrink-0">
                  {new Date(selectedPlan.timestamp).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedPlan, previewMode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] bg-white/[0.04] text-white/70 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition-all"
                >
                  {isGeneratingBarrier || (previewMode === 'barrier' && !barrierImage) ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  下载当前图
                </button>
                <button
                  onClick={handleClosePreview}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-b border-white/[0.06] bg-white/[0.015] px-6">
              <div className="flex gap-1">
                {previewModes.map((mode) => {
                  const disabled =
                    mode.key === 'driver' && !selectedPlan.driverViewImage
                  const active = previewMode === mode.key
                  return (
                    <button
                      key={mode.key}
                      onClick={() => !disabled && switchPreviewMode(mode.key)}
                      disabled={disabled}
                      className={`
                        py-3 px-4 text-xs flex items-center gap-1.5 border-b-2 transition-all -mb-px
                        ${active
                          ? `border-[${mode.color}] text-[${mode.color}] bg-white/[0.02]`
                          : 'border-transparent text-white/40 hover:text-white/60 hover:bg-white/[0.01]'
                        }
                        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      style={active ? { borderColor: mode.color, color: mode.color } : {}}
                    >
                      {mode.icon}
                      {mode.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[#0a0a16] p-6 flex items-center justify-center min-h-0">
              {previewMode === 'barrier' && !barrierImage ? (
                <div className="flex flex-col items-center gap-3 text-white/40 py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
                  <span className="text-xs">正在生成围栏设置图...</span>
                </div>
              ) : previewMode === 'driver' && !selectedPlan.driverViewImage ? (
                <div className="flex flex-col items-center gap-3 text-white/30 py-16">
                  <Image className="w-12 h-12" />
                  <span className="text-xs">该方案未保存司机视角图片</span>
                  <span className="text-[10px]">返回3D预演页面重新保存即可生成</span>
                </div>
              ) : previewMode === 'topview' && !selectedPlan.topViewImage ? (
                <div className="flex flex-col items-center gap-3 text-white/30 py-16">
                  <Image className="w-12 h-12" />
                  <span className="text-xs">该方案未保存标注图</span>
                </div>
              ) : (
                getPreviewImage() && (
                  <img
                    src={getPreviewImage()!}
                    alt={`${selectedPlan.name} - ${previewModes.find(m => m.key === previewMode)?.label}`}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/[0.04]"
                  />
                )
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.08] bg-[#12122a]/40">
              <div className="flex items-center gap-2">
                <ChevronLeft className="w-4 h-4 text-white/20" />
                <span className="text-[10px] text-white/30">
                  {previewModes.findIndex(m => m.key === previewMode) + 1} / {previewModes.length}
                  {previewModes[previewModes.findIndex(m => m.key === previewMode)]?.label}
                </span>
                <ChevronRight className="w-4 h-4 text-white/20" />
              </div>
              <div className="text-[10px] text-white/25">
                提示：点击"下载当前图"按钮可保存为图片用于打印或发送
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
