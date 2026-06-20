import { useState } from 'react';
import { Save, ChevronDown, ChevronUp, CheckCircle, Droplets, Clock, FileText } from 'lucide-react';
import { useDryingStore } from '@/store/useDryingStore';
import { formatTime } from '@/utils/calculator';

export default function RecordForm() {
  const { result, saveRecord, params } = useDryingStore();
  const [isOpen, setIsOpen] = useState(false);
  const [actualMoisture, setActualMoisture] = useState('');
  const [actualTime, setActualTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  if (!result) return null;

  const handleSave = () => {
    const moisture = parseFloat(actualMoisture) || params.targetMoisture;
    const time = parseFloat(actualTime) || result.estimatedTime;

    const success = saveRecord(moisture, time, notes);
    if (success) {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setIsOpen(false);
        setActualMoisture('');
        setActualTime('');
        setNotes('');
      }, 2000);
    }
  };

  return (
    <div className="card mt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-warm-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Save className="w-5 h-5 text-primary-500" />
          <span className="font-medium text-warm-700">记录实际烘干数据</span>
          <span className="text-xs text-warm-400 bg-warm-100 px-2 py-0.5 rounded-full">
            保存到经验库
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-warm-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-warm-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-6 pb-6 space-y-4 border-t border-warm-100 pt-4">
          {saved ? (
            <div className="flex items-center justify-center gap-3 py-8 text-success-600">
              <CheckCircle className="w-8 h-8" />
              <span className="text-lg font-medium">保存成功！已加入经验档案</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium text-warm-700">
                    <Droplets className="w-4 h-4 text-primary-500" />
                    实际最终含水率
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={actualMoisture}
                      onChange={(e) => setActualMoisture(e.target.value)}
                      placeholder={`目标: ${params.targetMoisture}`}
                      className="input-field pr-10"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-400 text-sm">
                      %
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium text-warm-700">
                    <Clock className="w-4 h-4 text-primary-500" />
                    实际烘干时长
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={actualTime}
                      onChange={(e) => setActualTime(e.target.value)}
                      placeholder={`预估: ${result.estimatedTime}`}
                      className="input-field pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-400 text-sm">
                      小时
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-warm-700">
                  <FileText className="w-4 h-4 text-primary-500" />
                  备注
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="记录特殊情况、操作调整等..."
                  className="input-field min-h-[80px] resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-warm-500">
                  预估时长 {formatTime(result.estimatedTime)}
                </div>
                <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  保存记录
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
