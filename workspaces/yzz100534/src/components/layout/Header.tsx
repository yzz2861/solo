import { FileText, User, HelpCircle, Settings } from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const Header = () => {
  const { currentCase } = useCaseStore();

  const statusLabels: Record<string, { text: string; className: string }> = {
    draft: { text: '草稿', className: 'bg-gray-100 text-gray-600' },
    reviewing: { text: '审核中', className: 'bg-yellow-100 text-yellow-700' },
    confirmed: { text: '已确认', className: 'bg-green-100 text-green-700' },
    exported: { text: '已导出', className: 'bg-blue-100 text-blue-700' },
  };

  const status = statusLabels[currentCase.status];

  return (
    <header className="h-16 bg-primary-900 text-white flex items-center justify-between px-6 shadow-md">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6" />
          <h1 className="text-lg font-serif font-semibold tracking-wide">
            客服证据附件清单
          </h1>
        </div>
        <div className="h-6 w-px bg-primary-600" />
        <div className="flex items-center gap-3">
          <span className="text-sm text-primary-200">
            案件编号：{currentCase.caseNumber}
          </span>
          <span className={`tag ${status.className}`}>
            {status.text}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-right mr-4">
          <div className="text-sm font-medium">{currentCase.title}</div>
          <div className="text-xs text-primary-300">
            客户：{currentCase.customerName} · 更新于 {format(new Date(currentCase.updatedAt), 'MM-dd HH:mm', { locale: zhCN })}
          </div>
        </div>
        <button className="p-2 hover:bg-primary-800 rounded transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-primary-800 rounded transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 bg-primary-700 rounded-full flex items-center justify-center ml-2">
          <User className="w-5 h-5" />
        </div>
      </div>
    </header>
  );
};

export default Header;
