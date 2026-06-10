import { useState, useEffect, useMemo } from 'react';
import { Coffee, Droplets, Scale, FlaskConical, Tag as TagIcon } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import ScoreSlider from '@/components/scoring/ScoreSlider';
import DefectTags from '@/components/defects/DefectTags';
import ValidationAlert from '@/components/alerts/ValidationAlert';
import { useRecordsStore, createNewRecord } from '@/store/useRecordsStore';
import { validateRecord } from '@/utils/validation';
import { CuppingRecord, ScoreKey, SCORE_LABELS, PROCESS_OPTIONS } from '@/types';
import { getDefectSuggestion } from '@/utils/defectDictionary';

const RecordForm: React.FC = () => {
  const { isFormOpen, editingRecord, closeForm, addRecord, updateRecord, records } =
    useRecordsStore();

  const [formData, setFormData] = useState<CuppingRecord | null>(null);

  useEffect(() => {
    if (isFormOpen) {
      if (editingRecord) {
        setFormData({ ...editingRecord });
      } else {
        setFormData({
          ...createNewRecord(),
          id: 'temp',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as CuppingRecord);
      }
    }
  }, [isFormOpen, editingRecord]);

  const validationWarnings = useMemo(() => {
    if (!formData) return [];
    const result = validateRecord(formData, records);
    return result.warnings;
  }, [formData, records]);

  const hasErrors = validationWarnings.some((w) => w.severity === 'error');

  const defectSuggestions = useMemo(() => {
    if (!formData) return [];
    const suggestions: { defect: string; suggestion: string }[] = [];
    for (const defect of formData.defects) {
      const suggestion = getDefectSuggestion(defect);
      if (suggestion) {
        suggestions.push({ defect, suggestion });
      }
    }
    return suggestions;
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || hasErrors) return;

    if (editingRecord) {
      updateRecord(editingRecord.id, formData);
    } else {
      const recordData = { ...formData };
      delete (recordData as Partial<CuppingRecord>).id;
      delete (recordData as Partial<CuppingRecord>).createdAt;
      delete (recordData as Partial<CuppingRecord>).updatedAt;
      addRecord(recordData as Omit<CuppingRecord, 'id' | 'createdAt' | 'updatedAt'>);
    }
    closeForm();
  };

  const updateField = <K extends keyof CuppingRecord>(
    field: K,
    value: CuppingRecord[K]
  ) => {
    if (!formData) return;
    setFormData({ ...formData, [field]: value });
  };

  const updateScore = (key: ScoreKey, value: number) => {
    if (!formData) return;
    setFormData({
      ...formData,
      scores: { ...formData.scores, [key]: value },
    });
  };

  const updateBrewParam = <K extends keyof CuppingRecord['brewParams']>(
    key: K,
    value: CuppingRecord['brewParams'][K]
  ) => {
    if (!formData) return;
    setFormData({
      ...formData,
      brewParams: { ...formData.brewParams, [key]: value },
    });
  };

  const updateStatus = <K extends keyof CuppingRecord['status']>(
    key: K,
    value: CuppingRecord['status'][K]
  ) => {
    if (!formData) return;
    setFormData({
      ...formData,
      status: { ...formData.status, [key]: value },
    });
  };

  if (!formData) return null;

  const scoreKeys: ScoreKey[] = ['aroma', 'acidity', 'sweetness', 'body', 'balance', 'overall'];

  return (
    <Modal
      isOpen={isFormOpen}
      onClose={closeForm}
      title={editingRecord ? '编辑杯测记录' : '新增杯测记录'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {validationWarnings.length > 0 && (
          <ValidationAlert warnings={validationWarnings} />
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-coffee-800">
            <Coffee className="w-5 h-5" />
            <h3 className="font-serif text-lg font-semibold">基础信息</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                产区
              </label>
              <input
                type="text"
                value={formData.origin}
                onChange={(e) => updateField('origin', e.target.value)}
                placeholder="例如：埃塞俄比亚 耶加雪菲"
                className="w-full px-3 py-2 border border-coffee-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                处理法
              </label>
              <select
                value={formData.process}
                onChange={(e) => updateField('process', e.target.value)}
                className="w-full px-3 py-2 border border-coffee-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white"
              >
                {PROCESS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                烘焙批次
              </label>
              <input
                type="text"
                value={formData.batch}
                onChange={(e) => updateField('batch', e.target.value)}
                placeholder="例如：B2024001"
                className="w-full px-3 py-2 border border-coffee-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                杯测人
              </label>
              <input
                type="text"
                value={formData.cupper}
                onChange={(e) => updateField('cupper', e.target.value)}
                placeholder="你的名字"
                className="w-full px-3 py-2 border border-coffee-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                杯测日期
              </label>
              <input
                type="date"
                value={formData.cuppingDate}
                onChange={(e) => updateField('cuppingDate', e.target.value)}
                className="w-full px-3 py-2 border border-coffee-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-coffee-800">
            <Scale className="w-5 h-5" />
            <h3 className="font-serif text-lg font-semibold">评分项（0-10分）</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {scoreKeys.map((key) => {
              const scoreValue = formData.scores[key];
              const isOutOfRange = scoreValue < 0 || scoreValue > 10;
              
              return (
                <ScoreSlider
                  key={key}
                  label={SCORE_LABELS[key]}
                  value={scoreValue}
                  onChange={(value) => updateScore(key, value)}
                  error={isOutOfRange}
                />
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-coffee-800">
            <FlaskConical className="w-5 h-5" />
            <h3 className="font-serif text-lg font-semibold">风味与缺陷</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                香气描述
              </label>
              <textarea
                value={formData.aromaNotes}
                onChange={(e) => updateField('aromaNotes', e.target.value)}
                placeholder="干香、湿香描述..."
                rows={2}
                className="w-full px-3 py-2 border border-coffee-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                风味描述
              </label>
              <textarea
                value={formData.flavorNotes}
                onChange={(e) => updateField('flavorNotes', e.target.value)}
                placeholder="啜吸风味、余韵..."
                rows={2}
                className="w-full px-3 py-2 border border-coffee-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-2">
              缺陷标记
            </label>
            <DefectTags
              value={formData.defects}
              onChange={(defects) => updateField('defects', defects)}
              suggestions={defectSuggestions}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">
              备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="其他需要记录的信息..."
              rows={2}
              className="w-full px-3 py-2 border border-coffee-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white resize-none"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-coffee-800">
            <Droplets className="w-5 h-5" />
            <h3 className="font-serif text-lg font-semibold">萃取参数</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                磨豆机
              </label>
              <input
                type="text"
                value={formData.brewParams.grinder}
                onChange={(e) => updateBrewParam('grinder', e.target.value)}
                placeholder="型号"
                className="w-full px-3 py-2 border border-coffee-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                研磨度
              </label>
              <input
                type="text"
                value={formData.brewParams.grindSize}
                onChange={(e) => updateBrewParam('grindSize', e.target.value)}
                placeholder="如：中细"
                className="w-full px-3 py-2 border border-coffee-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                水温 (°C)
              </label>
              <input
                type="number"
                value={formData.brewParams.waterTemp}
                onChange={(e) => updateBrewParam('waterTemp', Number(e.target.value))}
                className="w-full px-3 py-2 border border-coffee-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                粉水比
              </label>
              <input
                type="text"
                value={formData.brewParams.ratio}
                onChange={(e) => updateBrewParam('ratio', e.target.value)}
                placeholder="如：1:15"
                className="w-full px-3 py-2 border border-coffee-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white text-sm"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-coffee-800">
            <TagIcon className="w-5 h-5" />
            <h3 className="font-serif text-lg font-semibold">状态设置</h3>
          </div>
          
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.status.isOnSale}
                onChange={(e) => updateStatus('isOnSale', e.target.checked)}
                className="w-4 h-4 text-coffee-600 border-coffee-300 rounded focus:ring-coffee-500"
              />
              <span className="text-sm text-coffee-700">已上架</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.status.isRetest}
                onChange={(e) => updateStatus('isRetest', e.target.checked)}
                className="w-4 h-4 text-amber-600 border-coffee-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-coffee-700">需复测</span>
            </label>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t border-coffee-200">
          <Button type="button" variant="ghost" onClick={closeForm}>
            取消
          </Button>
          <Button type="submit" variant="primary" disabled={hasErrors}>
            {editingRecord ? '保存修改' : '创建记录'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RecordForm;
