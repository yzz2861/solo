import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { parseWidthInput } from '../services/unitConverter';
import { calculateTempDiff, isTempDiffSignificant } from '../services/tempCorrection';
import FormField from '../components/Form/FormField';
import SelectInput from '../components/Form/SelectInput';
import { PHOTO_ANGLES, TOOLS, SURVEYORS } from '../data/mockData';
import { MeasurementFormData } from '../types';
import { getCurrentQuarterDate, generateId } from '../utils/date';
import { Save, RotateCcw, Info, CheckCircle2 } from 'lucide-react';

export default function DataEntry() {
  const { bridges, cracks, threshold, addMeasurement, getCracksByBridgeId, getMeasurementsByCrackId } = useAppStore();

  const [formData, setFormData] = useState<MeasurementFormData>({
    bridgeId: '',
    crackId: '',
    measureDate: getCurrentQuarterDate(),
    widthInput: '',
    temperature: 20,
    photoId: '',
    photoAngle: '正面',
    surveyor: '',
    rechecker: '',
    tool: '',
    notes: '',
  });

  const [conversionInfo, setConversionInfo] = useState<{
    convertedMm: number;
    unit: string;
    note?: string;
  } | null>(null);

  const [tempWarning, setTempWarning] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ crackCode: string; width: string } | null>(null);

  const bridgeOptions = useMemo(
    () => bridges.map((b) => ({ value: b.id, label: `${b.name} (${b.location})` })),
    [bridges]
  );

  const crackOptions = useMemo(() => {
    if (!formData.bridgeId) return [];
    const bridgeCracks = getCracksByBridgeId(formData.bridgeId);
    return bridgeCracks.map((c) => ({
      value: c.id,
      label: `${c.code} - ${c.location}`,
    }));
  }, [formData.bridgeId, getCracksByBridgeId]);

  useEffect(() => {
    if (formData.widthInput.trim()) {
      const result = parseWidthInput(formData.widthInput);
      setConversionInfo({
        convertedMm: result.convertedMm,
        unit: result.unit,
        note: result.note,
      });
    } else {
      setConversionInfo(null);
    }
  }, [formData.widthInput]);

  useEffect(() => {
    if (formData.crackId && formData.temperature !== undefined) {
      const measurements = getMeasurementsByCrackId(formData.crackId);
      if (measurements.length > 0) {
        const lastMeasurement = measurements[measurements.length - 1];
        const diff = calculateTempDiff(formData.temperature, lastMeasurement.temperature);
        if (isTempDiffSignificant(diff, threshold.tempDiffThreshold)) {
          setTempWarning(
            `与上次测量温度差异 ${diff.toFixed(1)}℃，超过阈值 ${threshold.tempDiffThreshold}℃，数据对比需谨慎`
          );
        } else {
          setTempWarning(null);
        }
      }
    } else {
      setTempWarning(null);
    }
  }, [formData.crackId, formData.temperature, getMeasurementsByCrackId, threshold.tempDiffThreshold]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bridgeId || !formData.crackId || !formData.widthInput.trim()) {
      return;
    }

    const result = addMeasurement(formData);
    if (result) {
      setSaveSuccess(true);
      const crack = cracks.find((c) => c.id === formData.crackId);
      setLastSaved({
        crackCode: crack?.code || '',
        width: `${result.measurement.widthMm.toFixed(2)} mm`,
      });
      
      setFormData((prev) => ({
        ...prev,
        widthInput: '',
        photoId: '',
        notes: '',
      }));
      setConversionInfo(null);
      
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleReset = () => {
    setFormData({
      bridgeId: '',
      crackId: '',
      measureDate: getCurrentQuarterDate(),
      widthInput: '',
      temperature: 20,
      photoId: '',
      photoAngle: '正面',
      surveyor: '',
      rechecker: '',
      tool: '',
      notes: '',
    });
    setConversionInfo(null);
    setTempWarning(null);
  };

  const handleChange = (field: keyof MeasurementFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'bridgeId') {
      setFormData((prev) => ({ ...prev, crackId: '' }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-800 mb-1">数据录入</h2>
        <p className="text-sm text-neutral-500">
          录入桥梁裂缝季度测量数据，系统自动处理单位换算和异常检测
        </p>
      </div>

      {saveSuccess && lastSaved && (
        <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-success-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-success-800">保存成功！</p>
            <p className="text-sm text-success-600">
              裂缝 {lastSaved.crackCode} - 宽度 {lastSaved.width}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h3 className="text-base font-semibold text-neutral-800 mb-4 pb-2 border-b border-neutral-200">
            基本信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="桥梁名称" required>
              <SelectInput
                value={formData.bridgeId}
                onChange={(v) => handleChange('bridgeId', v)}
                options={bridgeOptions}
                placeholder="请选择桥梁"
              />
            </FormField>

            <FormField label="裂缝编号" required>
              <SelectInput
                value={formData.crackId}
                onChange={(v) => handleChange('crackId', v)}
                options={crackOptions}
                placeholder={formData.bridgeId ? '请选择裂缝' : '请先选择桥梁'}
                disabled={!formData.bridgeId}
              />
            </FormField>

            <FormField label="测量日期" required>
              <input
                type="date"
                value={formData.measureDate}
                onChange={(e) => handleChange('measureDate', e.target.value)}
                className="input"
              />
            </FormField>

            <FormField label="环境温度 (℃)" warning={tempWarning || undefined}>
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value) || 0)}
                className={tempWarning ? 'input-warning' : 'input'}
              />
            </FormField>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-semibold text-neutral-800 mb-4 pb-2 border-b border-neutral-200">
            测量数据
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="裂缝宽度"
              required
              success={conversionInfo ? `换算为 ${conversionInfo.convertedMm.toFixed(2)} mm` : undefined}
              warning={conversionInfo?.note}
            >
              <div className="relative">
                <input
                  type="text"
                  value={formData.widthInput}
                  onChange={(e) => handleChange('widthInput', e.target.value)}
                  placeholder="例如: 1.2mm 或 0.15cm"
                  className={`input pr-16 ${conversionInfo?.note ? 'input-warning' : ''}`}
                />
                {conversionInfo && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-500">
                    {conversionInfo.unit}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-neutral-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                支持毫米(mm)和厘米(cm)自动识别，数值≥10自动视为厘米
              </p>
            </FormField>

            <FormField label="照片编号">
              <input
                type="text"
                value={formData.photoId}
                onChange={(e) => handleChange('photoId', e.target.value)}
                placeholder="例如: IMG_0001"
                className="input font-mono"
              />
            </FormField>

            <FormField label="照片角度">
              <SelectInput
                value={formData.photoAngle}
                onChange={(v) => handleChange('photoAngle', v)}
                options={PHOTO_ANGLES.map((a) => ({ value: a, label: a }))}
              />
            </FormField>

            <FormField label="测量工具">
              <SelectInput
                value={formData.tool}
                onChange={(v) => handleChange('tool', v)}
                options={TOOLS.map((t) => ({ value: t, label: t }))}
                placeholder="请选择测量工具"
              />
            </FormField>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-semibold text-neutral-800 mb-4 pb-2 border-b border-neutral-200">
            人员信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="测量人">
              <SelectInput
                value={formData.surveyor}
                onChange={(v) => handleChange('surveyor', v)}
                options={SURVEYORS.map((s) => ({ value: s, label: s }))}
                placeholder="请选择测量人"
              />
            </FormField>

            <FormField label="复核人">
              <SelectInput
                value={formData.rechecker}
                onChange={(v) => handleChange('rechecker', v)}
                options={SURVEYORS.map((s) => ({ value: s, label: s }))}
                placeholder="请选择复核人"
              />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="备注">
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="其他需要说明的情况..."
                className="input min-h-[80px] resize-y"
              />
            </FormField>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={handleReset} className="btn-secondary">
            <RotateCcw className="w-4 h-4 mr-2" />
            重置
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!formData.bridgeId || !formData.crackId || !formData.widthInput.trim()}
          >
            <Save className="w-4 h-4 mr-2" />
            保存记录
          </button>
        </div>
      </form>
    </div>
  );
}
