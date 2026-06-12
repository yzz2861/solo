import { useNavigate } from 'react-router-dom'
import { Search, Archive } from 'lucide-react'
import { useStore } from '@/store'
import CustomerCard from '@/components/CustomerCard'

export default function ArchivePage() {
  const navigate = useNavigate()
  const { customers, certificates, searchKeyword, setSearchKeyword, loadCertificateToForm } = useStore()

  const keyword = searchKeyword.toLowerCase().trim()

  const filteredCerts = certificates.filter((cert) => {
    if (!keyword) return true
    const customer = customers.find((c) => c.id === cert.customerId)
    return (
      customer?.name.toLowerCase().includes(keyword) ||
      cert.certNumber.toLowerCase().includes(keyword) ||
      cert.weightSerial.toLowerCase().includes(keyword)
    )
  })

  const filteredCustomers = customers.filter((c) => {
    if (!keyword) return true
    return (
      c.name.toLowerCase().includes(keyword) ||
      certificates.some(
        (cert) =>
          cert.customerId === c.id &&
          (cert.certNumber.toLowerCase().includes(keyword) ||
            cert.weightSerial.toLowerCase().includes(keyword)),
      )
    )
  })

  const customerCertsMap = new Map<string, typeof certificates>()
  for (const cert of filteredCerts) {
    const existing = customerCertsMap.get(cert.customerId) || []
    existing.push(cert)
    customerCertsMap.set(cert.customerId, existing)
  }

  const handleRecal = (certId: string) => {
    loadCertificateToForm(certId)
    navigate('/')
  }

  const isEmpty = customers.length === 0 && certificates.length === 0

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">档案中心</h2>
          <div className="w-full sm:w-96 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索客户名称、证书编号、砝码编号..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="card">
          <div className="py-16 flex flex-col items-center text-center">
            <Archive className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-500">暂无客户/证书档案</p>
          </div>
        </div>
      ) : filteredCustomers.length === 0 && keyword ? (
        <div className="card">
          <div className="py-12 flex flex-col items-center text-center">
            <Search className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">未找到匹配 "{searchKeyword}" 的记录</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const customerCerts = customerCertsMap.get(customer.id) || []
            const sortedCerts = [...customerCerts].sort(
              (a, b) => new Date(b.calibrationDate).getTime() - new Date(a.calibrationDate).getTime(),
            )
            const recentCerts = sortedCerts.slice(0, 3)
            const nextRecalDate = sortedCerts.length > 0 ? sortedCerts[0].nextRecalDate : ''

            return (
              <CustomerCard
                key={customer.id}
                customer={customer}
                recentCerts={recentCerts}
                nextRecalDate={nextRecalDate}
                onRecal={handleRecal}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
