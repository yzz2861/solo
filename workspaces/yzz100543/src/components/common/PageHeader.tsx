import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backPath?: string
  rightContent?: React.ReactNode
}

export default function PageHeader({ title, subtitle, backPath, rightContent }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-[#0F2A44] border-b border-[#1a3a54]">
      <div className="flex items-center gap-4">
        {backPath && (
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1a3a54] hover:bg-[#2a4a64] text-[#8899aa] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: '"Noto Serif SC", serif' }}>{title}</h1>
          {subtitle && <p className="text-sm text-[#8899aa]">{subtitle}</p>}
        </div>
      </div>
      {rightContent && <div>{rightContent}</div>}
    </div>
  )
}
