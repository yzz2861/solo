import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  Plus,
  Edit2,
  Trash2,
  Video,
  FileWarning,
  Clock,
  Play,
  CheckCircle,
  AlertTriangle,
  Pause,
  FolderOpen,
  HardDrive
} from 'lucide-react'
import Modal from '@/components/Modal'
import TapeDetailPanel from './TapeDetailPanel'
import type { Tape, Customer, OutputFormat, DeliveryMedium, TapeStatus } from '@/types'
import {
  TAPE_STATUS_LABELS,
  TAPE_STATUS_COLORS,
  DELIVERY_MEDIUM_LABELS,
  OUTPUT_FORMAT_LABELS,
  formatDateShort
} from '@/utils'

interface Props {
  searchKeyword: string
}

export default function TapeManager({ searchKeyword }: Props) {
  const { tapes, customers, addTape, updateTape, deleteTape, getCustomer, checkDuplicateTapeNumber } =
    useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [editingTape, setEditingTape] = useState<Tape | null>(null)
  const [selectedTapeId, setSelectedTapeId] = useState<string | null>(null)
  const [invalidPaths, setInvalidPaths] = useState<Record<string, boolean>>({})

  const filtered = tapes.filter((t) => {
    if (!searchKeyword) return true
    const kw = searchKeyword.toLowerCase()
    const customer = getCustomer(t.customerId)
    return (
      t.title.toLowerCase().includes(kw) ||
      t.tapeNumber.toLowerCase().includes(kw) ||
      (customer?.name || '').toLowerCase().includes(kw)
    )
  })

  useEffect(() => {
    const checkPaths = async () => {
      const results: Record<string, boolean> = {}
      for (const tape of tapes) {
        if (tape.videoFilePath) {
          const exists = await window.electronAPI.checkFileExists(tape.videoFilePath)
          results[tape.id] = !exists
        }
      }
      setInvalidPaths(results)
    }
    checkPaths()
  }, [tapes.map((t) => t.videoFilePath).join(',')])

  const handleSubmit = (data: any) => {
    if (editingTape) {
      updateTape(editingTape.id, data)
    } else {
      addTape(data)
    }
    setShowModal(false)
    setEditingTape(null)
  }

  const handleDelete = (tape: Tape) => {
    if (confirm(`确定删除磁带「${tape.title}」吗？相关片段和损坏记录也会被删除。`)) {
      deleteTape(tape.id)
    }
  }

  const getStatusIcon = (status: TapeStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'transcribing':
        return <Play className="w-4 h-4" />
      case 'interrupted':
        return <Pause className="w-4 h-4" />
      case 'transcribed':
        return <CheckCircle className="w-4 h-4" />
      case 'repairing':
        return <AlertTriangle className="w-4 h-4" />
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 flex-1 overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">磁带列表</h3>
            <button
              onClick={() => {
                setEditingTape(null)
                setShowModal(true)
              }}
              className="btn-primary btn-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              新增磁带
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无磁带数据</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((tape) => {
                const customer = getCustomer(tape.customerId)
                const pathInvalid = invalidPaths[tape.id]
                return (
                  <div
                    key={tape.id}
                    onClick={() => setSelectedTapeId(tape.id)}
                    className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedTapeId === tape.id ? 'ring-2 ring-primary-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            tape.status === 'completed'
                              ? 'bg-green-100 text-green-600'
                              : tape.status === 'interrupted'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-primary-100 text-primary-600'
                          }`}
                        >
                          {getStatusIcon(tape.status)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-800">{tape.title}</h4>
                            <span className="tag bg-gray-100 text-gray-600">
                              {tape.tapeNumber}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            客户：{customer?.name || '未知'}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`tag ${TAPE_STATUS_COLORS[tape.status]}`}>
                              {TAPE_STATUS_LABELS[tape.status]}
                            </span>
                            <span className="tag bg-blue-50 text-blue-600">
                              {OUTPUT_FORMAT_LABELS[tape.outputFormat]}
                            </span>
                            {!tape.formatConfirmed && (
                              <span className="tag bg-yellow-50 text-yellow-600">
                                格式待确认
                              </span>
                            )}
                            {pathInvalid && tape.videoFilePath && (
                              <span className="tag bg-red-50 text-red-600 flex items-center gap-1">
                                <FileWarning className="w-3 h-3" />
                                路径失效
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingTape(tape)
                            setShowModal(true)
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(tape)
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {tape.status === 'transcribing' && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>转录进度</span>
                          <span>{tape.transcriptionProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 transition-all"
                            style={{ width: `${tape.transcriptionProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {DELIVERY_MEDIUM_LABELS[tape.deliveryMedium]}
                      </span>
                      <span>片段: {tape.segments.length} | 损坏: {tape.damageSpots.length}</span>
                      <span>{formatDateShort(tape.createdAt)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {selectedTapeId && (
        <TapeDetailPanel tapeId={selectedTapeId} onClose={() => setSelectedTapeId(null)} />
      )}

      {showModal && (
        <TapeFormModal
          tape={editingTape}
          customers={customers}
          onClose={() => {
            setShowModal(false)
            setEditingTape(null)
          }}
          onSubmit={handleSubmit}
          checkDuplicate={checkDuplicateTapeNumber}
        />
      )}
    </div>
  )
}

function TapeFormModal({
  tape,
  customers,
  onClose,
  onSubmit,
  checkDuplicate
}: {
  tape: Tape | null
  customers: Customer[]
  onClose: () => void
  onSubmit: (data: any) => void
  checkDuplicate: (num: string, excludeId?: string) => boolean
}) {
  const [form, setForm] = useState({
    tapeNumber: tape?.tapeNumber || '',
    customerId: tape?.customerId || '',
    title: tape?.title || '',
    videoFilePath: tape?.videoFilePath || '',
    outputFormat: (tape?.outputFormat || 'mp4') as OutputFormat,
    formatConfirmed: tape?.formatConfirmed || false,
    status: (tape?.status || 'pending') as TapeStatus,
    tapeType: tape?.tapeType || '',
    duration: tape?.duration || '',
    deliveryMedium: (tape?.deliveryMedium || 'usb') as DeliveryMedium,
    deliveryNotes: tape?.deliveryNotes || '',
    delivered: tape?.delivered || false,
    notes: tape?.notes || ''
  })

  const [duplicateWarning, setDuplicateWarning] = useState(false)

  const handleTapeNumberChange = (value: string) => {
    setForm({ ...form, tapeNumber: value })
    setDuplicateWarning(checkDuplicate(value, tape?.id))
  }

  const selectVideoFile = async () => {
    const filePath = await window.electronAPI.selectVideoFile()
    if (filePath) {
      setForm({ ...form, videoFilePath: filePath })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.tapeNumber.trim() || !form.customerId || !form.title.trim()) {
      alert('请填写磁带编号、客户和标题')
      return
    }
    onSubmit(form)
  }

  return (
    <Modal title={tape ? '编辑磁带' : '新增磁带'} onClose={onClose} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              磁带编号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.tapeNumber}
              onChange={(e) => handleTapeNumberChange(e.target.value)}
              className={`input-field ${duplicateWarning ? 'border-yellow-500 ring-yellow-200' : ''}`}
              placeholder="如：TAPE-001"
            />
            {duplicateWarning && (
              <p className="text-xs text-yellow-600 mt-1">⚠️ 该编号已存在，请注意是否重复</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              客户 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              className="input-field"
            >
              <option value="">请选择客户</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.phone}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            磁带标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input-field"
            placeholder="如：小明的婚礼录像"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">转录文件路径</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.videoFilePath}
              onChange={(e) => setForm({ ...form, videoFilePath: e.target.value })}
              className="input-field flex-1"
              placeholder="选择转录后的视频文件路径"
            />
            <button
              type="button"
              onClick={selectVideoFile}
              className="btn-secondary btn-sm flex items-center gap-1"
            >
              <FolderOpen className="w-4 h-4" />
              选择文件
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">磁带类型</label>
            <input
              type="text"
              value={form.tapeType}
              onChange={(e) => setForm({ ...form, tapeType: e.target.value })}
              className="input-field"
              placeholder="如：VHS、Hi8、DV带"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">时长</label>
            <input
              type="text"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className="input-field"
              placeholder="如：01:30:00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">输出格式</label>
            <select
              value={form.outputFormat}
              onChange={(e) =>
                setForm({ ...form, outputFormat: e.target.value as OutputFormat })
              }
              className="input-field"
            >
              <option value="mp4">MP4 (推荐)</option>
              <option value="mov">MOV</option>
              <option value="avi">AVI</option>
              <option value="mkv">MKV</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">当前状态</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TapeStatus })}
              className="input-field"
            >
              <option value="pending">待转录</option>
              <option value="transcribing">转录中</option>
              <option value="interrupted">转录中断</option>
              <option value="transcribed">已转录</option>
              <option value="repairing">修复中</option>
              <option value="completed">已完成</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.formatConfirmed}
              onChange={(e) => setForm({ ...form, formatConfirmed: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-gray-700">客户已确认格式</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.delivered}
              onChange={(e) => setForm({ ...form, delivered: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-gray-700">已交付</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">交付介质</label>
          <select
            value={form.deliveryMedium}
            onChange={(e) =>
              setForm({ ...form, deliveryMedium: e.target.value as DeliveryMedium })
            }
            className="input-field"
          >
            <option value="usb">U盘</option>
            <option value="dvd">DVD光盘</option>
            <option value="cloud">云存储</option>
            <option value="hard_drive">移动硬盘</option>
            <option value="other">其他</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">交付说明</label>
          <input
            type="text"
            value={form.deliveryNotes}
            onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
            className="input-field"
            placeholder="U盘容量、快递地址等"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input-field h-20 resize-none"
            placeholder="其他备注信息"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">
            取消
          </button>
          <button type="submit" className="btn-primary btn-sm">
            {tape ? '保存修改' : '创建磁带'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
