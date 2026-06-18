import React, { useState } from 'react';
import type { Level, VulnerablePoint } from '../types';
import { createEmptyLevel } from '../utils/levelStorage';
import { linerMaterials, fixingMaterials, desiccantTypes, boxTypes } from '../data/materials';
import { getMaterialLabel, getDistanceLabel } from '../logic/packingEvaluation';

interface Props {
  levels: Level[];
  onSaveLevels: (levels: Level[]) => void;
  onBack: () => void;
}

export const TeacherPanel: React.FC<Props> = ({ levels, onSaveLevels, onBack }) => {
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = () => {
    setEditingLevel(createEmptyLevel());
    setIsCreating(true);
  };

  const handleEdit = (level: Level) => {
    setEditingLevel(JSON.parse(JSON.stringify(level)));
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!editingLevel) return;

    if (isCreating) {
      onSaveLevels([...levels, editingLevel]);
    } else {
      onSaveLevels(levels.map(l => (l.id === editingLevel.id ? editingLevel : l)));
    }
    setEditingLevel(null);
    setIsCreating(false);
  };

  const handleDelete = (levelId: string) => {
    if (window.confirm('确定要删除这个关卡吗？')) {
      onSaveLevels(levels.filter(l => l.id !== levelId));
    }
  };

  const handleCancel = () => {
    setEditingLevel(null);
    setIsCreating(false);
  };

  const updateField = <K extends keyof Level>(field: K, value: Level[K]) => {
    if (!editingLevel) return;
    setEditingLevel({ ...editingLevel, [field]: value });
  };

  const updateArtifact = <K extends keyof Level['artifact']>(field: K, value: Level['artifact'][K]) => {
    if (!editingLevel) return;
    setEditingLevel({
      ...editingLevel,
      artifact: { ...editingLevel.artifact, [field]: value },
    });
  };

  const updateOptimalSolution = <K extends keyof Level['optimalSolution']>(
    field: K,
    value: Level['optimalSolution'][K]
  ) => {
    if (!editingLevel) return;
    setEditingLevel({
      ...editingLevel,
      optimalSolution: { ...editingLevel.optimalSolution, [field]: value },
    });
  };

  const addVulnerablePoint = () => {
    if (!editingLevel) return;
    const newVp: VulnerablePoint = {
      id: `vp-${Date.now()}`,
      name: '新脆弱点',
      description: '请填写描述',
    };
    setEditingLevel({
      ...editingLevel,
      artifact: {
        ...editingLevel.artifact,
        vulnerablePoints: [...editingLevel.artifact.vulnerablePoints, newVp],
      },
    });
  };

  const updateVulnerablePoint = (index: number, field: keyof VulnerablePoint, value: string) => {
    if (!editingLevel) return;
    const newVps = [...editingLevel.artifact.vulnerablePoints];
    newVps[index] = { ...newVps[index], [field]: value };
    setEditingLevel({
      ...editingLevel,
      artifact: { ...editingLevel.artifact, vulnerablePoints: newVps },
    });
  };

  const removeVulnerablePoint = (index: number) => {
    if (!editingLevel) return;
    const newVps = editingLevel.artifact.vulnerablePoints.filter((_, i) => i !== index);
    setEditingLevel({
      ...editingLevel,
      artifact: { ...editingLevel.artifact, vulnerablePoints: newVps },
    });
  };

  if (editingLevel) {
    return (
      <div className="min-h-screen bg-bg-cream py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={handleCancel} className="text-primary hover:text-primary-dark mb-6 flex items-center gap-2">
            <span>←</span>
            <span>返回列表</span>
          </button>

          <h1 className="text-2xl font-bold text-text-dark mb-6">
            {isCreating ? '新建关卡' : '编辑关卡'}
          </h1>

          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="font-semibold text-lg text-text-dark mb-4">基本信息</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">关卡名称</label>
                <input
                  type="text"
                  value={editingLevel.name}
                  onChange={e => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">关卡描述</label>
                <textarea
                  value={editingLevel.description}
                  onChange={e => updateField('description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">难度</label>
                  <select
                    value={editingLevel.difficulty}
                    onChange={e => updateField('difficulty', e.target.value as any)}
                    className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">运输距离</label>
                  <select
                    value={editingLevel.transportDistance}
                    onChange={e => updateField('transportDistance', e.target.value as any)}
                    className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="short">短途</option>
                    <option value="medium">中途</option>
                    <option value="long">长途</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">学习提示</label>
                <textarea
                  value={editingLevel.tips || ''}
                  onChange={e => updateField('tips', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="font-semibold text-lg text-text-dark mb-4">文物信息</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">文物名称</label>
                <input
                  type="text"
                  value={editingLevel.artifact.name}
                  onChange={e => updateArtifact('name', e.target.value)}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">材质</label>
                  <select
                    value={editingLevel.artifact.material}
                    onChange={e => updateArtifact('material', e.target.value as any)}
                    className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="pottery">陶器</option>
                    <option value="wood">木器</option>
                    <option value="metal">金属器</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">尺寸</label>
                  <select
                    value={editingLevel.artifact.size}
                    onChange={e => updateArtifact('size', e.target.value as any)}
                    className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="small">小</option>
                    <option value="medium">中</option>
                    <option value="large">大</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">重量(kg)</label>
                  <input
                    type="number"
                    value={editingLevel.artifact.weight}
                    onChange={e => updateArtifact('weight', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">文物描述</label>
                <textarea
                  value={editingLevel.artifact.description}
                  onChange={e => updateArtifact('description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text-dark">脆弱点</label>
                  <button
                    onClick={addVulnerablePoint}
                    className="text-sm text-primary hover:text-primary-dark"
                  >
                    + 添加
                  </button>
                </div>
                <div className="space-y-2">
                  {editingLevel.artifact.vulnerablePoints.map((vp, index) => (
                    <div key={vp.id} className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={vp.name}
                        onChange={e => updateVulnerablePoint(index, 'name', e.target.value)}
                        placeholder="名称"
                        className="flex-1 px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <input
                        type="text"
                        value={vp.description}
                        onChange={e => updateVulnerablePoint(index, 'description', e.target.value)}
                        placeholder="描述"
                        className="flex-1 px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <button
                        onClick={() => removeVulnerablePoint(index)}
                        className="text-red-500 hover:text-red-700 px-2 py-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="font-semibold text-lg text-text-dark mb-4">正确答案（最优方案）</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">内衬材料</label>
                <select
                  value={editingLevel.optimalSolution.liner}
                  onChange={e => updateOptimalSolution('liner', e.target.value as any)}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {Object.entries(linerMaterials).map(([key, mat]) => (
                    <option key={key} value={key}>{mat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">固定方式</label>
                <select
                  value={editingLevel.optimalSolution.fixing}
                  onChange={e => updateOptimalSolution('fixing', e.target.value as any)}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {Object.entries(fixingMaterials).map(([key, mat]) => (
                    <option key={key} value={key}>{mat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">干燥剂</label>
                <select
                  value={editingLevel.optimalSolution.desiccant}
                  onChange={e => updateOptimalSolution('desiccant', e.target.value as any)}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {Object.entries(desiccantTypes).map(([key, mat]) => (
                    <option key={key} value={key}>{mat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">箱体</label>
                <select
                  value={editingLevel.optimalSolution.box}
                  onChange={e => updateOptimalSolution('box', e.target.value as any)}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {Object.entries(boxTypes).map(([key, mat]) => (
                    <option key={key} value={key}>{mat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-text-dark mb-2">
                正确支撑点（用逗号分隔）
              </label>
              <input
                type="text"
                value={editingLevel.optimalSolution.supportPoints.join('、')}
                onChange={e =>
                  updateOptimalSolution(
                    'supportPoints',
                    e.target.value.split(/[,，、]/).map(s => s.trim()).filter(Boolean)
                  )
                }
                placeholder="如：底部、口沿、腹部"
                className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 border-2 border-border-light text-text-dark rounded-lg font-medium hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark"
            >
              保存关卡
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-cream py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <button onClick={onBack} className="text-primary hover:text-primary-dark mb-6 flex items-center gap-2">
          <span>←</span>
          <span>返回首页</span>
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-dark mb-2">教师管理面板</h1>
            <p className="text-text-muted">管理题库和关卡内容</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark"
          >
            + 新建关卡
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-border-light">
              <tr>
                <th className="text-left px-5 py-3 text-sm font-medium text-text-dark">关卡名称</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-text-dark">文物</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-text-dark">材质</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-text-dark">难度</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-text-dark">运输距离</th>
                <th className="text-right px-5 py-3 text-sm font-medium text-text-dark">操作</th>
              </tr>
            </thead>
            <tbody>
              {levels.map(level => (
                <tr key={level.id} className="border-b border-border-light last:border-b-0 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-text-dark">{level.name}</td>
                  <td className="px-5 py-3 text-text-muted">{level.artifact.name}</td>
                  <td className="px-5 py-3">
                    <span className="text-sm bg-bg-wood text-primary px-2 py-1 rounded">
                      {getMaterialLabel(level.artifact.material)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-sm px-2 py-1 rounded ${
                      level.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      level.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {level.difficulty === 'easy' ? '简单' : level.difficulty === 'medium' ? '中等' : '困难'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text-muted text-sm">
                    {getDistanceLabel(level.transportDistance)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleEdit(level)}
                      className="text-primary hover:text-primary-dark text-sm mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(level.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {levels.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-text-muted">
                    暂无关卡，点击"新建关卡"开始添加
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
