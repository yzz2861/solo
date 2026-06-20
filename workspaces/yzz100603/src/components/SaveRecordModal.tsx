import { useState } from 'react';
import { X, Save, User, ClipboardList } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { ShiftRecord, CalculationResult } from '@/types';
import { formatDoseUnit, formatDosingMethod, formatNumber } from '@/utils/unitConversion';

interface SaveRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CalculationResult | null;
}

export function SaveRecordModal({ isOpen, onClose, result }: SaveRecordModalProps) {
  const { currentUser, currentParams, chemicals, users, addRecord } = useAppStore();
  const [operatorId, setOperatorId] = useState(currentUser?.id || '');
  const [postChlorine, setPostChlorine] = useState<string>('');
  const [postPh, setPostPh] = useState<string>('');
  const [notes, setNotes] = useState('');

  const admins = users.filter((u) => u.role === 'admin');
  const selectedChemical = chemicals.find((c) => c.id === currentParams.chemicalId);

  const handleSave = () => {
    if (!currentUser || !selectedChemical || !result) return;

    const operator = users.find((u) => u.id === operatorId);

    const record: ShiftRecord = {
      id: `r${Date.now()}`,
      calculatorId: currentUser.id,
      calculatorName: currentUser.name,
      operatorId: operatorId || currentUser.id,
      operatorName: operator?.name || currentUser.name,
      createdAt: new Date().toISOString(),
      poolVolume: currentParams.poolVolume,
      currentChlorine: currentParams.currentChlorine,
      targetChlorine: currentParams.targetChlorine,
      chlorineUnit: currentParams.chlorineUnit,
      ph: currentParams.ph,
      chemicalId: currentParams.chemicalId,
      chemicalName: selectedChemical.name,
      chemicalConcentration: currentParams.chemicalConcentration,
      concentrationUnit: currentParams.concentrationUnit,
      dosingMethod: currentParams.dosingMethod,
      calculatedDose: result.dose,
      doseUnit: result.doseUnit,
      warnings: result.warnings,
      hasBoundaryViolation: result.hasBoundaryViolation,
      violationReason: result.violationReason,
      postChlorine: postChlorine ? Number(postChlorine) : null,
      postPh: postPh ? Number(postPh) : null,
      notes,
      isPrinted: false,
      steps: result.steps,
    };

    addRecord(record);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-sky-50">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-sky-600" />
            保存交班记录
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">药剂：{selectedChemical?.name}</p>
            <p className="text-sm text-gray-600 mb-2">
              建议投加量：
              <span className="font-bold text-sky-700 text-lg">
                {formatNumber(result?.dose || 0)} {formatDoseUnit(result?.doseUnit || 'g')}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              投加方式：{formatDosingMethod(currentParams.dosingMethod)}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <User className="w-4 h-4 inline mr-1" />
                投加人员
              </label>
              <select
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              >
                <option value="">请选择投加人员</option>
                {admins.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  投加后余氯 (mg/L)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={postChlorine}
                  onChange={(e) => setPostChlorine(e.target.value)}
                  placeholder="投加后检测值"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  投加后 pH
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={postPh}
                  onChange={(e) => setPostPh(e.target.value)}
                  placeholder="投加后检测值"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                备注说明
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="请输入备注信息..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!result || result.steps.length === 0}
            className="px-5 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            保存记录
          </button>
        </div>
      </div>
    </div>
  );
}
