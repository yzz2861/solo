import { useState } from 'react';
import { X, RefreshCw, CheckCircle, AlertCircle, User } from 'lucide-react';
import type { Visitor } from '../types';
import { useStore } from '../store/useStore';
import { validatePlateNumber, formatPlateNumber } from '../utils/plateValidator';

interface PlateChangeModalProps {
  visitor: Visitor;
  onClose: () => void;
}

export function PlateChangeModal({ visitor, onClose }: PlateChangeModalProps) {
  const { changePlateNumber, currentUser } = useStore();
  const [newPlate, setNewPlate] = useState('');
  const [approver, setApprover] = useState(currentUser?.name || '');
  const [plateValidation, setPlateValidation] = useState<{ valid: boolean; message: string } | null>(null);
  const [error, setError] = useState('');

  const handlePlateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setNewPlate(value);

    if (value.length > 0) {
      if (value.length < 7 || value.length > 8) {
        setPlateValidation({ valid: false, message: '车牌长度应为7-8位' });
      } else if (!validatePlateNumber(value)) {
        setPlateValidation({ valid: false, message: '车牌格式不正确' });
      } else {
        setPlateValidation({ valid: true, message: '车牌格式正确' });
      }
    } else {
      setPlateValidation(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!plateValidation?.valid) {
      setError('请输入正确的车牌号码');
      return;
    }

    if (!approver.trim()) {
      setError('请输入批准人姓名');
      return;
    }

    const formattedNewPlate = formatPlateNumber(newPlate);
    const success = changePlateNumber(visitor.id, formattedNewPlate, approver.trim());

    if (success) {
      alert('车牌变更成功！');
      onClose();
    } else {
      setError('车牌变更失败，请重试');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg animate-fade-in-up">
        <div className="bg-accent-500 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw size={24} />
            <h2 className="text-xl font-bold">临时换车登记</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">当前预约信息</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">来访单位：</span>
                <span className="font-medium">{visitor.company}</span>
              </div>
              <div>
                <span className="text-gray-500">被访人：</span>
                <span className="font-medium">{visitor.contactPerson}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">原车牌：</span>
                <span className="font-bold text-lg text-accent-600 ml-2">{visitor.plateNumber}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                新车牌号码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newPlate}
                  onChange={handlePlateInput}
                  maxLength={8}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none font-mono text-lg tracking-wider ${
                    error && !plateValidation?.valid
                      ? 'border-red-300 focus:border-red-500'
                      : plateValidation?.valid
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-gray-200 focus:border-accent-500'
                  }`}
                  placeholder="请输入新车牌号码"
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
                  </div>
                )}
              </div>
              {plateValidation && (
                <p className={`mt-1 text-sm ${plateValidation.valid ? 'text-green-500' : 'text-red-500'}`}>
                  {plateValidation.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                批准人 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={approver}
                  onChange={(e) => setApprover(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                    error && !approver.trim()
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-accent-500'
                  }`}
                  placeholder="请输入批准人姓名"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-700">
                <strong>重要提示：</strong>车牌变更后，系统将自动记录变更历史，包括原车牌、新车牌和批准人信息，以备后续核查。
              </p>
            </div>

            <div className="flex gap-3 pt-2">
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
                <RefreshCw size={18} />
                确认变更
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
