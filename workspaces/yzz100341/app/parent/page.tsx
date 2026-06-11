'use client';

import { useState } from 'react';
import { Plus, Loader2, Clock, ArrowRight, History } from 'lucide-react';
import { useStudents, useChanges, type Student } from '@/hooks/useApi';
import { StudentCard } from '@/components/StudentCard';
import { ChangeFormModal } from '@/components/ChangeFormModal';
import { ChangeStatusBadge } from '@/components/ChangeStatusBadge';
import { formatDateTime, cn } from '@/lib/utils';

export default function ParentHomePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: changes, isLoading: changesLoading, mutate: mutateChanges } = useChanges();

  function handleInitiateChange(student: Student) {
    setSelectedStudent(student);
    setModalOpen(true);
  }

  function handleSuccess() {
    mutateChanges();
  }

  function getStudentChanges(studentId: string) {
    return (changes || []).filter((c) => c.studentId === studentId).slice(0, 5);
  }

  if (studentsLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
          <span className="ml-3 text-slate-500">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-navy">我的孩子</h1>
        <p className="text-slate-500 mt-1">管理您授权的孩子信息并发起上车点变更</p>
      </div>

      {!students || students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500">暂无授权的孩子信息</p>
        </div>
      ) : (
        <div className="space-y-6">
          {students.map((student, idx) => {
            const studentChanges = getStudentChanges(student.id);
            return (
              <div
                key={student.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow duration-300">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <StudentCard student={student} className="!shadow-none !border-0 !p-0" />
                      </div>
                      <button
                        onClick={() => handleInitiateChange(student)}
                        className={cn(
                          'shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-white',
                          'bg-gradient-to-r from-brand-orange to-brand-orange-dark',
                          'hover:from-brand-orange-dark hover:to-[#D15A25]',
                          'shadow-md shadow-brand-orange/25 hover:shadow-brand-orange/40',
                          'transform hover:-translate-y-0.5 active:translate-y-0',
                          'transition-all duration-200'
                        )}
                      >
                        <Plus className="w-4 h-4" />
                        发起变更
                      </button>
                    </div>
                  </div>

                  {studentChanges.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <h4 className="text-sm font-medium text-slate-600">最近变更记录</h4>
                      </div>
                      <div className="relative">
                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />
                        <ul className="space-y-3">
                          {studentChanges.map((change) => (
                            <li key={change.id} className="relative pl-7">
                              <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-brand-orange flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                              </div>
                              <div className="bg-white rounded-xl border border-slate-200 p-3 hover:border-brand-orange/30 transition-colors">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="text-xs text-slate-500">
                                    {formatDateTime(change.createdAt)}
                                  </span>
                                  <ChangeStatusBadge status={change.status} />
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-slate-600">
                                    {change.originalRoute.name} · {change.originalStop.name}
                                  </span>
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="font-medium text-brand-navy">
                                    {change.newRoute.name} · {change.newStop.name}
                                  </span>
                                </div>
                                {change.date && (
                                  <p className="text-xs text-slate-500 mt-1.5">
                                    出行日期：{change.date}
                                  </p>
                                )}
                                {change.reason && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    原因：{change.reason}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ChangeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        student={selectedStudent}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
