import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, FileText, FileSpreadsheet, Filter, ChevronDown, ArrowLeft, MapPin } from 'lucide-react'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { ComponentType, Photo, Measurement, RepairSuggestion } from '@/types'

const COMPONENT_OPTIONS: { value: ComponentType; label: string }[] = [
  { value: 'beam', label: '梁/beam' },
  { value: 'purlin', label: '檩/purlin' },
  { value: 'pillar', label: '柱/pillar' },
  { value: 'dougong', label: '斗拱/dougong' },
]

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'low', label: '低/low' },
  { value: 'medium', label: '中/medium' },
  { value: 'high', label: '高/high' },
  { value: 'critical', label: '严重/critical' },
]

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: '待评审/pending' },
  { value: 'reviewing', label: '评审中/reviewing' },
  { value: 'reviewed', label: '已评审/reviewed' },
]

const SEVERITY_LABELS: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '严重' }
const STATUS_LABELS: Record<string, string> = { pending: '待评审', reviewing: '评审中', reviewed: '已评审' }
const TYPE_LABELS: Record<string, string> = { beam: '梁', purlin: '檩', pillar: '柱', dougong: '斗拱' }

const SEVERITY_CLASSES: Record<string, string> = {
  low: 'badge bg-celadon-500/20 text-celadon-300',
  medium: 'badge bg-sandalwood-400/20 text-sandalwood-300',
  high: 'badge bg-cinnabar-400/20 text-cinnabar-400',
  critical: 'badge bg-cinnabar-600/30 text-cinnabar-200 shadow-glow animate-glow',
}

const STATUS_CLASSES: Record<string, string> = {
  pending: 'badge bg-sandalwood-500/20 text-sandalwood-300',
  reviewing: 'badge bg-celadon-500/20 text-celadon-300',
  reviewed: 'badge bg-ink-600/30 text-ink-300',
}

interface ExportItem {
  reviewItemId: string
  diseaseId: string
  componentId: string
  title: string
  componentName: string
  componentCode: string
  componentType: ComponentType
  diseaseType: string
  severity: string
  description: string
  discoveredAt: string
  reviewStatus: string
}

