import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, X, ChevronRight } from 'lucide-react'
import { useReviewStore } from '@/store/useReviewStore'
import { parseDilution } from '@/utils/cfuCalculator'
import { PLATE_SPECIAL_VALUES, type SampleEntry, type DilutionGroup, type VolumeUnit } from '@/utils/types'

function PlateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const hits = PLATE_SPECIAL_VALUES.filter(s =>
    value.length > 0 && s.toLowerCase().startsWith(value.toLowerCase())
  )

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded font-mono bg-white focus:outline-none focus:ring-1 focus:ring-[#0D7377]"
      />
      {open && hits.length > 0 && (
        <div className="absolute z-20 top-full left-0 mt-0.5 bg-white border border-gray-200 rounded-md shadow-lg min-w-[100px]">
          {hits.map(s => (
            <button
              key={s}
              onMouseDown={() => { onChange(s); setOpen(false) }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[#0D7377]/10 font-mono"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DilutionRow({ sampleId, d }: { sampleId: string; d: DilutionGroup }) {
  const { updateDilution, updatePlate, removeDilution } = useReviewStore()
  const parsed = d.rawDilutionInput ? parseDilution(d.rawDilutionInput) : null

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-2">
        <div>
          <input
            value={d.rawDilutionInput}
            onChange={e => updateDilution(sampleId, d.id, { rawDilutionInput: e.target.value })}
            placeholder="如 10^-3"
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#0D7377]"
          />
          {parsed && (
            <span className="text-[11px] text-[#0D7377] mt-0.5 block font-mono">
              → {parsed.display} = {parsed.value}
            </span>
          )}
        </div>
      </td>
      <td className="py-2 px-2">
        <input
          type="number"
          value={d.inoculationVolume || ''}
          onChange={e => updateDilution(sampleId, d.id, { inoculationVolume: Number(e.target.value) || 0 })}
          className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#0D7377]"
        />
      </td>
      <td className="py-2 px-2">
        <select
          value={d.volumeUnit}
          onChange={e => updateDilution(sampleId, d.id, { volumeUnit: e.target.value as VolumeUnit })}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0D7377]"
        >
          <option value="mL">mL</option>
          <option value="μL">μL</option>
        </select>
      </td>
      {d.plates.map(plate => (
        <td key={plate.id} className="py-2 px-2">
          <PlateInput value={plate.rawInput} onChange={v => updatePlate(sampleId, d.id, plate.id, v)} />
        </td>
      ))}
      <td className="py-2 pl-2">
        <button onClick={() => removeDilution(sampleId, d.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}

function SampleCard({ sample }: { sample: SampleEntry }) {
  const { updateSampleName, removeSample, addDilution } = useReviewStore()

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-5">
      <div className="flex items-center gap-3 mb-4">
        <input
          value={sample.sampleName}
          onChange={e => updateSampleName(sample.id, e.target.value)}
          placeholder="样品名称"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0D7377] font-medium"
        />
        <button onClick={() => removeSample(sample.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th className="pb-2 pr-2 font-medium">稀释度</th>
              <th className="pb-2 px-2 font-medium">接种量</th>
              <th className="pb-2 px-2 font-medium">单位</th>
              <th className="pb-2 px-2 font-medium">平皿 1</th>
              <th className="pb-2 px-2 font-medium">平皿 2</th>
              <th className="pb-2 pl-2 font-medium w-8"></th>
            </tr>
          </thead>
          <tbody>
            {sample.dilutions.map(d => (
              <DilutionRow key={d.id} sampleId={sample.id} d={d} />
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={() => addDilution(sample.id)} className="mt-3 text-xs text-[#0D7377] hover:text-[#0D7377]/80 font-medium">
        + 添加稀释度
      </button>
    </div>
  )
}

export default function DataEntry() {
  const navigate = useNavigate()
  const { currentRecord, initRecord, addSample, runReview } = useReviewStore()
  const [className, setClassName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reviewerName, setReviewerName] = useState('')
  const [role, setRole] = useState<'teacher' | 'technician'>('teacher')
  const [newSampleName, setNewSampleName] = useState('')

  if (!currentRecord) {
    return (
      <div className="max-w-md mx-auto mt-8 md:mt-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
          <h2 className="text-lg font-bold text-[#0D7377] mb-5">初始化记录</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">班级名称</label>
              <input value={className} onChange={e => setClassName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0D7377]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">小组名称</label>
              <input value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0D7377]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">日期</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0D7377]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">复核人</label>
              <input value={reviewerName} onChange={e => setReviewerName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0D7377]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">角色</label>
              <select value={role} onChange={e => setRole(e.target.value as 'teacher' | 'technician')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0D7377]">
                <option value="teacher">教师</option>
                <option value="technician">实验员</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => initRecord(className, groupName, date, reviewerName, role)}
            disabled={!className || !groupName || !reviewerName}
            className="mt-6 w-full py-2.5 bg-[#0D7377] text-white rounded-lg font-medium text-sm hover:bg-[#0D7377]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            开始录入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="font-bold text-[#0D7377]">{currentRecord.className}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-700">{currentRecord.groupName}</span>
        <span className="text-gray-300">|</span>
        <span className="font-mono text-gray-500">{currentRecord.reviewDate}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-700">{currentRecord.reviewerName}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          currentRecord.role === 'teacher' ? 'bg-[#0D7377]/10 text-[#0D7377]' : 'bg-amber-100 text-[#D97706]'
        }`}>
          {currentRecord.role === 'teacher' ? '教师' : '实验员'}
        </span>
      </div>

      {currentRecord.samples.map(sample => (
        <SampleCard key={sample.id} sample={sample} />
      ))}

      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 flex items-center gap-2">
          <input
            value={newSampleName}
            onChange={e => setNewSampleName(e.target.value)}
            placeholder="新样品名称"
            className="flex-1 max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0D7377]"
          />
          <button
            onClick={() => {
              addSample(newSampleName || `样品 ${currentRecord.samples.length + 1}`)
              setNewSampleName('')
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#D97706] text-white rounded-lg text-sm font-medium hover:bg-[#D97706]/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加样品
          </button>
        </div>
        <button
          onClick={() => { runReview(); navigate('/review') }}
          className="flex items-center gap-1.5 px-5 py-2 bg-[#0D7377] text-white rounded-lg text-sm font-medium hover:bg-[#0D7377]/90 transition-colors"
        >
          开始复核
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
