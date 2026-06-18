import { X, Printer } from 'lucide-react';
import { useMemo } from 'react';
import type { Student } from '@/types';
import { getBusNumbers, getStudentsByBus } from '@/utils/export';
import { hasHealthRisk } from '@/utils/validators';

interface PrintViewProps {
  mode: 'bus-list' | 'health-note';
  students: Student[];
  onClose: () => void;
}

export function PrintView({ mode, students, onClose }: PrintViewProps) {
  const busNumbers = useMemo(() => getBusNumbers(students), [students]);
  const hasBusAssignment = busNumbers.length > 0;
  const allStudents = students.filter((s) => s.busNumber);

  const handlePrint = () => {
    window.print();
  };

  const title = mode === 'bus-list' ? '分车名单' : '健康备注清单';

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="no-print flex items-center justify-between px-6 py-3 border-b bg-gray-50">
        <h2 className="font-semibold text-gray-800">打印预览 - {title}</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Printer size={16} />
            打印
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-100 p-8 print:p-0 print:bg-white">
        <div className="max-w-3xl mx-auto bg-white print:max-w-none print:mx-0 shadow-lg print:shadow-none p-8 print:p-6">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">{title}</h1>
          <p className="text-center text-gray-500 text-sm mb-6">
            打印日期：{new Date().toLocaleDateString('zh-CN')}
          </p>

          {mode === 'bus-list' && (
            <>
              {hasBusAssignment ? (
                <div className="space-y-6">
                  {busNumbers.map((busNum) => {
                    const busStudents = getStudentsByBus(students, busNum);
                    const riskStudents = busStudents.filter((s) =>
                      hasHealthRisk(s.healthNote, s.allergyNote)
                    );
                    return (
                      <div key={busNum} className="break-inside-avoid">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-1 border-b-2 border-slate-300">
                          {busNum} （共 {busStudents.length} 人）
                          {riskStudents.length > 0 && (
                            <span className="ml-2 text-sm font-normal text-red-600">
                              特殊学生 {riskStudents.length} 人
                            </span>
                          )}
                        </h3>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-300">
                              <th className="text-left py-2 px-2 font-medium text-gray-700 w-12">序号</th>
                              <th className="text-left py-2 px-2 font-medium text-gray-700">姓名</th>
                              <th className="text-left py-2 px-2 font-medium text-gray-700">班级</th>
                              <th className="text-left py-2 px-2 font-medium text-gray-700 w-16">座位</th>
                              <th className="text-left py-2 px-2 font-medium text-gray-700">特殊标记</th>
                              <th className="text-left py-2 px-2 font-medium text-gray-700 w-20">签到</th>
                            </tr>
                          </thead>
                          <tbody>
                            {busStudents.map((student, idx) => {
                              const isRisk = hasHealthRisk(student.healthNote, student.allergyNote);
                              return (
                                <tr
                                  key={student.id}
                                  className={`border-b border-gray-100 ${isRisk ? 'bg-red-50' : ''}`}
                                >
                                  <td className="py-2 px-2 text-gray-600">{idx + 1}</td>
                                  <td className={`py-2 px-2 ${isRisk ? 'font-semibold text-red-700' : 'text-gray-900'}`}>
                                    {student.name}
                                    {isRisk && <span className="ml-1 text-xs">※</span>}
                                  </td>
                                  <td className="py-2 px-2 text-gray-600">{student.className}</td>
                                  <td className="py-2 px-2 text-gray-600">{student.seatNumber || '-'}</td>
                                  <td className="py-2 px-2">
                                    {isRisk ? (
                                      <span className="text-xs text-red-600 font-medium">需重点关注</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2"></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <p>暂未分配车辆信息</p>
                  <p className="text-sm mt-2">请先为学生分配车号后再打印</p>
                </div>
              )}

              {allStudents.length > 0 && (
                <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
                  <p>总计：{allStudents.length} 名学生，{busNumbers.length} 辆车</p>
                </div>
              )}
            </>
          )}

          {mode === 'health-note' && (
            <>
              {hasBusAssignment ? (
                <div className="space-y-6">
                  {busNumbers.map((busNum) => {
                    const busStudents = getStudentsByBus(students, busNum);
                    const studentsWithNotes = busStudents.filter(
                      (s) => s.healthNote || s.allergyNote
                    );
                    const riskStudents = busStudents.filter((s) =>
                      hasHealthRisk(s.healthNote, s.allergyNote)
                    );
                    return (
                      <div key={busNum} className="break-inside-avoid">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-1 border-b-2 border-slate-300">
                          {busNum} - 健康备注
                          {riskStudents.length > 0 && (
                            <span className="ml-2 text-sm font-normal text-red-600">
                              重点关注 {riskStudents.length} 人
                            </span>
                          )}
                        </h3>
                        {studentsWithNotes.length === 0 ? (
                          <p className="text-gray-400 text-sm py-3">本车学生无特殊健康备注</p>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-300">
                                <th className="text-left py-2 px-2 font-medium text-gray-700 w-20">姓名</th>
                                <th className="text-left py-2 px-2 font-medium text-gray-700 w-24">班级</th>
                                <th className="text-left py-2 px-2 font-medium text-gray-700">健康备注</th>
                                <th className="text-left py-2 px-2 font-medium text-gray-700">过敏信息</th>
                                <th className="text-left py-2 px-2 font-medium text-gray-700 w-16">座位</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentsWithNotes.map((student) => {
                                const isRisk = hasHealthRisk(student.healthNote, student.allergyNote);
                                return (
                                  <tr
                                    key={student.id}
                                    className={`border-b border-gray-100 ${isRisk ? 'bg-red-50' : ''}`}
                                  >
                                    <td className={`py-2 px-2 ${isRisk ? 'font-semibold text-red-700' : 'text-gray-900'}`}>
                                      {student.name}
                                      {isRisk && <span className="ml-1 text-xs">★</span>}
                                    </td>
                                    <td className="py-2 px-2 text-gray-600">{student.className}</td>
                                    <td className="py-2 px-2 text-gray-700">
                                      {student.healthNote || <span className="text-gray-400">-</span>}
                                    </td>
                                    <td className="py-2 px-2 text-gray-700">
                                      {student.allergyNote || <span className="text-gray-400">-</span>}
                                    </td>
                                    <td className="py-2 px-2 text-gray-600">{student.seatNumber || '-'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <p>暂未分配车辆信息</p>
                  <p className="text-sm mt-2">请先为学生分配车号后再打印</p>
                </div>
              )}

              <div className="mt-8 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">重点关注学生汇总</h4>
                {students.filter((s) => hasHealthRisk(s.healthNote, s.allergyNote)).length === 0 ? (
                  <p className="text-sm text-gray-400">暂无需要重点关注的学生</p>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <ul className="text-sm space-y-1">
                      {students
                        .filter((s) => hasHealthRisk(s.healthNote, s.allergyNote))
                        .map((student) => (
                          <li key={student.id} className="text-red-800">
                            <span className="font-medium">{student.name}</span>
                            <span className="text-red-600 ml-2">
                              {student.busNumber || '未分车'}
                            </span>
                            <span className="text-red-700 ml-2 text-xs">
                              - {student.healthNote || student.allergyNote}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
