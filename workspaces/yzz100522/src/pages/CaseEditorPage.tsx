import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Eye } from 'lucide-react';
import { useAdminStore } from '../stores';
import type { TrainingCase, Casualty, Resources, Difficulty, Scenario } from '../types';
import { getDifficultyLabel, getDifficultyColor, getScenarioLabel } from '../utils/scoring';
import { cn } from '../lib/utils';
import { generateId } from '../utils/storage';

export default function CaseEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { getCase, addCase, updateCase, loadData } = useAdminStore();
  const isEditing = !!id && id !== 'new';
  
  const [formData, setFormData] = useState<Partial<TrainingCase>>({
    name: '',
    description: '',
    difficulty: 'easy',
    scenario: 'daytime',
    casualties: [],
    resources: { stretchers: 3, medics: 4, ambulances: 2 },
    timeLimit: 300,
    specialEvents: [],
  });
  
  const [editingCasualty, setEditingCasualty] = useState<Casualty | null>(null);
  const [showCasualtyModal, setShowCasualtyModal] = useState(false);
  
  useEffect(() => {
    loadData();
    if (isEditing && id) {
      const caseData = getCase(id);
      if (caseData) {
        setFormData(caseData);
      }
    }
  }, [id]);
  
  const handleSave = () => {
    if (!formData.name?.trim()) {
      alert('请输入案例名称');
      return;
    }
    if (!formData.casualties || formData.casualties.length === 0) {
      alert('请至少添加一名伤员');
      return;
    }
    
    if (isEditing && id) {
      updateCase(id, formData);
    } else {
      addCase(formData as Omit<TrainingCase, 'id' | 'createdAt' | 'updatedAt'>);
    }
    
    navigate('/admin');
  };
  
  const handleAddCasualty = () => {
    setEditingCasualty({
      id: generateId('cas'),
      name: '',
      age: 30,
      gender: 'male',
      breathing: 'normal',
      bleeding: 'none',
      consciousness: 'alert',
      symptoms: [],
      injuryDescription: '',
      correctLevel: 'green',
      correctPriority: (formData.casualties?.length || 0) + 1,
      explanation: '',
      misjudgePoints: [],
    });
    setShowCasualtyModal(true);
  };
  
  const handleEditCasualty = (casualty: Casualty) => {
    setEditingCasualty({ ...casualty });
    setShowCasualtyModal(true);
  };
  
  const handleDeleteCasualty = (casualtyId: string) => {
    if (confirm('确定要删除这名伤员吗？')) {
      setFormData(prev => ({
        ...prev,
        casualties: prev.casualties?.filter(c => c.id !== casualtyId),
      }));
    }
  };
  
  const handleSaveCasualty = () => {
    if (!editingCasualty?.name.trim()) {
      alert('请输入伤员姓名');
      return;
    }
    
    const exists = formData.casualties?.some(c => c.id === editingCasualty.id);
    
    if (exists) {
      setFormData(prev => ({
        ...prev,
        casualties: prev.casualties?.map(c =>
          c.id === editingCasualty.id ? editingCasualty : c
        ),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        casualties: [...(prev.casualties || []), editingCasualty],
      }));
    }
    
    setShowCasualtyModal(false);
    setEditingCasualty(null);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          返回案例列表
        </button>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {isEditing ? '编辑案例' : '新建案例'}
        </h1>
        
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">基本信息</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  案例名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  placeholder="请输入案例名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  案例描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  rows={3}
                  placeholder="请描述案例背景和训练目标"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    难度
                  </label>
                  <div className="flex gap-2">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setFormData(prev => ({ ...prev, difficulty: diff }))}
                        className={cn(
                          'px-4 py-2 rounded-lg font-medium transition-all',
                          formData.difficulty === diff
                            ? getDifficultyColor(diff) + ' shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {getDifficultyLabel(diff)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    场景
                  </label>
                  <select
                    value={formData.scenario}
                    onChange={(e) => setFormData(prev => ({ ...prev, scenario: e.target.value as Scenario }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  >
                    <option value="daytime">白天</option>
                    <option value="night">夜间</option>
                    <option value="rainy">雨天</option>
                    <option value="crowded">拥挤</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  时间限制（秒）
                </label>
                <input
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  min={0}
                  placeholder="0表示不限时间"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">资源配置</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  担架数量
                </label>
                <input
                  type="number"
                  value={formData.resources?.stretchers || 0}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    resources: {
                      ...prev.resources!,
                      stretchers: parseInt(e.target.value) || 0,
                    },
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  医护人数
                </label>
                <input
                  type="number"
                  value={formData.resources?.medics || 0}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    resources: {
                      ...prev.resources!,
                      medics: parseInt(e.target.value) || 0,
                    },
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  救护车数量
                </label>
                <input
                  type="number"
                  value={formData.resources?.ambulances || 0}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    resources: {
                      ...prev.resources!,
                      ambulances: parseInt(e.target.value) || 0,
                    },
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  min={0}
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                伤员列表
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({formData.casualties?.length || 0} 名)
                </span>
              </h2>
              <button
                onClick={handleAddCasualty}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Plus size={18} />
                添加伤员
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.casualties?.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>还没有伤员，点击上方按钮添加</p>
                </div>
              )}
              
              {formData.casualties?.map((casualty, index) => (
                <div
                  key={casualty.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">{casualty.name}</p>
                      <p className="text-sm text-gray-500">
                        {casualty.age}岁 · {casualty.gender === 'male' ? '男' : '女'}
                        {casualty.hasChronicDisease && ' · 基础病'}
                        {casualty.isChild && ' · 儿童'}
                        {casualty.deniesInjury && ' · 否认伤情'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium',
                      casualty.correctLevel === 'red' && 'bg-red-100 text-red-600',
                      casualty.correctLevel === 'yellow' && 'bg-amber-100 text-amber-600',
                      casualty.correctLevel === 'green' && 'bg-emerald-100 text-emerald-600',
                      casualty.correctLevel === 'black' && 'bg-gray-800 text-white',
                    )}>
                      {casualty.correctLevel === 'red' && '红色'}
                      {casualty.correctLevel === 'yellow' && '黄色'}
                      {casualty.correctLevel === 'green' && '绿色'}
                      {casualty.correctLevel === 'black' && '黑色'}
                    </span>
                    <button
                      onClick={() => handleEditCasualty(casualty)}
                      className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteCasualty(casualty.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => navigate('/admin')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg font-medium"
            >
              <Save size={18} />
              保存案例
            </button>
          </div>
        </div>
      </div>
      
      {showCasualtyModal && editingCasualty && (
        <CasualtyEditorModal
          casualty={editingCasualty}
          onChange={setEditingCasualty}
          onSave={handleSaveCasualty}
          onCancel={() => {
            setShowCasualtyModal(false);
            setEditingCasualty(null);
          }}
        />
      )}
    </div>
  );
}

interface CasualtyEditorModalProps {
  casualty: Casualty;
  onChange: (casualty: Casualty) => void;
  onSave: () => void;
  onCancel: () => void;
}

function CasualtyEditorModal({ casualty, onChange, onSave, onCancel }: CasualtyEditorModalProps) {
  const updateField = <K extends keyof Casualty>(field: K, value: Casualty[K]) => {
    onChange({ ...casualty, [field]: value });
  };
  
  const [symptomInput, setSymptomInput] = useState('');
  
  const addSymptom = () => {
    if (symptomInput.trim()) {
      updateField('symptoms', [...casualty.symptoms, symptomInput.trim()]);
      setSymptomInput('');
    }
  };
  
  const removeSymptom = (index: number) => {
    updateField('symptoms', casualty.symptoms.filter((_, i) => i !== index));
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">
            {casualty.name || '新增伤员'}
          </h3>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
              <input
                type="text"
                value={casualty.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">年龄</label>
              <input
                type="number"
                value={casualty.age}
                onChange={(e) => updateField('age', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
              <select
                value={casualty.gender}
                onChange={(e) => updateField('gender', e.target.value as 'male' | 'female')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800 mb-3">生命体征</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">呼吸</label>
                <select
                  value={casualty.breathing}
                  onChange={(e) => updateField('breathing', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                >
                  <option value="normal">正常</option>
                  <option value="fast">急促</option>
                  <option value="slow">缓慢</option>
                  <option value="absent">停止</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">呼吸频率 (次/分)</label>
                <input
                  type="number"
                  value={casualty.respiratoryRate || ''}
                  onChange={(e) => updateField('respiratoryRate', parseInt(e.target.value) || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">出血</label>
                <select
                  value={casualty.bleeding}
                  onChange={(e) => updateField('bleeding', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                >
                  <option value="none">无出血</option>
                  <option value="minor">少量</option>
                  <option value="moderate">中等</option>
                  <option value="severe">大量</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">意识</label>
                <select
                  value={casualty.consciousness}
                  onChange={(e) => updateField('consciousness', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                >
                  <option value="alert">清醒</option>
                  <option value="verbal">呼之能应</option>
                  <option value="pain">对痛有反应</option>
                  <option value="unresponsive">无反应</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">脉搏</label>
                <select
                  value={casualty.pulse || ''}
                  onChange={(e) => updateField('pulse', (e.target.value || undefined) as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                >
                  <option value="">未测</option>
                  <option value="normal">正常</option>
                  <option value="fast">偏快</option>
                  <option value="weak">微弱</option>
                  <option value="absent">无</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">血氧饱和度 (%)</label>
                <input
                  type="number"
                  value={casualty.oxygenSaturation ?? ''}
                  onChange={(e) => updateField('oxygenSaturation', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">症状</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                placeholder="输入症状后按回车添加"
              />
              <button
                onClick={addSymptom}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {casualty.symptoms.map((symptom, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm"
                >
                  {symptom}
                  <button
                    onClick={() => removeSymptom(index)}
                    className="text-cyan-500 hover:text-cyan-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">伤情描述</label>
            <textarea
              value={casualty.injuryDescription}
              onChange={(e) => updateField('injuryDescription', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
              rows={2}
            />
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800 mb-3">特殊情况</h4>
            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={casualty.hasChronicDisease || false}
                  onChange={(e) => updateField('hasChronicDisease', e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-700">有基础病</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={casualty.isChild || false}
                  onChange={(e) => updateField('isChild', e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-700">儿童</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={casualty.deniesInjury || false}
                  onChange={(e) => updateField('deniesInjury', e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-700">否认伤情</span>
              </label>
            </div>
            
            {casualty.hasChronicDisease && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">基础病描述</label>
                <input
                  type="text"
                  value={casualty.chronicDiseaseDesc || ''}
                  onChange={(e) => updateField('chronicDiseaseDesc', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                  placeholder="如：高血压、糖尿病、冠心病"
                />
              </div>
            )}
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800 mb-3">正确答案</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分诊等级</label>
                <div className="flex gap-2">
                  {(['red', 'yellow', 'green', 'black'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => updateField('correctLevel', level)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        casualty.correctLevel === level && level === 'red' && 'bg-red-500 text-white shadow-md scale-105',
                        casualty.correctLevel === level && level === 'yellow' && 'bg-amber-500 text-white shadow-md scale-105',
                        casualty.correctLevel === level && level === 'green' && 'bg-emerald-500 text-white shadow-md scale-105',
                        casualty.correctLevel === level && level === 'black' && 'bg-gray-800 text-white shadow-md scale-105',
                        casualty.correctLevel !== level && 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {level === 'red' && '红'}
                      {level === 'yellow' && '黄'}
                      {level === 'green' && '绿'}
                      {level === 'black' && '黑'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">同等级优先级</label>
                <input
                  type="number"
                  value={casualty.correctPriority}
                  onChange={(e) => updateField('correctPriority', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                  min={1}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">分诊理由/解析</label>
              <textarea
                value={casualty.explanation}
                onChange={(e) => updateField('explanation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                rows={3}
                placeholder="详细说明为什么这个伤员应该被分为该等级"
              />
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
