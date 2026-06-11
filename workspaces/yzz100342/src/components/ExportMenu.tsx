import { useState, useRef, useEffect } from 'react';
import { Download, FileText, ScrollText, ChevronDown } from 'lucide-react';
import { useSolutionStore } from '@/store/useSolutionStore';
import { generateServiceGuide, generateWarehouseCSV, downloadFile } from '@/utils/export';

export default function ExportMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const solution = useSolutionStore((s) => s.getActive());

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!solution) return null;

  const exportService = () => {
    const content = generateServiceGuide(solution);
    const filename = `${solution.name}-客服解释清单.txt`;
    downloadFile(content, filename, 'text/plain;charset=utf-8');
    setOpen(false);
  };

  const exportWarehouse = () => {
    const content = generateWarehouseCSV(solution);
    const filename = `${solution.name}-仓库备货清单.csv`;
    downloadFile(content, filename, 'text/csv;charset=utf-8');
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary flex items-center gap-1.5"
      >
        <Download className="w-4 h-4" />
        导出
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-glow border border-primary-100 py-1.5 z-50 animate-fade-in">
          <button
            onClick={exportService}
            className="w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-gray-700 hover:bg-primary-50 transition-colors"
          >
            <FileText className="w-4 h-4 text-primary-500" />
            客服解释清单（.txt）
          </button>
          <button
            onClick={exportWarehouse}
            className="w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-gray-700 hover:bg-primary-50 transition-colors"
          >
            <ScrollText className="w-4 h-4 text-accent-500" />
            仓库备货清单（.csv）
          </button>
        </div>
      )}
    </div>
  );
}
