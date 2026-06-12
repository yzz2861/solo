import { useState, useEffect } from 'react';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import type { Visitor, VisitorFormData } from '../types';
import { useStore } from '../store/useStore';
import { validatePlateNumber, formatPlateNumber } from '../utils/plateValidator';
import { getAvailableParkingSpots } from '../utils/parkingConflict';
import { getTodayDateString } from '../utils/dateUtils';

interface VisitorFormProps {
  onClose: () => void;
  editingVisitor?: Visitor;
}

export function VisitorForm({ onClose, editingVisitor }: VisitorFormProps) {
  const { addVisitor, updateVisitor, visitors, parkingSpots, currentUser, addAlert } = useStore();
  const [formData, setFormData] = useState<VisitorFormData>({
    company: '',
    contactPerson: '',
    plateNumber: '',
    timeSlot: 'morning',
    visitDate: getTodayDateString(),
    startTime: '09:00',
    endTime: '12:00',
    parkingSpot: '',
    remarks: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [plateValidation, setPlateValidation] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => {
    if (editingVisitor) {
      setFormData({
        company: editingVisitor.company,
        contactPerson: editingVisitor.contactPerson,
        plateNumber: editingVisitor.plateNumber,
        timeSlot: editingVisitor.timeSlot,
        visitDate: editingVisitor.visitDate,
        startTime: editingVisitor.startTime,
        endTime: editingVisitor.endTime,
        parkingSpot: editingVisitor.parkingSpot,
        remarks: editingVisitor.remarks || '',
      });
    }
  }, [editingVisitor]);

  useEffect(() => {
    const plate = formData.plateNumber.trim();
    if (plate.length > 0) {
      if (plate.length < 7 || plate.length > 8) {
        setPlateValidation({ valid: false, message: '车牌长度应为7-8位' });
      } else if (!validatePlateNumber(plate)) {
        setPlateValidation({ valid: false, message: '车牌格式不正确' });
      } else {
        setPlateValidation({ valid: true, message: '车牌格式正确' });
      }
    } else {
      setPlateValidation(null);
    }
  }, [formData.plateNumber]);

  useEffect(() => {
    if (formData.timeSlot === 'morning') {
      setFormData((prev) => ({ ...prev, startTime: '09:00', endTime: '12:00' }));
    } else {
      setFormData((prev) => ({ ...prev, startTime: '13:30', endTime: '18:00' }));
    }
  }, [formData.timeSlot]);

  const availableSpots = getAvailableParkingSpots(
    parkingSpots,
    visitors,
    formData.visitDate,
    formData.timeSlot
  );

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.company.trim()) {
      newErrors.company = '请输入来访单位';
    }
    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = '请输入被访人';
    }
    if (!formData.plateNumber.trim()) {
      newErrors.plateNumber = '请输入车牌号码';
    } else if (!plateValidation?.valid) {
      newErrors.plateNumber = '车牌格式不正确';
    }
    if (!formData.parkingSpot) {
      newErrors.parkingSpot = '请选择车位';
    }
    if (formData.startTime >= formData.endTime) {
      newErrors.time = '结束时间必须晚于开始时间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    if (!currentUser) {
      alert('请先选择用户身份');
      return;
    }

    const formattedPlate = formatPlateNumber(formData.plateNumber);
    const submitData = { ...formData, plateNumber: formattedPlate };

    if (editingVisitor) {
      updateVisitor(editingVisitor.id, submitData);
      alert('预约更新成功！');
    } else {
      const result = addVisitor(submitData, currentUser.name);
      if (result.success) {
        alert('预约登记成功！');
      } else {
        return;
      }
    }

    onClose();
  };

  const handlePlateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setFormData((prev) => ({ ...prev, plateNumber: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {editingVisitor ? '编辑预约' : '新增预约'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                来访单位 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                  errors.company
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-200 focus:border-primary-500'
                }`}
                placeholder="请输入来访单位名称"
              />
              {errors.company && (
                <p className="mt-1 text-sm text-red-500">{errors.company}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                被访人 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                  errors.contactPerson
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-200 focus:border-primary-500'
                }`}
                placeholder="请输入被访人姓名"
              />
              {errors.contactPerson && (
                <p className="mt-1 text-sm text-red-500">{errors.contactPerson}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              车牌号码 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.plateNumber}
                onChange={handlePlateInput}
                maxLength={8}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none font-mono text-lg tracking-wider ${
                  errors.plateNumber
                    ? 'border-red-300 focus:border-red-500'
                    : plateValidation?.valid
                    ? 'border-green-300 focus:border-green-500'
                    : 'border-gray-200 focus:border-primary-500'
                }`}
                placeholder="例如：粤A12345"
              />
              {plateValidation && (
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm ${
                  plateValidation.valid ? 'text-green-500' : 'text-red-500'
                }`}>
                  {plateValidation.valid ? (
                    <CheckCircle size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )}
                  <span className="hidden sm:inline">{plateValidation.message}</span>
                </div>
              )}
            </div>
            {errors.plateNumber && (
              <p className="mt-1 text-sm text-red-500">{errors.plateNumber}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              支持普通燃油车、新能源车、警车等格式
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                访问日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.visitDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, visitDate: e.target.value }))}
                min={getTodayDateString()}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary-500 transition-colors focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                预约时段 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, timeSlot: 'morning' }))}
                  className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all ${
                    formData.timeSlot === 'morning'
                      ? 'border-status-morning bg-slate-50 text-status-morning'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  上午
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, timeSlot: 'afternoon' }))}
                  className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all ${
                    formData.timeSlot === 'afternoon'
                      ? 'border-status-afternoon bg-blue-50 text-status-afternoon'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  下午
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                开始时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary-500 transition-colors focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                结束时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary-500 transition-colors focus:outline-none"
              />
            </div>
          </div>
          {errors.time && (
            <p className="text-sm text-red-500">{errors.time}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择车位 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {parkingSpots.map((spot) => {
                const isAvailable = availableSpots.includes(spot) || spot === editingVisitor?.parkingSpot;
                const isSelected = formData.parkingSpot === spot;
                
                return (
                  <button
                    key={spot}
                    type="button"
                    onClick={() => {
                      if (isAvailable) {
                        setFormData((prev) => ({ ...prev, parkingSpot: spot }));
                      } else {
                        addAlert(
                          'parking_conflict',
                          `车位 ${spot} 在 ${formData.visitDate} ${formData.timeSlot === 'morning' ? '上午' : '下午'} 已被预约`
                        );
                      }
                    }}
                    disabled={!isAvailable}
                    className={`py-3 px-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : isAvailable
                        ? 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                        : 'border-gray-100 bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                    }`}
                  >
                    {spot}
                  </button>
                );
              })}
            </div>
            {errors.parkingSpot && (
              <p className="mt-1 text-sm text-red-500">{errors.parkingSpot}</p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              灰色划线车位表示该时段已被占用，可选择其他日期或时段
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary-500 transition-colors focus:outline-none resize-none"
              placeholder="可选填特殊说明"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-lg bg-accent-500 text-white font-medium hover:bg-accent-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              {editingVisitor ? '保存修改' : '提交预约'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
