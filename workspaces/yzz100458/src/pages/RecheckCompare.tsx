import { useState, useMemo } from 'react'
import { GitCompareArrows, Store, ChevronDown, Calendar, AlertCircle, CheckCircle2, ImageOff } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { ISSUE_TYPE_LABELS, ISSUE_TYPE_COLORS, type Annotation } from '@/types'

const card = 'bg-surface-card border border-brand-700/50 rounded-xl'

function AnnotationOverlay({ annotations, dashed }: { annotations: Annotation[]; dashed: boolean }) {
  return (
    <>
      {annotations.map((a) => (
        <div
          key={a.id}
          className="absolute"
          style={{
            left: `${a.x}%`,
            top: `${a.y}%`,
            width: `${a.width}%`,
            height: `${a.height}%`,
            border: `2px ${dashed ? 'dashed' : 'solid'} ${ISSUE_TYPE_COLORS[a.type]}`,
            borderRadius: 4,
          }}
        />
      ))}
    </>
  )
}

function AnnotationList({ annotations, confirmed }: { annotations: Annotation[]; confirmed: boolean }) {
  if (annotations.length === 0) return <p className="text-sm text-gray-500 py-2">暂无标注</p>
  return (
    <ul className="space-y-1.5">
      {annotations.map((a) => (
        <li key={a.id} className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: ISSUE_TYPE_COLORS[a.type] }}
          />
          <span className="text-gray-300">{ISSUE_TYPE_LABELS[a.type]}</span>
          {a.note && <span className="text-gray-500 truncate">— {a.note}</span>}
          {confirmed && <CheckCircle2 className="w-3.5 h-3.5 text-pass ml-auto flex-shrink-0" />}
          {!confirmed && <AlertCircle className="w-3.5 h-3.5 text-warn ml-auto flex-shrink-0" />}
        </li>
      ))}
    </ul>
  )
}

export default function RecheckCompare() {
  const { stores, batches, getPhotosByStoreId, getAnnotationsByPhotoId } = useAppStore()
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? '')
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)

  const storeBatches = useMemo(
    () =>
      batches
        .filter((b) => b.storeId === selectedStoreId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [batches, selectedStoreId]
  )

  const activeBatchId = selectedBatchId ?? storeBatches[storeBatches.length - 1]?.id ?? null
  const activeBatchIdx = storeBatches.findIndex((b) => b.id === activeBatchId)
  const previousBatchId = activeBatchIdx > 0 ? storeBatches[activeBatchIdx - 1]?.id : null

  const storePhotos = useMemo(() => getPhotosByStoreId(selectedStoreId), [getPhotosByStoreId, selectedStoreId])

  const previousPhoto = useMemo(() => {
    if (!previousBatchId) return null
    const photos = storePhotos.filter((p) => p.batchId === previousBatchId && p.hasIssues)
    return photos[0] ?? null
  }, [previousBatchId, storePhotos])

  const currentPhoto = useMemo(() => {
    if (!activeBatchId) return null
    const photos = storePhotos.filter((p) => p.batchId === activeBatchId && p.hasIssues)
    return photos[0] ?? null
  }, [activeBatchId, storePhotos])

  const prevAnnotations = useMemo(
    () => (previousPhoto ? getAnnotationsByPhotoId(previousPhoto.id).filter((a) => a.status === 'CONFIRMED') : []),
    [previousPhoto, getAnnotationsByPhotoId]
  )

  const currAnnotations = useMemo(
    () => (currentPhoto ? getAnnotationsByPhotoId(currentPhoto.id).filter((a) => a.status === 'PENDING') : []),
    [currentPhoto, getAnnotationsByPhotoId]
  )

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <GitCompareArrows className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">复查对比</h1>
            <p className="text-xs text-gray-500">对比历史确认照片，跟踪整改效果</p>
          </div>
        </div>

        <div className="relative">
          <select
            value={selectedStoreId}
            onChange={(e) => { setSelectedStoreId(e.target.value); setSelectedBatchId(null) }}
            className="appearance-none bg-surface border border-brand-700/50 rounded-lg pl-9 pr-8 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent/50"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Store className="w-4 h-4 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className={`${card} p-4 space-y-3`}>
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-pass" /> 上次巡店
          </h2>
          {previousPhoto ? (
            <>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-brand-800">
                <img src={previousPhoto.url} alt="上次巡店" className="w-full h-full object-cover" />
                <AnnotationOverlay annotations={prevAnnotations} dashed={false} />
              </div>
              <AnnotationList annotations={prevAnnotations} confirmed />
            </>
          ) : (
            <div className="aspect-video rounded-lg bg-brand-800 flex flex-col items-center justify-center gap-2 text-gray-500">
              <ImageOff className="w-8 h-8" />
              <p className="text-sm">暂无上次巡店记录</p>
            </div>
          )}
        </div>

        <div className={`${card} p-4 space-y-3`}>
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warn" /> 本次巡店
          </h2>
          {currentPhoto ? (
            <>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-brand-800">
                <img src={currentPhoto.url} alt="本次巡店" className="w-full h-full object-cover" />
                <AnnotationOverlay annotations={currAnnotations} dashed />
              </div>
              <AnnotationList annotations={currAnnotations} confirmed={false} />
            </>
          ) : (
            <div className="aspect-video rounded-lg bg-brand-800 flex flex-col items-center justify-center gap-2 text-gray-500">
              <ImageOff className="w-8 h-8" />
              <p className="text-sm">暂无本次巡店照片</p>
            </div>
          )}
        </div>
      </div>

      <div className={`${card} p-4`}>
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" /> 历史记录
        </h3>
        {storeBatches.length === 0 ? (
          <p className="text-sm text-gray-500">暂无巡店记录</p>
        ) : (
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {storeBatches.map((batch, i) => {
              const isActive = batch.id === activeBatchId
              return (
                <div key={batch.id} className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => setSelectedBatchId(batch.id)}
                    className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-accent/15 border border-accent/30'
                        : 'hover:bg-brand-700/50 border border-transparent'
                    }`}
                  >
                    <span className={`text-xs font-mono ${isActive ? 'text-accent' : 'text-gray-500'}`}>
                      {batch.date.slice(0, 10)}
                    </span>
                    <span className={`text-[10px] ${isActive ? 'text-accent-light' : 'text-gray-600'}`}>
                      {batch.issueCount} 个问题
                    </span>
                  </button>
                  {i < storeBatches.length - 1 && (
                    <div className="w-6 h-px bg-brand-700/60 flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
