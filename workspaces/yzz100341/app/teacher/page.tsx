'use client';

import { useState } from 'react';
import { Plus, Loader2, Users, ClipboardList, Bus, ArrowRight } from 'lucide-react';
import { useStudents, useChanges, type Student } from '@/hooks/useApi';
import { ChangeFormModal } from '@/components/ChangeFormModal';
import { ChangeStatusBadge } from '@/components/ChangeStatusBadge';
import { formatDateTime, cn } from '@/lib/utils';

export default function TeacherHomePage() {
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

  if (studentsLoading || changesLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
          <span className="ml-3 text-slate-500">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-orange/10 flex items-center justify-center">
          <Users className="w-6 h-6 text-brand-orange" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">班级学生</h1>
          <p className="text-slate-500 mt-0.5">
            共 {students?.length || 0} 名学生
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  学生姓名
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  学号
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  默认线路
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  默认站点
                </th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!students || students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    暂无学生数据
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => (
                  <tr
                    key={student.id}
                    className={cn(
                      'hover:bg-slate-50/80 transition-colors animate-fade-in-up'
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-orange/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-brand-orange">
                            {student.name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-brand-navy">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {student.studentNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Bus className="w-4 h-4 text-brand-orange" />
                        <span className="text-slate-700">{student.defaultRoute.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {student.defaultStop.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleInitiateChange(student)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white',
                          'bg-gradient-to-r from-brand-orange to-brand-orange-dark',
                          'hover:from-brand-orange-dark hover:to-[#D15A25]',
                          'shadow-sm shadow-brand-orange/25 hover:shadow-brand-orange/40',
                          'transform hover:-translate-y-0.5 active:translate-y-0',
                          'transition-all duration-200'
                        )}
                      >
                        <Plus className="w-4 h-4" />
                        发起变更
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <div className="w-11 h-11 rounded-xl bg-brand-navy/10 flex items-center justify-center">
          <ClipboardList className="w-6 h-6 text-brand-navy" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-brand-navy">班级变更记录</h2>
          <p className="text-slate-500 mt-0.5">
            共 {changes?.length || 0} 条记录
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  学生
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  日期
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  原线路/站点
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  新线路/站点
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  发起人
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  申请时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!changes || changes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    暂无变更记录
                  </td>
                </tr>
              ) : (
                changes.map((change, idx) => (
                  <tr
                    key={change.id}
                    className={cn(
                      'hover:bg-slate-50/80 transition-colors animate-fade-in-up'
                    )}
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-brand-navy">{change.student.name}</span>
                      <span className="ml-2 text-xs text-slate-400">{change.student.studentNo}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {change.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {change.originalRoute.name} · {change.originalStop.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-slate-600">
                          {change.newRoute.name}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                        <span className="font-medium text-brand-navy">
                          {change.newStop.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {change.initiatorName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ChangeStatusBadge status={change.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDateTime(change.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ChangeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        student={selectedStudent}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
