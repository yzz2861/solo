import { Coffee, Plus, Printer, Download, FileText } from 'lucide-react';
import Button from '@/components/common/Button';
import { useRecordsStore, useFilteredRecords } from '@/store/useRecordsStore';
import { downloadCSV, downloadSummary } from '@/utils/export';

const Header: React.FC = () => {
  const { openForm, records } = useRecordsStore();
  const filteredRecords = useFilteredRecords();

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    downloadCSV(filteredRecords);
  };

  const handleExportSummary = () => {
    downloadSummary(filteredRecords);
  };

  return (
    <header className="bg-coffee-900 text-white">
      <div className="container">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-coffee-800 flex items-center justify-center">
              <Coffee className="w-6 h-6 text-caramel-300" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold">咖啡豆杯测记录</h1>
              <p className="text-xs text-coffee-400">
                共 {records.length} 条记录 · {filteredRecords.length} 条筛选结果
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="md"
              onClick={handlePrint}
              className="text-coffee-300 hover:text-white hover:bg-coffee-800"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">打印</span>
            </Button>

            <Button
              variant="ghost"
              size="md"
              onClick={handleExportSummary}
              className="text-coffee-300 hover:text-white hover:bg-coffee-800"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">摘要</span>
            </Button>

            <Button
              variant="ghost"
              size="md"
              onClick={handleExportCSV}
              className="text-coffee-300 hover:text-white hover:bg-coffee-800"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">导出</span>
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={() => openForm()}
              className="bg-caramel-600 hover:bg-caramel-700 text-white"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新增记录</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
