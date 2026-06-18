import { useState } from 'react'
import { Info, Camera, Ruler, Wrench, AlertTriangle, Plus, Trash2, X } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { ComponentType, PhotoAngle, RepairSuggestion, Disease } from '@/types'

const TABS = [
  { key: 'info' as const, label: '基本信息', icon: Info },
  { key: 'photos' as const, label: '照片', icon: Camera },
  { key: 'measurements' as const, label: '测量值', icon: Ruler },
  { key: 'repair' as const, label: '修缮建议', icon: Wrench },
  { key: 'disease' as const, label: '病害', icon: AlertTriangle },
]

const ANGLE_LABELS: Record<PhotoAngle, string> = {
  front: '正视', side: '侧视', top: '俯视', bottom: '仰视', unknown: '不详',
}

const TYPE_OPTIONS: { value: ComponentType; label: string }[] = [
  { value: 'beam', label: '梁' }, { value: 'purlin', label: '檩' },
  { value: 'pillar', label: '柱' }, { value: 'dougong', label: '斗拱' },
  { value: 'disease', label: '病害' },
]

const STATUS_LABELS = { pending: '待处理', in_progress: '进行中', completed: '已完成' } as const
const SEVERITY_LABELS = { low: '低', medium: '中', high: '高', critical: '严重' } as const
const SEVERITY_CLASSES = {
  low: 'badge bg-celadon-500/20 text-celadon-300',
  medium: 'badge bg-sandalwood-400/20 text-sandalwood-300',
  high: 'badge bg-cinnabar-400/20 text-cinnabar-400',
  critical: 'badge bg-cinnabar-600/30 text-cinnabar-200 shadow-glow animate-glow',
}