export default function Export() {
  const navigate = useNavigate()
  const {
    diseases, components, reviewItems, measurements, repairSuggestions, photos,
    setSelectedComponentId,
  } = useStore()

  const [selectedTypes, setSelectedTypes] = useState<Set<ComponentType>>(new Set(COMPONENT_OPTIONS.map(o => o.value)))
  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(new Set(SEVERITY_OPTIONS.map(o => o.value)))
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set(STATUS_OPTIONS.map(o => o.value)))
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const exportItems: ExportItem[] = useMemo(() => {
    return reviewItems.map(ri => {
      const disease = diseases.find(d => d.id === ri.diseaseId)
      const component = disease ? components.find(c => c.id === disease.componentId) : null
      return {
        reviewItemId: ri.id,
        diseaseId: ri.diseaseId,
        componentId: disease?.componentId ?? '',
        title: ri.title,
        componentName: component?.name ?? '未知构件',
        componentCode: component?.code ?? '',
        componentType: component?.type ?? 'beam',
        diseaseType: disease?.type ?? '',
        severity: disease?.severity ?? 'low',
        description: disease?.description ?? '',
        discoveredAt: disease?.discoveredAt ?? '',
        reviewStatus: ri.status,
      }
    })
  }, [reviewItems, diseases, components])

  const filteredItems = useMemo(() => {
    return exportItems.filter(item =>
      selectedTypes.has(item.componentType) &&
      selectedSeverities.has(item.severity) &&
      selectedStatuses.has(item.reviewStatus)
    )
  }, [exportItems, selectedTypes, selectedSeverities, selectedStatuses])

  const toggleSet = useCallback((set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setter(next)
  }, [])

  const selectAll = useCallback(() => {
    setSelectedTypes(new Set(COMPONENT_OPTIONS.map(o => o.value)))
    setSelectedSeverities(new Set(SEVERITY_OPTIONS.map(o => o.value)))
    setSelectedStatuses(new Set(STATUS_OPTIONS.map(o => o.value)))
  }, [])

  const deselectAll = useCallback(() => {
    setSelectedTypes(new Set())
    setSelectedSeverities(new Set())
    setSelectedStatuses(new Set())
  }, [])

  const handleLocate = useCallback((componentId: string) => {
    setSelectedComponentId(componentId)
    navigate('/')
  }, [navigate, setSelectedComponentId])

  const exportPDF = useCallback(() => {
    const doc = new jsPDF()
    doc.setFont('helvetica')
    doc.setFontSize(16)
    doc.text('Disease Inspection Report', 14, 20)
    doc.setFontSize(10)
    doc.text(`Total items: ${filteredItems.length}`, 14, 28)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34)

    let y = 44
    filteredItems.forEach((item, idx) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(12)
      doc.text(`${idx + 1}. ${item.title}`, 14, y)
      y += 6
      doc.setFontSize(9)
      doc.text(`Component: ${item.componentName} (${item.componentCode})`, 20, y)
      y += 5
      doc.text(`Type: ${TYPE_LABELS[item.componentType] ?? item.componentType}  |  Disease: ${item.diseaseType}  |  Severity: ${SEVERITY_LABELS[item.severity]}`, 20, y)
      y += 5
      doc.text(`Description: ${item.description}`, 20, y)
      y += 5

      const compMeasurements = measurements.filter(m => m.componentId === item.componentId)
      if (compMeasurements.length > 0) {
        doc.text('Measurements:', 20, y)
        y += 5
        compMeasurements.forEach(m => {
          if (y > 280) { doc.addPage(); y = 20 }
          doc.text(`  ${m.metricName}: ${m.value}${m.unit} (${m.measuredAt.slice(0, 10)})`, 24, y)
          y += 4
        })
      }

      const compRepairs = repairSuggestions.filter(r => r.componentId === item.componentId)
      if (compRepairs.length > 0) {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.text('Repair suggestions:', 20, y)
        y += 5
        compRepairs.forEach(r => {
          if (y > 280) { doc.addPage(); y = 20 }
          doc.text(`  ${r.suggestion} (${r.responsiblePerson}, ${r.plannedDate})`, 24, y)
          y += 4
        })
      }

      doc.text(`Review status: ${STATUS_LABELS[item.reviewStatus]}`, 20, y)
      y += 4
      doc.text(`Discovered: ${item.discoveredAt.slice(0, 10)}`, 20, y)
      y += 10
    })

    doc.save('disease-report.pdf')
  }, [filteredItems, measurements, repairSuggestions])

  const exportExcel = useCallback(() => {
    const rows = filteredItems.map(item => {
      const compRepairs = repairSuggestions.filter(r => r.componentId === item.componentId)
      return {
        '构件名称': item.componentName,
        '构件编号': item.componentCode,
        '病害类型': item.diseaseType,
        '严重程度': SEVERITY_LABELS[item.severity],
        '病害描述': item.description,
        '发现时间': item.discoveredAt.slice(0, 10),
        '修缮建议': compRepairs.map(r => r.suggestion).join('；'),
        '评审状态': STATUS_LABELS[item.reviewStatus],
      }
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Diseases')
    ws['!cols'] = [
      { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
      { wch: 40 }, { wch: 12 }, { wch: 40 }, { wch: 10 },
    ]
    XLSX.writeFile(wb, 'disease-report.xlsx')
  }, [filteredItems, repairSuggestions])

  return (
    <div className="h-screen flex flex-col bg-ink-900">
      <header className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-ink-700/50 glass-panel">
        <button className="btn-ghost flex items-center gap-1 text-sm" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> 返回
        </button>
        <h1 className="font-serif text-lg font-semibold text-sandalwood-200">评审导出</h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 shrink-0 glass-panel border-r border-ink-700/50 flex flex-col overflow-y-auto">
          <div className="p-4 flex items-center gap-2 border-b border-ink-700/50">
            <Filter size={16} className="text-sandalwood-400" />
            <span className="text-sm font-medium text-sandalwood-200">筛选条件</span>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <button className="btn-ghost text-xs px-2 py-1 flex-1" onClick={selectAll}>全选</button>
              <button className="btn-ghost text-xs px-2 py-1 flex-1" onClick={deselectAll}>全不选</button>
            </div>

            <FilterSection
              title="构件类型"
              options={COMPONENT_OPTIONS}
              selected={selectedTypes}
              onToggle={(v) => toggleSet(selectedTypes, v, (s) => setSelectedTypes(s as Set<ComponentType>))}
            />

            <FilterSection
              title="严重程度"
              options={SEVERITY_OPTIONS}
              selected={selectedSeverities}
              onToggle={(v) => toggleSet(selectedSeverities, v, setSelectedSeverities)}
            />

            <FilterSection
              title="评审状态"
              options={STATUS_OPTIONS}
              selected={selectedStatuses}
              onToggle={(v) => toggleSet(selectedStatuses, v, setSelectedStatuses)}
            />
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-ink-400">
              没有匹配的评审项
            </div>
          ) : (
            filteredItems.map(item => {
              const itemMeasurements = measurements.filter(m => m.componentId === item.componentId)
              const itemPhotos = photos.filter(p => p.componentId === item.componentId)
              const itemRepairs = repairSuggestions.filter(r => r.componentId === item.componentId)
              return (
                <ExportItemCard
                  key={item.reviewItemId}
                  item={item}
                  expanded={expandedId === item.reviewItemId}
                  onToggle={() => setExpandedId(prev => prev === item.reviewItemId ? null : item.reviewItemId)}
                  onLocate={() => handleLocate(item.componentId)}
                  measurements={itemMeasurements}
                  photos={itemPhotos}
                  repairSuggestions={itemRepairs}
                />
              )
            })
          )}
        </main>
      </div>

      <footer className="shrink-0 glass-panel border-t border-ink-700/50 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-ink-400">
          已选 <span className="text-sandalwood-300 font-medium">{filteredItems.length}</span> 项
        </span>
        <div className="flex gap-3">
          <button
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40 disabled:pointer-events-none"
            disabled={filteredItems.length === 0}
            onClick={exportPDF}
          >
            <FileText size={16} /> 导出PDF
          </button>
          <button
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40 disabled:pointer-events-none"
            disabled={filteredItems.length === 0}
            onClick={exportExcel}
          >
            <FileSpreadsheet size={16} /> 导出Excel
          </button>
        </div>
      </footer>
    </div>
  )
}

