import { useState } from 'react'
import { useDilutionStore } from '@/store/useDilutionStore'
import type { UsagePreset, DisinfectantType, ConcentrationUnit } from '@/types'
import { DISINFECTANT_LABELS } from '@/types'
import { Settings, Plus, Pencil, Trash2, Save, X } from 'lucide-react'

const EMPTY_FORM = {
  scenarioName: '',
  recommendedType: '84' as DisinfectantType,
  recommendedConcentration: 0,
  concentrationUnit: '%' as ConcentrationUnit,
  description: '',
}

export default function Presets() {
  const presets = useDilutionStore((s) => s.presets)
  const addPreset = useDilutionStore((s) => s.addPreset)
  const updatePreset = useDilutionStore((s) => s.updatePreset)
  const deletePreset = useDilutionStore((s) => s.deletePreset)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const startAdd = () => {
    setEditingId(null)
    setIsAdding(true)
    setForm(EMPTY_FORM)
  }

  const startEdit = (p: UsagePreset) => {
    setIsAdding(false)
    setEditingId(p.id)
    setForm({
      scenarioName: p.scenarioName,
      recommendedType: p.recommendedType,
      recommendedConcentration: p.recommendedConcentration,
      concentrationUnit: p.concentrationUnit,
      description: p.description,
    })
  }

  const cancel = () => {
    setEditingId(null)
    setIsAdding(false)
    setForm(EMPTY_FORM)
  }

  const handleSave = () => {
    if (!form.scenarioName.trim() || form.recommendedConcentration <= 0) return
    if (isAdding) {
      addPreset({ id: crypto.randomUUID(), ...form })
    } else if (editingId) {
      updatePreset(editingId, form)
    }
    cancel()
  }

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除此预设吗？')) {
      deletePreset(id)
    }
  }

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const renderForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">场景名称</label>
        <input
          value={form.scenarioName}
          onChange={(e) => setField('scenarioName', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          placeholder="如：地面消毒"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">推荐消毒剂</label>
        <select
          value={form.recommendedType}
          onChange={(e) => setField('recommendedType', e.target.value as DisinfectantType)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        >
          {Object.entries(DISINFECTANT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">推荐浓度</label>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            value={form.recommendedConcentration || ''}
            onChange={(e) => setField('recommendedConcentration', Number(e.target.value))}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            placeholder="浓度值"
          />
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(['%', 'mg/L'] as ConcentrationUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => setField('concentrationUnit', u)}
                className={`px-3 py-2 text-sm transition-colors ${
                  form.concentrationUnit === u
                    ? 'bg-sky-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
        <textarea
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 resize-none"
          placeholder="场景说明"
        />
      </div>
      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors"
        >
          <Save size={15} /> 保存
        </button>
        <button
          onClick={cancel}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <X size={15} /> 取消
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <Settings size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">用途预设</h1>
            <p className="text-sm text-gray-500">管理不同消毒场景的推荐浓度</p>
          </div>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors"
        >
          <Plus size={16} /> 新增
        </button>
      </div>

      {isAdding && (
        <div className="rounded-xl border-2 border-sky-200 bg-sky-50 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-sky-700 mb-3">新增预设</h3>
          {renderForm()}
        </div>
      )}

      <div className="space-y-3">
        {presets.map((p) =>
          editingId === p.id ? (
            <div key={p.id} className="rounded-xl border-2 border-sky-200 bg-sky-50 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-sky-700 mb-3">编辑预设</h3>
              {renderForm()}
            </div>
          ) : (
            <div key={p.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">{p.scenarioName}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="rounded-full bg-sky-50 px-2.5 py-0.5 font-medium text-sky-700">
                      {DISINFECTANT_LABELS[p.recommendedType]}
                    </span>
                    <span className="font-medium text-gray-800">
                      {p.recommendedConcentration} {p.concentrationUnit}
                    </span>
                  </div>
                  {p.description && (
                    <p className="text-sm text-gray-500">{p.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(p)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ),
        )}

        {presets.length === 0 && !isAdding && (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
            暂无预设，点击上方「新增」添加
          </div>
        )}
      </div>
    </div>
  )
}
