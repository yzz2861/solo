import { Warning, WARNING_TYPE_COLORS } from '../types'

interface Props {
  warnings: Warning[]
  onClose: () => void
}

export default function WarningsPanel({ warnings, onClose }: Props) {
  if (warnings.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <h3 className="font-bold text-green-800">一切正常</h3>
              <p className="text-green-600 text-sm">当前没有需要处理的提醒</p>
            </div>
          </div>
          <button onClick={onClose} className="text-green-600 hover:text-green-800">
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-vintage-200 overflow-hidden">
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold text-lg">智能提醒</h3>
            <p className="text-yellow-100 text-sm">共 {warnings.length} 条需要关注</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white hover:text-yellow-200 text-xl">
          ✕
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto scrollbar-thin">
        {warnings.map((warning, index) => (
          <div
            key={index}
            className={`p-4 border-l-4 ${WARNING_TYPE_COLORS[warning.warning_type] || 'bg-gray-50 border-gray-300'} flex items-start gap-3 border-b last:border-b-0`}
          >
            <span className="text-xl">
              {warning.warning_type.includes('urgent') || warning.warning_type.includes('missing') || warning.warning_type === 'overdue'
                ? '🚨'
                : warning.warning_type === 'sensitive_content'
                ? '🔴'
                : warning.warning_type === 'delivery_reminder'
                ? '⏰'
                : '⚠️'}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{warning.customer_name}</span>
                <span className="text-xs px-2 py-0.5 bg-white bg-opacity-50 rounded">
                  {warning.order_status}
                </span>
              </div>
              <p className="text-sm">{warning.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