function FilterSection({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: { value: string; label: string }[]
  selected: Set<string>
  onToggle: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-ink-300 uppercase tracking-wide">{title}</h4>
      <div className="space-y-1">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-2 text-sm text-ink-200 cursor-pointer hover:text-sandalwood-200 transition-colors">
            <input
              type="checkbox"
              checked={selected.has(opt.value)}
              onChange={() => onToggle(opt.value)}
              className="accent-sandalwood-500 rounded"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  )
}

function ExportItemCard({
  item,
  expanded,
  onToggle,
  onLocate,
  measurements,
  photos,
  repairSuggestions,
}: {
  item: ExportItem
  expanded: boolean
  onToggle: () => void
  onLocate: () => void
  measurements: Measurement[]
  photos: Photo[]
  repairSuggestions: RepairSuggestion[]
}) {
  return (
    <div className="glass-panel rounded-lg overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-ink-700/30 transition-colors"
        onClick={onToggle}
      >
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 mt-0.5 text-ink-400 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-ink-100">{item.title}</span>
            <span className={SEVERITY_CLASSES[item.severity]}>{SEVERITY_LABELS[item.severity]}</span>
            <span className={STATUS_CLASSES[item.reviewStatus]}>{STATUS_LABELS[item.reviewStatus]}</span>
          </div>
          <div className="text-xs text-ink-400 mt-1">
            {item.componentName} · {item.diseaseType}
          </div>
          {!expanded && (
            <p className="text-xs text-ink-500 mt-1 truncate">{item.description}</p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-ink-700/30">
          <div className="pt-3">
            <h5 className="text-xs font-medium text-ink-300 mb-1">病害详情</h5>
            <p className="text-sm text-ink-200">{item.description}</p>
            <p className="text-xs text-ink-500 mt-1">发现时间: {item.discoveredAt.slice(0, 10)}</p>
          </div>

          {photos.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-ink-300 mb-2">照片</h5>
              <div className="grid grid-cols-4 gap-2">
                {photos.map(p => (
                  <img
                    key={p.id}
                    src={p.thumbnail}
                    alt={p.description}
                    className="w-full aspect-[4/3] object-cover rounded border border-ink-700/50"
                  />
                ))}
              </div>
            </div>
          )}

          {measurements.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-ink-300 mb-2">测量数据</h5>
              <div className="grid grid-cols-2 gap-2">
                {measurements.map(m => (
                  <div key={m.id} className="bg-ink-800/60 rounded px-3 py-2 text-xs">
                    <span className="text-ink-400">{m.metricName}</span>
                    <span className="text-sandalwood-200 ml-2 font-medium">{m.value}{m.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {repairSuggestions.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-ink-300 mb-2">修缮建议</h5>
              {repairSuggestions.map(r => (
                <div key={r.id} className="bg-ink-800/60 rounded px-3 py-2 text-xs text-ink-200">
                  {r.suggestion}
                  <span className="text-ink-500 ml-2">— {r.responsiblePerson}</span>
                </div>
              ))}
            </div>
          )}

          <button
            className="btn-ghost text-xs flex items-center gap-1"
            onClick={onLocate}
          >
            <MapPin size={14} /> 定位到构件
          </button>
        </div>
      )}
    </div>
  )
}
