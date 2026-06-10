import { Coffee } from 'lucide-react';
import RecordCard from './RecordCard';
import { useFilteredRecords, useRecordsStore } from '@/store/useRecordsStore';

const RecordList: React.FC = () => {
  const filteredRecords = useFilteredRecords();
  const { records } = useRecordsStore();

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-coffee-100 flex items-center justify-center mb-4">
          <Coffee className="w-10 h-10 text-coffee-400" />
        </div>
        <h3 className="text-lg font-serif font-semibold text-coffee-800 mb-2">
          还没有杯测记录
        </h3>
        <p className="text-sm text-coffee-500 max-w-xs">
          点击右上角的"新增记录"按钮，开始记录你的第一份杯测笔记
        </p>
      </div>
    );
  }

  if (filteredRecords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-coffee-100 flex items-center justify-center mb-4">
          <Coffee className="w-10 h-10 text-coffee-400" />
        </div>
        <h3 className="text-lg font-serif font-semibold text-coffee-800 mb-2">
          没有匹配的记录
        </h3>
        <p className="text-sm text-coffee-500 max-w-xs">
          试试调整筛选条件，或重置筛选查看全部记录
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {filteredRecords.map((record, index) => (
        <RecordCard key={record.id} record={record} index={index} />
      ))}
    </div>
  );
};

export default RecordList;
