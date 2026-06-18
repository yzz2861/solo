import { StudentCard } from './StudentCard';
import type { Student } from '@/types';

interface StatusColumnProps {
  title: string;
  status: 'incomplete' | 'pending' | 'completed';
  students: Student[];
  count: number;
  onEdit: (id: string) => void;
}

const statusConfig = {
  incomplete: {
    color: 'red',
    bgHeader: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-500',
  },
  pending: {
    color: 'amber',
    bgHeader: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  completed: {
    color: 'green',
    bgHeader: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    dotColor: 'bg-green-500',
  },
};

export function StatusColumn({ title, status, students, count, onEdit }: StatusColumnProps) {
  const config = statusConfig[status];

  return (
    <div className={`flex-1 min-w-0 ${config.borderColor} border rounded-lg overflow-hidden flex flex-col bg-gray-50`}>
      <div className={`${config.bgHeader} px-4 py-3 border-b ${config.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
            <h2 className={`font-semibold ${config.textColor}`}>{title}</h2>
          </div>
          <span className={`text-sm font-medium ${config.textColor} bg-white/80 px-2 py-0.5 rounded-full`}>
            {count} 人
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-64">
        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-sm">暂无学生</p>
          </div>
        ) : (
          students.map((student) => (
            <StudentCard key={student.id} student={student} onEdit={onEdit} />
          ))
        )}
      </div>
    </div>
  );
}
