import { useState } from 'react'
import { useStore } from '@/store'
import type { Specimen, PreciousLevel, PressingStatus, SpecimenStatus } from '@/types'
import { Search, Plus, Edit2, Trash2, Leaf, AlertTriangle, Lock, X, ChevronDown } from 'lucide-react'

const PRECIOUS_LEVELS: PreciousLevel[] = ['普通', '珍贵', '极珍贵']
const PRESSING_STATUSES: PressingStatus[] = ['正常', '受潮']
const SPECIMEN_STATUSES: SpecimenStatus[] = ['在馆', '借出中', '待修复']

type ModalMode = 'add' | 'edit' | null

interface FormData {
  code: string
  family: string
  genus: string
  collectionSite: string
  collector: string
  collectionDate: string
  preciousLevel: PreciousLevel
  pressingStatus: PressingStatus
  status: SpecimenStatus
  notes: string
}

const emptyForm: FormData = {
  code: '',
  family: '',
  genus: '',
  collectionSite: '',
  collector: '',
  collectionDate: '',
  preciousLevel: '普通',
  pressingStatus: '正常',
  status: '在馆',
  notes: '',
}

function getPreciousBadgeColor(level: PreciousLevel) {
  if (level === '极珍贵') return 'bg-red-100 text-red-700'
  if (level === '珍贵') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

function getPressingBadgeColor(status: PressingStatus) {
  if (status === '受潮') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

function getSpecimenBadgeColor(status: SpecimenStatus) {
  if (status === '借出中') return 'bg-blue-100 text-blue-700'
  if (status === '待修复') return 'bg-red-100 text-red-700'
  return 'bg-green-100 text-green-700'
}

export default function SpecimensPage() {
  const { specimens, role, addSpecimen, updateSpecimen, deleteSpecimen } = useStore()

  const [search, setSearch] = useState('')
  const [filterPrecious, setFilterPrecious] = useState<PreciousLevel | ''>('')
  const [filterPressing, setFilterPressing] = useState<PressingStatus | ''>('')
  const [filterStatus, setFilterStatus] = useState<SpecimenStatus | ''>('')

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [codeError, setCodeError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Specimen | null>(null)

  const filtered = specimens.filter((s) => {
    const q = search.toLowerCase()
    if (q && ![s.code, s.family, s.genus, s.collectionSite].some((v) => v.toLowerCase().includes(q))) return false
    if (filterPrecious && s.preciousLevel !== filterPrecious) return false
    if (filterPressing && s.pressingStatus !== filterPressing) return false
    if (filterStatus && s.status !== filterStatus) return false
    return true
  })

  function openAddModal() {
    setForm(emptyForm)
    setCodeError('')
    setEditingId(null)
    setModalMode('add')
  }

  function openEditModal(specimen: Specimen) {
    setForm({
      code: specimen.code,
      family: specimen.family,
      genus: specimen.genus,
      collectionSite: specimen.collectionSite,
      collector: specimen.collector,
      collectionDate: specimen.collectionDate,
      preciousLevel: specimen.preciousLevel,
      pressingStatus: specimen.pressingStatus,
      status: specimen.status,
      notes: specimen.notes,
    })
    setCodeError('')
    setEditingId(specimen.id)
    setModalMode('edit')
  }

  function closeModal() {
    setModalMode(null)
    setEditingId(null)
    setCodeError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) {
      setCodeError('编号为必填项')
      return
    }
    setCodeError('')
    if (modalMode === 'add') {
      addSpecimen({
        code: form.code.trim(),
        family: form.family.trim(),
        genus: form.genus.trim(),
        collectionSite: form.collectionSite.trim(),
        collector: form.collector.trim(),
        collectionDate: form.collectionDate,
        preciousLevel: form.preciousLevel,
        pressingStatus: form.pressingStatus,
        status: form.status,
        notes: form.notes.trim(),
      })
    } else if (modalMode === 'edit' && editingId) {
      updateSpecimen(editingId, {
        code: form.code.trim(),
        family: form.family.trim(),
        genus: form.genus.trim(),
        collectionSite: form.collectionSite.trim(),
        collector: form.collector.trim(),
        collectionDate: form.collectionDate,
        preciousLevel: form.preciousLevel,
        pressingStatus: form.pressingStatus,
        status: form.status,
        notes: form.notes.trim(),
      })
    }
    closeModal()
  }

  function handleDelete() {
    if (!deleteTarget) return
    deleteSpecimen(deleteTarget.id)
    setDeleteTarget(null)
  }

  const isLibrarian = role === '馆员'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-forest-800 flex items-center gap-2">
          <Leaf className="w-6 h-6 text-forest-500" />
          标本台账
        </h1>
        {isLibrarian && (
          <button className="btn-primary flex items-center gap-1.5" onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            新增标本
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
          <input
            className="input-field pl-9"
            placeholder="搜索编号/科/属/采集地..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select
              className="select-field pr-8 min-w-[120px]"
              value={filterPrecious}
              onChange={(e) => setFilterPrecious(e.target.value as PreciousLevel | '')}
            >
              <option value="">珍贵等级</option>
              {PRECIOUS_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              className="select-field pr-8 min-w-[120px]"
              value={filterPressing}
              onChange={(e) => setFilterPressing(e.target.value as PressingStatus | '')}
            >
              <option value="">压片状态</option>
              {PRESSING_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              className="select-field pr-8 min-w-[120px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as SpecimenStatus | '')}
            >
              <option value="">借阅状态</option>
              {SPECIMEN_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sand-400">
          <Leaf className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">暂无标本数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((specimen) => (
            <div key={specimen.id} className="card p-4 relative">
              {(specimen.preciousLevel === '珍贵' || specimen.preciousLevel === '极珍贵') && (
                <Lock className="absolute top-3 right-3 w-4 h-4 text-amber-500" />
              )}
              {specimen.pressingStatus === '受潮' && (
                <AlertTriangle className="absolute top-3 right-9 w-4 h-4 text-amber-500" />
              )}
              <div className="space-y-2">
                <div>
                  <span className="font-mono font-bold text-forest-800">{specimen.code}</span>
                  <p className="text-sm text-forest-600">
                    {specimen.family} · {specimen.genus}
                  </p>
                </div>
                <p className="text-sm text-sand-600">
                  📍 {specimen.collectionSite}
                </p>
                <p className="text-sm text-sand-600">
                  👤 {specimen.collector}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className={`badge ${getPreciousBadgeColor(specimen.preciousLevel)}`}>
                    {specimen.preciousLevel}
                  </span>
                  <span className={`badge ${getPressingBadgeColor(specimen.pressingStatus)}`}>
                    {specimen.pressingStatus}
                  </span>
                  <span className={`badge ${getSpecimenBadgeColor(specimen.status)}`}>
                    {specimen.status}
                  </span>
                </div>
                {isLibrarian && (
                  <div className="flex gap-2 pt-2 border-t border-sand-100 mt-2">
                    <button
                      className="btn-secondary flex items-center gap-1 text-xs px-2.5 py-1.5"
                      onClick={() => openEditModal(specimen)}
                    >
                      <Edit2 className="w-3 h-3" />
                      编辑
                    </button>
                    {specimen.status === '在馆' && (
                      <button
                        className="btn-danger flex items-center gap-1 text-xs px-2.5 py-1.5"
                        onClick={() => setDeleteTarget(specimen)}
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-sand-200">
              <h2 className="text-lg font-semibold text-forest-800">
                {modalMode === 'add' ? '新增标本' : '编辑标本'}
              </h2>
              <button className="text-sand-400 hover:text-forest-600" onClick={closeModal}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="label-text">编号 *</label>
                <input
                  className="input-field"
                  value={form.code}
                  onChange={(e) => { setForm({ ...form, code: e.target.value }); setCodeError('') }}
                />
                {codeError && <p className="text-xs text-rust-500 mt-1">{codeError}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">科</label>
                  <input
                    className="input-field"
                    value={form.family}
                    onChange={(e) => setForm({ ...form, family: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-text">属</label>
                  <input
                    className="input-field"
                    value={form.genus}
                    onChange={(e) => setForm({ ...form, genus: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label-text">采集地</label>
                <input
                  className="input-field"
                  value={form.collectionSite}
                  onChange={(e) => setForm({ ...form, collectionSite: e.target.value })}
                />
              </div>
              <div>
                <label className="label-text">采集人</label>
                <input
                  className="input-field"
                  value={form.collector}
                  onChange={(e) => setForm({ ...form, collector: e.target.value })}
                />
              </div>
              <div>
                <label className="label-text">采集日期</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.collectionDate}
                  onChange={(e) => setForm({ ...form, collectionDate: e.target.value })}
                />
              </div>
              <div>
                <label className="label-text">珍贵等级</label>
                <div className="relative">
                  <select
                    className="select-field pr-8"
                    value={form.preciousLevel}
                    onChange={(e) => setForm({ ...form, preciousLevel: e.target.value as PreciousLevel })}
                  >
                    {PRECIOUS_LEVELS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="label-text">压片状态</label>
                <div className="relative">
                  <select
                    className="select-field pr-8"
                    value={form.pressingStatus}
                    onChange={(e) => setForm({ ...form, pressingStatus: e.target.value as PressingStatus })}
                  >
                    {PRESSING_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="label-text">借阅状态</label>
                <div className="relative">
                  <select
                    className="select-field pr-8"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as SpecimenStatus })}
                  >
                    {SPECIMEN_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="label-text">备注</label>
                <textarea
                  className="input-field min-h-[80px] resize-y"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  {modalMode === 'add' ? '新增' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-forest-800 mb-2">确认删除</h3>
            <p className="text-sm text-sand-600 mb-4">
              确定要删除标本 <span className="font-mono font-bold">{deleteTarget.code}</span> 吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
                取消
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
