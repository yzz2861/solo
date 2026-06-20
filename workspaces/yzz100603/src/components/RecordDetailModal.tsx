import { X, Printer, User, Calendar, AlertTriangle, CheckCircle, Beaker } from 'lucide-react';
import type { ShiftRecord } from '@/types';
import {
  formatDoseUnit,
  formatDosingMethod,
  formatNumber,
  formatChlorineUnit,
  formatConcentrationUnit,
} from '@/utils/unitConversion';
import { useAppStore } from '@/store/useAppStore';

interface RecordDetailModalProps {
  record: ShiftRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RecordDetailModal({ record, isOpen, onClose }: RecordDetailModalProps) {
  const { markAsPrinted } = useAppStore();

  if (!isOpen || !record) return null;

  const handlePrint = () => {
    markAsPrinted(record.id);
    window.print();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">交班记录详情</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              打印
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] print-content">
          <div className="print:hidden mb-4 pb-4 border-b border-dashed border-gray-200">
            <h2 className="text-xl font-bold text-center text-sky-800">泳池加药交班记录</h2>
          </div>

          {record.hasBoundaryViolation && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">安全边界越界</p>
                <p className="text-sm text-red-600 mt-1">{record.violationReason}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <User className="w-4 h-4" />
                计算人员
              </div>
              <p className="font-semibold text-gray-800">{record.calculatorName}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <User className="w-4 h-4" />
                投加人员
              </div>
              <p className="font-semibold text-gray-800">{record.operatorName}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Calendar className="w-4 h-4" />
                创建时间
              </div>
              <p className="font-semibold text-gray-800">{formatDate(record.createdAt)}</p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Beaker className="w-4 h-4 text-sky-600" />
              原始输入参数
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">池体体积：</span>
                  <span className="font-medium">{record.poolVolume ?? '-'} m³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">当前余氯：</span>
                  <span className="font-medium">
                    {record.currentChlorine ?? '-'} {formatChlorineUnit(record.chlorineUnit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">目标余氯：</span>
                  <span className="font-medium">
                    {record.targetChlorine ?? '-'} {formatChlorineUnit(record.chlorineUnit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">pH 值：</span>
                  <span className="font-medium">{record.ph ?? '-'}</span>
                </div>
                <div className="flex justify-between md:col-span-2">
                  <span className="text-gray-500">药剂名称：</span>
                  <span className="font-medium">{record.chemicalName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">药剂浓度：</span>
                  <span className="font-medium">
                    {record.chemicalConcentration ?? '-'}{' '}
                    {formatConcentrationUnit(record.concentrationUnit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">投加方式：</span>
                  <span className="font-medium">{formatDosingMethod(record.dosingMethod)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              计算结果
            </h4>
            <div className="bg-sky-50 rounded-lg p-4 border border-sky-200">
              <div className="flex items-baseline gap-2">
                <span className="text-gray-600">建议投加量：</span>
                <span className="text-3xl font-bold text-sky-700">
                  {formatNumber(record.calculatedDose)}
                </span>
                <span className="text-lg text-sky-600">
                  {formatDoseUnit(record.doseUnit)}
                </span>
              </div>
            </div>
          </div>

          {record.steps && record.steps.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-3">计算步骤</h4>
              <div className="space-y-3">
                {record.steps.map((step) => (
                  <div key={step.stepOrder} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 bg-sky-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {step.stepOrder}
                      </span>
                      <span className="font-medium text-gray-800">{step.description}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono ml-7">{step.formula}</p>
                    <p className="text-sm text-sky-700 font-medium ml-7 mt-1">
                      → {step.result}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.warnings.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-3">警示信息</h4>
              <div className="space-y-2">
                {record.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg text-sm ${
                      warning.type === 'danger'
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : warning.type === 'warning'
                        ? 'bg-amber-50 border border-amber-200 text-amber-700'
                        : 'bg-blue-50 border border-blue-200 text-blue-700'
                    }`}
                  >
                    {warning.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">投加后检测</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">投加后余氯</p>
                <p className="text-xl font-bold text-green-700">
                  {record.postChlorine !== null ? formatNumber(record.postChlorine) : '未检测'}
                  {record.postChlorine !== null && ' mg/L'}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">投加后 pH</p>
                <p className="text-xl font-bold text-green-700">
                  {record.postPh !== null ? formatNumber(record.postPh, 1) : '未检测'}
                </p>
              </div>
            </div>
          </div>

          {record.notes && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-3">备注</h4>
              <div className="bg-gray-50 rounded-lg p-4 text-gray-700">{record.notes}</div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
            <span>记录编号：{record.id}</span>
            {record.isPrinted && <span className="text-green-600">已打印</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