export default function InfoPanel() {
  const {
    selectedComponentId, components, photos, measurements, repairSuggestions,
    diseases, reinspections, rightPanelTab, setRightPanelTab,
    updateComponent, addPhoto, deletePhoto, addMeasurement, deleteMeasurement,
    addRepairSuggestion, updateRepairSuggestion, addDisease, addReinspection,
  } = useStore()

  const component = components.find(c => c.id === selectedComponentId) ?? null
  const [photoModal, setPhotoModal] = useState<string | null>(null)

  if (!component) {
    return (
      <div className="w-96 h-full glass-panel flex items-center justify-center">
        <p className="text-ink-400">请选择构件查看详情</p>
      </div>
    )
  }

  const compPhotos = photos.filter(p => p.componentId === component.id)
  const compMeasurements = [...measurements.filter(m => m.componentId === component.id)].sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()
  )
  const compRepairs = repairSuggestions.filter(r => r.componentId === component.id)
  const compDiseases = diseases.filter(d => d.componentId === component.id)

  return (
    <div className="w-96 h-full glass-panel flex flex-col">
      <div className="flex border-b border-ink-700/50 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setRightPanelTab(tab.key)}
            className={cn(
              'flex-1 py-2 flex flex-col items-center gap-0.5 text-xs transition-colors',
              rightPanelTab === tab.key
                ? 'text-sandalwood-300 border-b-2 border-sandalwood-500'
                : 'text-ink-400 hover:text-ink-200'
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4" key={component.id}>
        {rightPanelTab === 'info' && <InfoTab />}
        {rightPanelTab === 'photos' && <PhotosTab />}
        {rightPanelTab === 'measurements' && <MeasurementsTab />}
        {rightPanelTab === 'repair' && <RepairTab />}
        {rightPanelTab === 'disease' && <DiseaseTab />}
      </div>

      {photoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => setPhotoModal(null)}>
          <img src={photoModal} className="max-w-[80vw] max-h-[80vh] rounded-lg" />
          <button className="absolute top-4 right-4 text-white" onClick={() => setPhotoModal(null)}><X size={24} /></button>
        </div>
      )}
    </div>
  )

  function InfoTab() {
    const [form, setForm] = useState({ ...component })
    return (
      <div className="space-y-3">
        <h3 className="section-title">基本信息</h3>
        {!form.code && <span className="badge bg-cinnabar-500/20 text-cinnabar-300">编号缺失</span>}
        <label className="block text-xs text-ink-400">名称</label>
        <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <label className="block text-xs text-ink-400">编号</label>
        <input className="input-field" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
        <label className="block text-xs text-ink-400">类型</label>
        <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ComponentType }))}>
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="block text-xs text-ink-400">材质</label>
        <input className="input-field" value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} />
        <label className="block text-xs text-ink-400">尺寸</label>
        <input className="input-field" value={form.dimensions} onChange={e => setForm(f => ({ ...f, dimensions: e.target.value }))} />
        <p className="text-xs text-ink-500">创建于 {component.createdAt}</p>
        <button className="btn-primary w-full" onClick={() => updateComponent(component.id, form)}>保存</button>
      </div>
    )
  }

  function PhotosTab() {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="section-title">照片</h3>
          <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => {
            addPhoto({
              id: `photo-${Date.now()}`, componentId: component.id, angle: 'unknown',
              description: '新上传照片', takenAt: new Date().toISOString(),
              takenBy: '当前用户', thumbnail: 'https://placehold.co/200x150/1a1a22/a89880?text=Photo',
            })
          }}><Plus size={14} /> 上传</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {compPhotos.map(p => (
            <div key={p.id} className="relative group">
              <img src={p.thumbnail} className="w-full rounded-lg cursor-pointer" onClick={() => setPhotoModal(p.thumbnail)} />
              <span className={cn(
                'badge absolute top-1 left-1 text-[10px]',
                p.angle === 'unknown' ? 'bg-cinnabar-500/30 text-cinnabar-300' : 'bg-celadon-500/20 text-celadon-300'
              )}>{ANGLE_LABELS[p.angle]}</span>
              <button className="absolute top-1 right-1 bg-ink-800/70 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deletePhoto(p.id)}>
                <Trash2 size={12} className="text-cinnabar-400" />
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function MeasurementsTab() {
    const [form, setForm] = useState({ metricName: '', value: '', unit: 'mm', measuredBy: '' })
    return (
      <div className="space-y-3">
        <h3 className="section-title">测量值</h3>
        <table className="w-full text-xs">
          <thead><tr className="text-ink-400 border-b border-ink-700/50">
            <th className="py-1 text-left">指标名</th><th className="py-1 text-left">数值</th>
            <th className="py-1 text-left">时间</th><th className="py-1 text-left">人</th><th></th>
          </tr></thead>
          <tbody>
            {compMeasurements.map(m => (
              <tr key={m.id} className="border-b border-ink-800">
                <td className="py-1">{m.metricName}</td>
                <td className="py-1">{m.value}{m.unit}</td>
                <td className="py-1 text-ink-400">{m.measuredAt.slice(0, 10)}</td>
                <td className="py-1">{m.measuredBy}</td>
                <td><button onClick={() => deleteMeasurement(m.id)}><Trash2 size={12} className="text-cinnabar-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-2 pt-2">
          <input className="input-field text-xs" placeholder="指标名" value={form.metricName} onChange={e => setForm(f => ({ ...f, metricName: e.target.value }))} />
          <div className="flex gap-2">
            <input className="input-field text-xs flex-1" placeholder="数值" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            <input className="input-field text-xs w-16" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
          </div>
          <input className="input-field text-xs" placeholder="测量人" value={form.measuredBy} onChange={e => setForm(f => ({ ...f, measuredBy: e.target.value }))} />
          <button className="btn-ghost text-xs w-full" onClick={() => {
            if (!form.metricName || !form.value) return
            addMeasurement({
              id: `m-${Date.now()}`, componentId: component.id,
              metricName: form.metricName, value: Number(form.value), unit: form.unit,
              measuredAt: new Date().toISOString(), measuredBy: form.measuredBy,
            })
            setForm({ metricName: '', value: '', unit: 'mm', measuredBy: '' })
          }}><Plus size={14} className="inline mr-1" />添加</button>
        </div>
      </div>
    )
  }

  function RepairTab() {
    const [form, setForm] = useState({ suggestion: '', responsiblePerson: '', plannedDate: '' })
    return (
      <div className="space-y-3">
        <h3 className="section-title">修缮建议</h3>
        {compRepairs.map(r => (
          <div key={r.id} className="bg-ink-800/50 rounded-lg p-3 space-y-1">
            <p className="text-sm">{r.suggestion}</p>
            <div className="flex items-center gap-2 text-xs text-ink-400">
              <span>{r.responsiblePerson}</span><span>{r.plannedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <select className="input-field text-xs py-0.5 w-auto" value={r.status}
                onChange={e => updateRepairSuggestion(r.id, { status: e.target.value as RepairSuggestion['status'] })}>
                {(Object.entries(STATUS_LABELS) as [string, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <span className={cn('badge',
                r.status === 'pending' ? 'bg-sandalwood-500/20 text-sandalwood-300' :
                r.status === 'in_progress' ? 'bg-celadon-500/20 text-celadon-300' : 'bg-ink-600/30 text-ink-300'
              )}>{STATUS_LABELS[r.status]}</span>
            </div>
          </div>
        ))}
        <div className="space-y-2 pt-2">
          <input className="input-field text-xs" placeholder="建议内容" value={form.suggestion} onChange={e => setForm(f => ({ ...f, suggestion: e.target.value }))} />
          <div className="flex gap-2">
            <input className="input-field text-xs flex-1" placeholder="负责人" value={form.responsiblePerson} onChange={e => setForm(f => ({ ...f, responsiblePerson: e.target.value }))} />
            <input className="input-field text-xs w-28" type="date" value={form.plannedDate} onChange={e => setForm(f => ({ ...f, plannedDate: e.target.value }))} />
          </div>
          <button className="btn-ghost text-xs w-full" onClick={() => {
            if (!form.suggestion) return
            addRepairSuggestion({
              id: `r-${Date.now()}`, componentId: component.id,
              suggestion: form.suggestion, responsiblePerson: form.responsiblePerson,
              plannedDate: form.plannedDate, status: 'pending',
            })
            setForm({ suggestion: '', responsiblePerson: '', plannedDate: '' })
          }}><Plus size={14} className="inline mr-1" />添加</button>
        </div>
      </div>
    )
  }

  function DiseaseTab() {
    const [addForm, setAddForm] = useState({ type: '', description: '', severity: 'low' as Disease['severity'], discoveredBy: '' })
    return (
      <div className="space-y-3">
        <h3 className="section-title">病害</h3>
        {compDiseases.map(d => {
          const dReinsps = reinspections.filter(r => r.diseaseId === d.id)
          return (
            <div key={d.id} className="bg-ink-800/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{d.type}</span>
                <span className={SEVERITY_CLASSES[d.severity]}>{SEVERITY_LABELS[d.severity]}</span>
              </div>
              <p className="text-xs text-ink-300">{d.description}</p>
              <p className="text-xs text-ink-500">{d.discoveredAt.slice(0, 10)} · {d.discoveredBy}</p>
              {dReinsps.length > 0 && (
                <div className="pl-3 border-l-2 border-ink-600 space-y-1">
                  {dReinsps.map(r => (
                    <div key={r.id} className="text-xs">
                      <span className="text-ink-400">{r.inspectedAt.slice(0, 10)}</span>
                      <span className="text-ink-300 ml-2">{r.conclusion}</span>
                    </div>
                  ))}
                </div>
              )}
              <ReinspectionForm diseaseId={d.id} />
            </div>
          )
        })}
        <div className="space-y-2 pt-2 border-t border-ink-700/50">
          <input className="input-field text-xs" placeholder="病害类型" value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))} />
          <input className="input-field text-xs" placeholder="描述" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-2">
            <select className="input-field text-xs flex-1" value={addForm.severity} onChange={e => setAddForm(f => ({ ...f, severity: e.target.value as Disease['severity'] }))}>
              {(Object.entries(SEVERITY_LABELS) as [string, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className="input-field text-xs flex-1" placeholder="发现人" value={addForm.discoveredBy} onChange={e => setAddForm(f => ({ ...f, discoveredBy: e.target.value }))} />
          </div>
          <button className="btn-ghost text-xs w-full" onClick={() => {
            if (!addForm.type) return
            addDisease({
              id: `d-${Date.now()}`, componentId: component.id,
              type: addForm.type, description: addForm.description, severity: addForm.severity,
              discoveredAt: new Date().toISOString(), discoveredBy: addForm.discoveredBy,
            })
            setAddForm({ type: '', description: '', severity: 'low', discoveredBy: '' })
          }}><Plus size={14} className="inline mr-1" />添加病害</button>
        </div>
      </div>
    )
  }

  function ReinspectionForm({ diseaseId }: { diseaseId: string }) {
    const [form, setForm] = useState({ conclusion: '', inspectedBy: '' })
    const [open, setOpen] = useState(false)
    if (!open) return <button className="btn-ghost text-xs w-full" onClick={() => setOpen(true)}>+ 复查</button>
    return (
      <div className="space-y-1">
        <input className="input-field text-xs" placeholder="复查结论" value={form.conclusion} onChange={e => setForm(f => ({ ...f, conclusion: e.target.value }))} />
        <input className="input-field text-xs" placeholder="复查人" value={form.inspectedBy} onChange={e => setForm(f => ({ ...f, inspectedBy: e.target.value }))} />
        <div className="flex gap-2">
          <button className="btn-ghost text-xs flex-1" onClick={() => {
            if (!form.conclusion) return
            addReinspection({
              id: `ri-${Date.now()}`, diseaseId, taskId: '',
              inspectedAt: new Date().toISOString(), inspectedBy: form.inspectedBy,
              conclusion: form.conclusion, isExpanded: false, notes: '',
            })
            setForm({ conclusion: '', inspectedBy: '' })
            setOpen(false)
          }}>确认</button>
          <button className="btn-ghost text-xs" onClick={() => setOpen(false)}>取消</button>
        </div>
      </div>
    )
  }
}
