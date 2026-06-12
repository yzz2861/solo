import { useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PrintPreview } from '@/components/print/PrintPreview';
import { useAppStore } from '@/store/useAppStore';

export const PrintPage = () => {
  const { refreshAlerts } = useAppStore();

  useEffect(() => {
    refreshAlerts();
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [refreshAlerts]);

  return (
    <div className="min-h-screen bg-cream-100">
      <div className="no-print sticky top-0 z-30 px-5 h-14 bg-white/90 backdrop-blur border-b border-cream-200 flex items-center justify-between">
        <Link to="/" className="btn btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          返回工作台
        </Link>
        <div className="text-sm font-serif font-semibold text-coffee-700">早班准备单预览</div>
        <button onClick={() => window.print()} className="btn btn-primary">
          <Printer className="w-4 h-4" />
          打印
        </button>
      </div>
      <PrintPreview standalone />
    </div>
  );
};
