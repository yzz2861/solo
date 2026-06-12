import { useParams, Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { useStore } from '@/store'
import ReportViewer from '@/components/ReportViewer'

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const { certificates, customers } = useStore()

  const certificate = certificates.find((c) => c.id === id)

  if (!certificate) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <FileQuestion className="w-20 h-20 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-600">证书不存在</h2>
        <p className="mt-2 text-gray-400">请检查链接是否正确，或返回档案中心查找</p>
        <Link
          to="/archive"
          className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          返回档案中心
        </Link>
      </div>
    )
  }

  const customer = customers.find((c) => c.id === certificate.customerId)

  return <ReportViewer certificate={certificate} customer={customer} />
}
