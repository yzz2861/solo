import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  Package,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Video,
  ChevronRight
} from 'lucide-react'
import Papa from 'papaparse'
import jsPDF from 'jspdf'
import type { Tape } from '@/types'
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

export default function DeliveryPanel({ searchKeyword }: Props) {
  const { tapes, getCustomer, updateTape } = useAppStore()
  const [filter, setFilter] = useState<'all' | 'deliverable' | 'delivered'>('deliverable')

  const deliverableTapes = tapes.filter(
    (t) => t.status === 'completed' && !t.delivered
  )
  const deliveredTapes = tapes.filter((t) => t.delivered)

  const filteredTapes = (() => {
    let list: Tape[]
    switch (filter) {
      case 'deliverable':
        list = deliverableTapes
        break
      case 'delivered':
        list = deliveredTapes
        break
      default:
        list = tapes
    }
    if (!searchKeyword) return list
    const kw = searchKeyword.toLowerCase()
    return list.filter((t) => {
      const customer = getCustomer(t.customerId)
      return (
        t.title.toLowerCase().includes(kw) ||
        t.tapeNumber.toLowerCase().includes(kw) ||
        (customer?.name || '').toLowerCase().includes(kw)
      )
    })
  })()

  const handleExportCSV = async () => {
    const data = filteredTapes.map((tape) => {
      const customer = getCustomer(tape.customerId)
      return {
        磁带编号: tape.tapeNumber,
        磁带标题: tape.title,
        客户姓名: customer?.name || '',
        客户电话: customer?.phone || '',
        输出格式: OUTPUT_FORMAT_LABELS[tape.outputFormat],
        格式确认: tape.formatConfirmed ? '是' : '否',
        交付介质: DELIVERY_MEDIUM_LABELS[tape.deliveryMedium],
        交付说明: tape.deliveryNotes || '',
        状态: TAPE_STATUS_LABELS[tape.status],
        片段数量: tape.segments.length,
        损坏数量: tape.damageSpots.length,
        是否已交付: tape.delivered ? '是' : '否',
        交付时间: tape.deliveredAt ? formatDateShort(tape.deliveredAt) : '',
        创建时间: formatDateShort(tape.createdAt)
      }
    })

    const csv = Papa.unparse(data)
    const filePath = await window.electronAPI.showSaveDialog({
      title: '导出交付清单',
      defaultPath: `交付清单_${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV文件', extensions: ['csv'] }]
    })

    if (filePath) {
      const result = await window.electronAPI.writeFile(filePath, '\ufeff' + csv)
      if (result.success) {
        alert('导出成功！')
      } else {
        alert('导出失败：' + result.error)
      }
    }
  }

  const handleExportPDF = async () => {
    const doc = new jsPDF()
    let y = 20

    doc.setFontSize(18)
    doc.text('Family Video Archiver - Delivery List', 20, y)
    y += 10

    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y)
    y += 10

    let customerName = ''
    filteredTapes.forEach((tape, index) => {
      const customer = getCustomer(tape.customerId)
      if (customer?.name !== customerName) {
        customerName = customer?.name || ''
        y += 5
        doc.setFontSize(12)
        doc.setTextColor(100, 50, 150)
        doc.text(`Customer: ${customerName}`, 20, y)
        y += 8
        doc.setTextColor(0)
      }

      if (y > 270) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(11)
      doc.setTextColor(50)
      doc.text(`${index + 1}. ${tape.title} (${tape.tapeNumber})`, 25, y)
      y += 6

      doc.setFontSize(9)
      doc.setTextColor(100)
      doc.text(`    Format: ${OUTPUT_FORMAT_LABELS[tape.outputFormat]}`, 25, y)
      y += 5
      doc.text(`    Status: ${TAPE_STATUS_LABELS[tape.status]}`, 25, y)
      y += 5
      doc.text(`    Delivery: ${DELIVERY_MEDIUM_LABELS[tape.deliveryMedium]}`, 25, y)
      y += 5
      doc.text(`    Segments: ${tape.segments.length}, Damage: ${tape.damageSpots.length}`, 25, y)
      y += 8
    })

    const pdfBuffer = doc.output('arraybuffer')
    const filePath = await window.electronAPI.showSaveDialog({
      title: '导出交付清单PDF',
      defaultPath: `Delivery_List_${new Date().toISOString().slice(0, 10)}.pdf`,
      filters: [{ name: 'PDF文件', extensions: ['pdf'] }]
    })

    if (filePath) {
      const result = await window.electronAPI.writeBuffer(filePath, new Uint8Array(pdfBuffer))
      if (result.success) {
        alert('PDF exported successfully!')
      } else {
        alert('Export failed: ' + result.error)
      }
    }
  }

  const handleMarkDelivered = (tape: Tape) => {
    if (confirm(`确认将「${tape.title}」标记为已交付？`)) {
      updateTape(tape.id, {
        delivered: true,
        deliveredAt: new Date().toISOString()
      })
    }
  }

  const handleMarkUndelivered = (tape: Tape) => {
    if (confirm(`确认将「${tape.title}」标记为未交付？`)) {
      updateTape(tape.id, {
        delivered: false,
        deliveredAt: undefined
      })
    }
  }

  const filters = [
    { key: 'deliverable', label: '待交付', icon: Clock, count: deliverableTapes.length },
    { key: 'delivered', label: '已交付', icon: CheckCircle, count: deliveredTapes.length },
    { key: 'all', label: '全部磁带', icon: Video, count: tapes.length }
  ]

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-500" />
            交付清单
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            管理待交付和已交付的影像，支持导出 CSV 和 PDF
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredTapes.length === 0}
            className="btn-secondary btn-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            导出 CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={filteredTapes.length === 0}
            className="btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            导出 PDF
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        {filters.map((f) => {
          const Icon = f.icon
          const isActive = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-primary-50 border-2 border-primary-200 text-primary-700'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium text-sm">{f.label}</p>
                <p className="text-2xl font-bold">{f.count}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredTapes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">暂无数据</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTapes.map((tape) => {
              const customer = getCustomer(tape.customerId)
              return (
                <div
                  key={tape.id}
                  className="card p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                        <Video className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-800">{tape.title}</h4>
                          <span className="tag bg-gray-100 text-gray-600">{tape.tapeNumber}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          客户：{customer?.name || '未知'} · {customer?.phone || ''}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`tag ${TAPE_STATUS_COLORS[tape.status]}`}>
                            {TAPE_STATUS_LABELS[tape.status]}
                          </span>
                          <span className="tag bg-blue-50 text-blue-600">
                            {OUTPUT_FORMAT_LABELS[tape.outputFormat]}
                          </span>
                          <span className="tag bg-green-50 text-green-600">
                            {DELIVERY_MEDIUM_LABELS[tape.deliveryMedium]}
                          </span>
                          {!tape.formatConfirmed && (
                            <span className="tag bg-red-50 text-red-600">格式未确认</span>
                          )}
                          {tape.delivered && (
                            <span className="tag bg-emerald-50 text-emerald-600">已交付</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tape.delivered ? (
                        <button
                          onClick={() => handleMarkUndelivered(tape)}
                          className="btn-secondary btn-sm"
                        >
                          撤销交付
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMarkDelivered(tape)}
                          disabled={tape.status !== 'completed'}
                          className="btn-primary btn-sm flex items-center gap-1 disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          标记交付
                        </button>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-50 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs">片段数量</p>
                      <p className="font-medium text-gray-700">{tape.segments.length} 个</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">损坏记录</p>
                      <p className="font-medium text-gray-700">{tape.damageSpots.length} 处</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">创建时间</p>
                      <p className="font-medium text-gray-700">{formatDateShort(tape.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">交付时间</p>
                      <p className="font-medium text-gray-700">
                        {tape.deliveredAt ? formatDateShort(tape.deliveredAt) : '-'}
                      </p>
                    </div>
                  </div>

                  {tape.deliveryNotes && (
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <p className="text-xs text-gray-400 mb-1">交付说明</p>
                      <p className="text-sm text-gray-600">{tape.deliveryNotes}</p>
                    </div>
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
