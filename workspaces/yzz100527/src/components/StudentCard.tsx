import { useState, useMemo } from 'react';
import { Edit2, Trash2, ChevronDown, ChevronUp, Bus, FileText } from 'lucide-react';
import type { Student } from '@/types';
import { useStudentStore } from '@/store/useStudentStore';
import { generateAlerts, getMissingMaterials, isMaterialComplete, hasHealthRisk } from '@/utils/validators';
import { AlertBadge } from './AlertBadge';

interface StudentCardProps {
  student: Student;
  onEdit: (id: string) => void;
}

export function StudentCard({ student, onEdit }: StudentCardProps) {
  const { students, deleteStudent } = useStudentStore();
  const [expanded, setExpanded] = useState(false);

  const alerts = useMemo(() => generateAlerts(student, students), [student, students]);
  const missingMaterials = useMemo(() => getMissingMaterials(student), [student]);
  const hasHealthNote = student.healthNote || student.allergyNote;
  const isHealthRisk = hasHealthRisk(student.healthNote, student.allergyNote);

  const handleDelete = () => {
    if (window.confirm(`确定要删除学生 \"${student.name}\" 吗？`)) {
      deleteStudent(student.id);
    }
  };

  const idTypeLabel = student.idType === 'idcard' ? '身份证' : '户口本';

  const healthNoteTitle = isHealthRisk ? '健康备注(需关注)' : '健康备注';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">{student.name}</h3>
              {isHealthRisk && (
                <span
                  className="inline-flex items-center justify-center w-5 h-5 bg-rose-100 text-rose-600 rounded-full text-xs flex-shrink-0"
                  title="需重点关注"
                >
                  !
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{student.className || '未填班级'}</p>
          </div>
          {alerts.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex-shrink-0 animate-pulse">
              {alerts.length}
            </span>
          )}
        </div>

        {alerts.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {alerts.slice(0, 2).map((alert, idx) => (
              <AlertBadge key={idx} type={alert.type} message={alert.message} />
            ))}
            {alerts.length > 2 && (
              <p className="text-xs text-gray-500">还有 {alerts.length - 2} 项提醒</p>
            )}
          </div>
        )}

        {!isMaterialComplete(student) && missingMaterials.length > 0 && (
          <div className="mt-3 bg-red-50 rounded-md px-2.5 py-2">
            <p className="text-xs font-medium text-red-700 mb-1">缺少材料：</p>
            <p className="text-xs text-red-600">{missingMaterials.join('、')}</p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            {expanded ? (
              <>
                收起详情 <ChevronUp size={14} />
              </>
            ) : (
              <>
                查看详情 <ChevronDown size={14} />
              </>
            )}
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(student.id)}
              className="p-1.5 text-gray-400 hover:text-slate-600 hover:bg-gray-100 rounded transition-colors"
              title="编辑"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <FileText size={14} className="text-gray-400" />
            <span className="text-gray-500">证件：</span>
            <span>{idTypeLabel} {student.idNumber || '未填写'}</span>
          </div>
          {student.idExpiryDate && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-gray-500 w-16">有效期：</span>
              <span>{student.idExpiryDate}</span>
            </div>
          )}
          {student.busNumber && (
            <div className="flex items-center gap-2 text-gray-600">
              <Bus size={14} className="text-gray-400" />
              <span className="text-gray-500">分车：</span>
              <span>
                {student.busNumber}
                {student.seatNumber && ` · ${student.seatNumber}座`}
              </span>
            </div>
          )}
          {hasHealthNote && (
            <div className={`mt-2 p-2 rounded-md ${isHealthRisk ? 'bg-rose-50' : 'bg-gray-100'}`}>
              <p className={`text-xs font-medium mb-1 ${isHealthRisk ? 'text-rose-700' : 'text-gray-600'}`}>
                {healthNoteTitle}
              </p>
              {student.healthNote && (
                <p className="text-xs text-gray-600">{student.healthNote}</p>
              )}
              {student.allergyNote && (
                <p className="text-xs text-gray-600 mt-1">过敏：{student.allergyNote}</p>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 pt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                student.guardianSigned ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {student.guardianSigned ? '✓ 已授权' : '✗ 未授权'}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                student.insuranceProvided ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {student.insuranceProvided ? '✓ 有保险' : '✗ 无保险'}
            </span>
          </div>
          {student.notes && (
            <p className="text-xs text-gray-500 pt-2 border-t border-gray-200 mt-2">
              备注：{student.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
