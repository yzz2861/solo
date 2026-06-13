import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CrackAlias } from '../types';
import FormField from '../components/Form/FormField';
import SelectInput from '../components/Form/SelectInput';
import { Plus, Trash2, GitBranch, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { generateId, getCurrentQuarterDate } from '../utils/date';

export default function CrackMapping() {
  const { bridges, cracks, crackAliases, getCracksByBridgeId, addCrackAlias } = useAppStore();

  const [selectedBridgeId, setSelectedBridgeId] = useState('');
  const [selectedCrackId, setSelectedCrackId] = useState('');
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [changeDate, setChangeDate] = useState(getCurrentQuarterDate());
  const [saveSuccess, setSaveSuccess] = useState(false);

  const bridgeOptions = bridges.map((b) => ({
    value: b.id,
    label: `${b.name} (${b.location})`,
  }));

  const crackOptions = selectedBridgeId
    ? getCracksByBridgeId(selectedBridgeId).map((c) => ({
        value: c.id,
        label: `${c.code} - ${c.location}`,
      }))
    : [];

  const selectedCrack = cracks.find((c) => c.id === selectedCrackId);

  const aliasesForCrack = crackAliases.filter(
    (a) => a.crackId === selectedCrackId
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCrackId || !oldCode.trim() || !newCode.trim()) {
      return;
    }

    addCrackAlias({
      crackId: selectedCrackId,
      oldCode: oldCode.trim().toUpperCase(),
      newCode: newCode.trim().toUpperCase(),
      changeDate,
    });

    setSaveSuccess(true);
    setOldCode('');
    setNewCode('');

    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    setSelectedBridgeId('');
    setSelectedCrackId('');
    setOldCode('');
    setNewCode('');
    setChangeDate(getCurrentQuarterDate());
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-800 mb-1">裂缝映射管理</h2>
        <p className="text-sm text-neutral-500">
          管理同一裂缝的不同编号别名，解决裂缝改名问题
        </p>
      </div>

      <div className="card p-6 border-l-4 border-primary-500">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-neutral-800">使用说明</p>
            <p className="text-sm text-neutral-600 mt-1">
              当裂缝编号发生变更时，在此处添加映射关系。系统会自动识别曾用名，
              确保历史数据可以正确关联。例如：原编号 "L-001-old" 改为 "L-001"。
            </p>
            <ul className="text-sm text-neutral-600 mt-2 space-y-1">
              <li className="flex items-start gap-1.5">
                <span className="text-primary-500 mt-1">•</span>
                <span>查询时输入曾用名，系统自动定位到对应裂缝</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary-500 mt-1">•</span>
                <span>分析时自动合并不同编号下的历史测量数据</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary-500 mt-1">•</span>
                <span>保留变更记录，便于追溯历史编号变更</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-base font-semibold text-neutral-800 mb-4 pb-2 border-b border-neutral-200 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary-600" />
            添加映射关系
          </h3>

          {saveSuccess && (
            <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success-600 flex-shrink-0" />
              <span className="text-sm text-success-800">映射关系添加成功！</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="选择桥梁" required>
              <SelectInput
                value={selectedBridgeId}
                onChange={(v) => {
                  setSelectedBridgeId(v);
                  setSelectedCrackId('');
                }}
                options={bridgeOptions}
                placeholder="请选择桥梁"
              />
            </FormField>

            <FormField label="选择裂缝" required>
              <SelectInput
                value={selectedCrackId}
                onChange={setSelectedCrackId}
                options={crackOptions}
                placeholder={selectedBridgeId ? '请选择裂缝' : '请先选择桥梁'}
                disabled={!selectedBridgeId}
              />
            </FormField>

            {selectedCrack && (
              <div className="p-3 bg-primary-50 rounded-lg">
                <p className="text-sm text-neutral-700">
                  <span className="font-medium">当前编号：</span>
                  <span className="font-mono font-semibold text-primary-700">{selectedCrack.code}</span>
                </p>
                <p className="text-sm text-neutral-600 mt-1">
                  <span className="font-medium">位置：</span>{selectedCrack.location}
                </p>
              </div>
            )}

            <FormField label="原编号（曾用名）" required>
              <input
                type="text"
                value={oldCode}
                onChange={(e) => setOldCode(e.target.value)}
                placeholder="例如：L-001-old"
                className="input font-mono"
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                输入变更前使用的编号
              </p>
            </FormField>

            <FormField label="新编号" required>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="例如：L-001"
                className="input font-mono"
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                输入变更后使用的编号
              </p>
            </FormField>

            <FormField label="变更日期">
              <input
                type="date"
                value={changeDate}
                onChange={(e) => setChangeDate(e.target.value)}
                className="input"
              />
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={handleReset} className="btn-secondary">
                重置
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={!selectedCrackId || !oldCode.trim() || !newCode.trim()}
              >
                <Plus className="w-4 h-4 mr-2" />
                添加映射
              </button>
            </div>
          </form>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-semibold text-neutral-800 mb-4 pb-2 border-b border-neutral-200 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary-600" />
            已有映射关系
          </h3>

          {crackAliases.length > 0 ? (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {crackAliases.map((alias) => {
                const crack = cracks.find((c) => c.id === alias.crackId);
                const bridge = bridges.find((b) => b.id === crack?.bridgeId);

                return (
                  <div
                    key={alias.id}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch className="w-4 h-4 text-primary-500" />
                      <span className="text-sm text-neutral-500">
                        {bridge?.name} - {crack?.location}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-lg font-mono">
                      <span className="px-3 py-1 bg-neutral-100 rounded text-neutral-700">
                        {alias.oldCode}
                      </span>
                      <span className="text-neutral-400">→</span>
                      <span className="px-3 py-1 bg-primary-100 rounded text-primary-800 font-semibold">
                        {alias.newCode}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                      <span>变更日期：{alias.changeDate}</span>
                      <span>裂缝编号：{crack?.code}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-500">
              <GitBranch className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <p>暂无映射关系</p>
              <p className="text-sm mt-1">添加裂缝编号的新旧映射</p>
            </div>
          )}
        </div>
      </div>

      {selectedCrackId && aliasesForCrack.length > 0 && (
        <div className="card p-6">
          <h3 className="text-base font-semibold text-neutral-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning-500" />
            裂缝 {selectedCrack?.code} 的历史编号
          </h3>
          <div className="flex flex-wrap gap-3">
            {aliasesForCrack.map((alias) => (
              <div
                key={alias.id}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-lg border border-neutral-200"
              >
                <span className="font-mono text-neutral-600">{alias.oldCode}</span>
                <span className="text-neutral-400">→</span>
                <span className="font-mono font-semibold text-primary-700">{alias.newCode}</span>
                <span className="text-xs text-neutral-400 ml-2">
                  ({alias.changeDate})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
