import { Building2, User, Phone, FileText, History, RefreshCcw, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Customer, Certificate } from '@/types'

interface CustomerCardProps {
  customer: Customer
  recentCerts: Certificate[]
  nextRecalDate: string
  onRecal: (certId: string) => void
  onViewHistory?: () => void
}

function calcDaysUntil(target: string): number {
  const targetDate = new Date(target)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)
  const diff = targetDate.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function CustomerCard({
  customer,
  recentCerts,
  nextRecalDate,
  onRecal,
  onViewHistory,
}: CustomerCardProps) {
  const daysUntil = nextRecalDate ? calcDaysUntil(nextRecalDate) : NaN
  const isUrgent = !isNaN(daysUntil) && daysUntil >= 0 && daysUntil < 30
  const isOverdue = !isNaN(daysUntil) && daysUntil < 0
  const latestCertId = recentCerts.length > 0 ? recentCerts[0].id : ''

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-900 truncate">{customer.name}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  {customer.contact}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {customer.phone}
                </span>
              </div>
            </div>
          </div>

          {nextRecalDate && (
            <div
              className={cn(
                'flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold',
                isOverdue && 'bg-red-100 text-red-700 border border-red-200',
                isUrgent && 'bg-red-50 text-red-600 border border-red-300',
                !isOverdue && !isUrgent && 'bg-green-50 text-green-700 border border-green-200',
              )}
            >
              <CalendarClock className={cn('w-4 h-4')} />
              {isOverdue
                ? `已超期 ${Math.abs(daysUntil)} 天`
                : `距复校 ${daysUntil} 天`}
            </div>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {recentCerts.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <FileText className="w-4 h-4 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-700">最近证书</h4>
            </div>
            <div className="space-y-2">
              {recentCerts.map((cert, idx) => (
                <div
                  key={cert.id}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-sm',
                    idx === 0 ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 hover:bg-gray-100',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-gray-800 font-medium">{cert.certNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{cert.calibrationDate}</p>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-700">
                      {cert.nominalValue} {cert.nominalUnit} {cert.weightClass}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => latestCertId && onRecal(latestCertId)}
            disabled={!latestCertId}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
              'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm',
              !latestCertId && 'opacity-50 cursor-not-allowed',
            )}
          >
            <RefreshCcw className="w-4 h-4" />
            一键复校
          </button>
          <button
            onClick={onViewHistory}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
              'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400',
            )}
          >
            <History className="w-4 h-4" />
            查看历史
          </button>
        </div>
      </div>
    </div>
  )
}
