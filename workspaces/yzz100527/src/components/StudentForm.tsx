import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { Student, IdType } from '@/types';
import { useStudentStore } from '@/store/useStudentStore';
import { generateAlerts, hasHealthRisk, hasDuplicate, isIdExpired, isIdExpiringSoon } from '@/utils/validators';
import { AlertBadge } from './AlertBadge';

interface StudentFormProps {
  studentId?: string;
  onClose: () => void;
}

const emptyStudent = {
  name: '',
  className: '',
  idType: 'idcard' as IdType,
  idNumber: '',
  idExpiryDate: '',
  healthNote: '',
  allergyNote: '',
  guardianSigned: false,
  insuranceProvided: false,
  busNumber: '',
  seatNumber: '',
  notes: '',
};

export function StudentForm({ studentId, onClose }: StudentFormProps) {
  const { students, addStudent, updateStudent, getStudentById } = useStudentStore();
  const [formData, setFormData] = useState(emptyStudent);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (studentId) {
      const student = getStudentById(studentId);
      if (student) {
        setFormData({
          name: student.name,
          className: student.className,
          idType: student.idType,
          idNumber: student.idNumber,
          idExpiryDate: student.idExpiryDate,
          healthNote: student.healthNote,
          allergyNote: student.allergyNote,
          guardianSigned: student.guardianSigned,
          insuranceProvided: student.insuranceProvided,
          busNumber: student.busNumber,
          seatNumber: student.seatNumber,
          notes: student.notes,
        });
      }
    }
  }, [studentId, getStudentById]);

  const alerts = useMemo(() => {
    if (!formData.name && !formData.idNumber) return [];
    const tempStudent: Student = {
      id: studentId || 'temp',
      ...formData,
      createdAt: '',
      updatedAt: '',
    };
    return generateAlerts(tempStudent, students);
  }, [formData, students, studentId]);

  const handleChange = (field: keyof typeof emptyStudent, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = '请输入学生姓名';
    }
    if (!formData.className.trim()) {
      newErrors.className = '请输入班级';
    }
    if (formData.idNumber && formData.idType === 'idcard' && formData.idNumber.length !== 18) {
      newErrors.idNumber = '身份证号应为18位';
    }
    if (formData.idNumber && studentId && hasDuplicate({ id: studentId, ...formData } as Student, students)) {
      newErrors.idNumber = '该学生已存在，请勿重复报名';
    }
    if (formData.idNumber && !studentId && hasDuplicate({ id: 'new', ...formData } as Student, students)) {
      newErrors.idNumber = '该学生已存在，请勿重复报名';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (studentId) {
      updateStudent(studentId, formData);
    } else {
      addStudent(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-800 to-slate-700">
          <h2 className="text-lg font-semibold text-white">
            {studentId ? '编辑学生信息' : '添加学生'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {alerts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-amber-800">智能提醒</p>
                <div className="flex flex-wrap gap-2">
                  {alerts.map((alert, idx) => (
                    <AlertBadge key={idx} type={alert.type} message={alert.message} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  学生姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                    errors.name ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder="请输入学生姓名"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  班级 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.className}
                  onChange={(e) => handleChange('className', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                    errors.className ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder="如：三年级二班"
                />
                {errors.className && (
                  <p className="mt-1 text-xs text-red-500">{errors.className}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-1 h-4 bg-slate-600 rounded-full" />
                证件信息
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    证件类型
                  </label>
                  <select
                    value={formData.idType}
                    onChange={(e) => handleChange('idType', e.target.value as IdType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="idcard">身份证</option>
                    <option value="household">户口本</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    证件号码
                  </label>
                  <input
                    type="text"
                    value={formData.idNumber}
                    onChange={(e) => handleChange('idNumber', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                      errors.idNumber ? 'border-red-400' : 'border-gray-300'
                    }`}
                    placeholder="请输入证件号码"
                  />
                  {errors.idNumber && (
                    <p className="mt-1 text-xs text-red-500">{errors.idNumber}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    证件有效期
                  </label>
                  <input
                    type="date"
                    value={formData.idExpiryDate}
                    onChange={(e) => handleChange('idExpiryDate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                      formData.idExpiryDate && (isIdExpired(formData.idExpiryDate) || isIdExpiringSoon(formData.idExpiryDate))
                        ? 'border-amber-400'
                        : 'border-gray-300'
                    }`}
                  />
                  {formData.idExpiryDate && isIdExpired(formData.idExpiryDate) && (
                    <p className="mt-1 text-xs text-amber-600">⚠️ 证件已过期</p>
                  )}
                  {formData.idExpiryDate && !isIdExpired(formData.idExpiryDate) && isIdExpiringSoon(formData.idExpiryDate) && (
                    <p className="mt-1 text-xs text-amber-600">⚠️ 证件30天内即将到期</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-1 h-4 bg-rose-500 rounded-full" />
                健康与过敏
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    健康备注
                  </label>
                  <textarea
                    value={formData.healthNote}
                    onChange={(e) => handleChange('healthNote', e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none ${
                      hasHealthRisk(formData.healthNote, formData.allergyNote)
                        ? 'border-rose-400'
                        : 'border-gray-300'
                    }`}
                    placeholder="如：心脏病、哮喘、不能剧烈运动等"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    过敏信息
                  </label>
                  <textarea
                    value={formData.allergyNote}
                    onChange={(e) => handleChange('allergyNote', e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none ${
                      hasHealthRisk(formData.healthNote, formData.allergyNote)
                        ? 'border-rose-400'
                        : 'border-gray-300'
                    }`}
                    placeholder="如：青霉素过敏、海鲜过敏等"
                  />
                </div>
              </div>
              {hasHealthRisk(formData.healthNote, formData.allergyNote) && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded">
                  ⚠️ 检测到健康风险关键词，请老师重点关注
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-1 h-4 bg-emerald-500 rounded-full" />
                材料确认
              </p>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.guardianSigned}
                    onChange={(e) => handleChange('guardianSigned', e.target.checked)}
                    className="w-4 h-4 rounded text-slate-600 focus:ring-slate-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">监护人授权签名</p>
                    <p className="text-xs text-gray-500">已收到家长授权书</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.insuranceProvided}
                    onChange={(e) => handleChange('insuranceProvided', e.target.checked)}
                    className="w-4 h-4 rounded text-slate-600 focus:ring-slate-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">保险信息</p>
                    <p className="text-xs text-gray-500">已确认保险已购买</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-500 rounded-full" />
                分车信息
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    车号
                  </label>
                  <input
                    type="text"
                    value={formData.busNumber}
                    onChange={(e) => handleChange('busNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="如：1号车"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    座位号
                  </label>
                  <input
                    type="text"
                    value={formData.seatNumber}
                    onChange={(e) => handleChange('seatNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="如：12"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                备注
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
                placeholder="其他需要记录的信息"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
            >
              {studentId ? '保存修改' : '添加学生'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
