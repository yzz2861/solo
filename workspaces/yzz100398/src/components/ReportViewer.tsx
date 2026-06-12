import { useState } from 'react'
import { Printer, CheckCircle, XCircle, Calculator, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMg } from '@/utils/units'
import type { Certificate, Customer } from '@/types'

interface ReportViewerProps {
  certificate: Certificate
  customer?: Customer
}

type TabType = 'customer' | 'internal'

const CONTRIBUTION_DISTRIBUTION: Record<string, { distribution: string; k: string }> = {
  repeatability: { distribution: '正态 (A类)', k: '1' },
  standard: { distribution: '矩形 (B类)', k: '√3' },
  resolution: { distribution: '矩形 (B类)', k: '√12' },
  temperature: { distribution: '矩形 (B类)', k: '√3' },
  humidity: { distribution: '矩形 (B类)', k: '√3' },
}

export default function ReportViewer({ certificate, customer }: ReportViewerProps) {
  const [tab, setTab] = useState<TabType>('customer')
  const handlePrint = () => window.print()

  const results = certificate.results
  const customerName = customer?.name || ''
  const customerContact = customer?.contact || ''
  const customerPhone = customer?.phone || ''

  const conclusionLabel =
    results?.isPass === true ? '合格' : results?.isPass === false ? '不合格' : '待计算'
  const ConclusionIcon =
    results?.isPass === true
      ? CheckCircle
      : results?.isPass === false
        ? XCircle
        : Calculator
  const conclusionClass =
    results?.isPass === true
      ? 'text-green-600'
      : results?.isPass === false
        ? 'text-red-600'
        : 'text-gray-500'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-white border border-gray-200 p-1">
            <button
              onClick={() => setTab('customer')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                tab === 'customer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              客户证书摘要
            </button>
            <button
              onClick={() => setTab('internal')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                tab === 'internal'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              内部技术报告
            </button>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Printer className="w-4 h-4" />
          打印
        </button>
      </div>

      <div className={cn('p-8', tab === 'internal' && 'bg-gray-50')}>
        {tab === 'customer' ? (
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-center text-gray-900 tracking-wider">
              校准证书摘要
            </h1>
            <div className="mt-2 text-center text-sm text-gray-500">
              证书编号：<span className="font-mono">{certificate.certNumber}</span>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-3 text-sm border-t border-b border-gray-200 py-5">
              <div>
                <span className="text-gray-500">客户名称：</span>
                <span className="text-gray-800">{customerName}</span>
              </div>
              <div>
                <span className="text-gray-500">联系人：</span>
                <span className="text-gray-800">
                  {customerContact} ({customerPhone})
                </span>
              </div>
              <div>
                <span className="text-gray-500">砝码编号：</span>
                <span className="text-gray-800 font-mono">{certificate.weightSerial}</span>
              </div>
              <div>
                <span className="text-gray-500">校准日期：</span>
                <span className="text-gray-800 font-mono">{certificate.calibrationDate}</span>
              </div>
            </div>

            {results && (
              <table className="w-full mt-6 text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-800">
                    <th className="py-2 px-3 text-left">标称值</th>
                    <th className="py-2 px-3 text-right">修正值</th>
                    <th className="py-2 px-3 text-right">U(k={results.k_factor})</th>
                    <th className="py-2 px-3 text-right">MPE</th>
                    <th className="py-2 px-3 text-center">结论</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 px-3 font-mono">
                      {certificate.nominalValue} {certificate.nominalUnit}
                    </td>
                    <td className="py-3 px-3 font-mono text-right tabular-nums">
                      {formatMg(results.correction_mg).value}{' '}
                      {formatMg(results.correction_mg).unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-right tabular-nums">
                      {formatMg(results.U_expanded_mg).value}{' '}
                      {formatMg(results.U_expanded_mg).unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-right tabular-nums">
                      ±{formatMg(results.tolerance_mg).value}{' '}
                      {formatMg(results.tolerance_mg).unit}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-semibold',
                          conclusionClass,
                        )}
                      >
                        <ConclusionIcon className="w-4 h-4" />
                        {conclusionLabel}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            <div className="mt-16 grid grid-cols-3 gap-8 text-sm">
              <div>
                <div className="text-gray-500">计量员</div>
                <div className="mt-12 border-b border-gray-400 pt-1 text-center text-gray-800 font-medium">
                  &nbsp;
                </div>
              </div>
              <div>
                <div className="text-gray-500">核验员</div>
                <div className="mt-12 border-b border-gray-400 pt-1 text-center text-gray-800 font-medium">
                  &nbsp;
                </div>
              </div>
              <div>
                <div className="text-gray-500">校准日期</div>
                <div className="mt-12 border-b border-gray-400 pt-1 text-center text-gray-800 font-medium font-mono">
                  {certificate.calibrationDate}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6 font-mono text-sm">
            <h2 className="text-xl font-bold text-gray-900 not-italic">§1 数学模型</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center text-lg">
              C = x̄ − m<sub>s</sub> + ΔC<sub>s</sub>
            </div>

            {results && results.contributions.length > 0 && (
              <>
                <h2 className="text-xl font-bold text-gray-900">§2 各分量表</h2>
                <table className="w-full bg-white rounded-lg border border-gray-200 overflow-hidden text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">来源</th>
                      <th className="px-3 py-2 text-center">分布</th>
                      <th className="px-3 py-2 text-center">包含因子</th>
                      <th className="px-3 py-2 text-right">u<sub>i</sub> (mg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.contributions.map((c, i) => {
                      const distInfo = CONTRIBUTION_DISTRIBUTION[c.key] || { distribution: '-', k: '-' }
                      return (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2">{c.source}</td>
                          <td className="px-3 py-2 text-center">{distInfo.distribution}</td>
                          <td className="px-3 py-2 text-center">{distInfo.k}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatMg(c.u_mg).value}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}

            {results && (
              <>
                <h2 className="text-xl font-bold text-gray-900">§3 合成公式</h2>
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                  <div>
                    u<sub>c</sub> = √(Σu<sub>i</sub>²) ={' '}
                    <span className="font-semibold">
                      {formatMg(results.u_combined_mg).value}{' '}
                      {formatMg(results.u_combined_mg).unit}
                    </span>
                  </div>
                  <div>
                    U = k · u<sub>c</sub> = {results.k_factor} ×{' '}
                    {formatMg(results.u_combined_mg).value} ={' '}
                    <span className="font-semibold">
                      {formatMg(results.U_expanded_mg).value}{' '}
                      {formatMg(results.U_expanded_mg).unit}
                    </span>{' '}
                    (k={results.k_factor}, p≈95%)
                  </div>
                </div>
              </>
            )}

            {certificate.alerts.length > 0 && (
              <>
                <h2 className="text-xl font-bold text-gray-900">§4 边界警告</h2>
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                  {certificate.alerts.map((alert, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-2 text-xs',
                        alert.level === 'danger' && 'text-red-700',
                        alert.level === 'warning' && 'text-amber-700',
                        alert.level === 'info' && 'text-blue-700',
                      )}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        [{alert.code}] {alert.msg} ({alert.field})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h2 className="text-xl font-bold text-gray-900">
              §{certificate.alerts.length > 0 ? '5' : '4'} 原始测量数据 (n=
              {certificate.measurements.length})
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="grid grid-cols-5 gap-3 font-mono">
                {certificate.measurements.map((m, i) => (
                  <div key={i} className="text-center py-1 border-b border-dashed border-gray-200">
                    <span className="text-gray-400 text-xs mr-1">{i + 1}.</span>
                    {m.value} {m.unit}
                  </div>
                ))}
              </div>
              {results && (
                <div className="mt-3 pt-3 border-t border-gray-200 flex gap-6 text-xs">
                  <span>
                    均值 x̄ ={' '}
                    <span className="font-semibold">
                      {formatMg(results.mean_mg).value} {formatMg(results.mean_mg).unit}
                    </span>
                  </span>
                  <span>
                    标准差 s ={' '}
                    <span className="font-semibold">
                      {formatMg(results.std_mg).value} {formatMg(results.std_mg).unit}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
