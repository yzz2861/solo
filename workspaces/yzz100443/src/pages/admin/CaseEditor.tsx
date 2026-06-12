import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { caseApi } from '../../services/api';
import { FRAUD_TYPE_LABELS, type FraudType, type Dialogue, type Option } from '../../../shared/types';

export default function CaseEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [fraudType, setFraudType] = useState<FraudType>('fake_service');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [dialogues, setDialogues] = useState<Dialogue[]>([
    { id: 1, speaker: 'scammer', content: '', delay: 1500 },
  ]);
  const [options, setOptions] = useState<Option[]>([
    { id: 'a', text: '', isCorrect: false, feedback: { title: '', content: '', explanation: '' } },
    { id: 'b', text: '', isCorrect: true, feedback: { title: '', content: '', explanation: '' } },
  ]);
  const [warningPoints, setWarningPoints] = useState<string[]>(['']);

  useEffect(() => {
    if (isEdit) {
      loadCase();
    }
  }, [id]);

  const loadCase = async () => {
    try {
      const data = await caseApi.get(parseInt(id!, 10));
      setTitle(data.title);
      setFraudType(data.fraudType);
      setDescription(data.description);
      setDifficulty(data.difficulty);
      setDialogues(data.dialogues);
      setOptions(data.options);
      setWarningPoints(data.warningPoints?.length > 0 ? data.warningPoints : ['']);
    } catch (err) {
      alert('加载案例失败');
      navigate('/admin/cases');
    } finally {
      setLoading(false);
    }
  };

  const addDialogue = () => {
    const newId = Math.max(...dialogues.map((d) => d.id), 0) + 1;
    setDialogues([...dialogues, { id: newId, speaker: 'scammer', content: '', delay: 1500 }]);
  };

  const updateDialogue = (index: number, field: keyof Dialogue, value: any) => {
    const newDialogues = [...dialogues];
    (newDialogues[index] as any)[field] = value;
    setDialogues(newDialogues);
  };

  const removeDialogue = (index: number) => {
    if (dialogues.length <= 1) return;
    setDialogues(dialogues.filter((_, i) => i !== index));
  };

  const addOption = () => {
    const newId = String.fromCharCode(97 + options.length);
    setOptions([
      ...options,
      {
        id: newId,
        text: '',
        isCorrect: false,
        feedback: { title: '', content: '', explanation: '' },
      },
    ]);
  };

  const updateOption = (index: number, field: string, value: any) => {
    const newOptions = [...options];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      (newOptions[index] as any)[parent][child] = value;
    } else {
      (newOptions[index] as any)[field] = value;
    }
    setOptions(newOptions);
  };

  const setCorrectOption = (index: number) => {
    const newOptions = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateWarningPoint = (index: number, value: string) => {
    const newPoints = [...warningPoints];
    newPoints[index] = value;
    setWarningPoints(newPoints);
  };

  const addWarningPoint = () => {
    setWarningPoints([...warningPoints, '']);
  };

  const removeWarningPoint = (index: number) => {
    if (warningPoints.length <= 1) return;
    setWarningPoints(warningPoints.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('请填写案例标题');
      return;
    }
    if (!dialogues.some((d) => d.content.trim())) {
      alert('请至少填写一段对话内容');
      return;
    }
    if (!options.some((o) => o.text.trim())) {
      alert('请填写选项内容');
      return;
    }
    if (!options.some((o) => o.isCorrect)) {
      alert('请设置一个正确选项');
      return;
    }

    setSaving(true);
    try {
      const caseData = {
        title: title.trim(),
        fraudType,
        description: description.trim(),
        difficulty,
        dialogues: dialogues.filter((d) => d.content.trim()),
        options: options.filter((o) => o.text.trim()),
        warningPoints: warningPoints.filter((p) => p.trim()),
      };

      if (isEdit) {
        await caseApi.update(parseInt(id!, 10), caseData);
      } else {
        await caseApi.create(caseData);
      }

      alert('保存成功');
      navigate('/admin/cases');
    } catch (err) {
      alert('保存失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/cases')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEdit ? '编辑案例' : '新建案例'}
          </h1>
          <p className="text-gray-500">添加本地真实改写的防诈骗案例</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-800">基本信息</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              案例标题 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="比如：客服说您的订单有问题"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                诈骗类型 *
              </label>
              <select
                value={fraudType}
                onChange={(e) => setFraudType(e.target.value as FraudType)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                {Object.entries(FRAUD_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                难度等级
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(parseInt(e.target.value, 10) as 1 | 2 | 3)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value={1}>简单（入门）</option>
                <option value={2}>中等</option>
                <option value={3}>困难（隐蔽）</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              场景描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
              placeholder="简要描述这个案例的场景..."
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">对话内容</h2>
            <button
              type="button"
              onClick={addDialogue}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              添加对话
            </button>
          </div>

          <div className="space-y-4">
            {dialogues.map((dialogue, index) => (
              <div key={dialogue.id} className="p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    第 {index + 1} 条消息
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDialogue(index)}
                    className="text-red-500 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">发送方</label>
                    <select
                      value={dialogue.speaker}
                      onChange={(e) => updateDialogue(index, 'speaker', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="scammer">骗子</option>
                      <option value="system">系统消息</option>
                      <option value="elderly">老人（用户）</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      延迟显示（毫秒）
                    </label>
                    <input
                      type="number"
                      value={dialogue.delay || 1500}
                      onChange={(e) => updateDialogue(index, 'delay', parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">消息内容</label>
                  <textarea
                    value={dialogue.content}
                    onChange={(e) => updateDialogue(index, 'content', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    placeholder="输入对话内容..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">选项设置</h2>
            <button
              type="button"
              onClick={addOption}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              添加选项
            </button>
          </div>

          <div className="space-y-4">
            {options.map((option, index) => (
              <div key={option.id} className="p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">
                      {option.id.toUpperCase()}
                    </span>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={option.isCorrect}
                        onChange={() => setCorrectOption(index)}
                      />
                      <span className="text-green-600 font-medium">正确答案</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="text-red-500 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">选项文字</label>
                  <textarea
                    value={option.text}
                    onChange={(e) => updateOption(index, 'text', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    placeholder="选项内容..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">反馈标题</label>
                    <input
                      type="text"
                      value={option.feedback.title}
                      onChange={(e) => updateOption(index, 'feedback.title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="比如：太棒了！"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">反馈副标题</label>
                    <input
                      type="text"
                      value={option.feedback.content}
                      onChange={(e) => updateOption(index, 'feedback.content', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="简要反馈..."
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    详细解释（解释哪句话不对劲）
                  </label>
                  <textarea
                    value={option.feedback.explanation}
                    onChange={(e) => updateOption(index, 'feedback.explanation', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    placeholder="详细解释这个选项为什么对/错，哪里不对劲..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">防骗要点</h2>
            <button
              type="button"
              onClick={addWarningPoint}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              添加要点
            </button>
          </div>

          <div className="space-y-3">
            {warningPoints.map((point, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={point}
                  onChange={(e) => updateWarningPoint(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder={`防骗要点 ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeWarningPoint(index)}
                  className="text-red-500 hover:text-red-600 p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/cases')}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-xl transition-colors"
          >
            <Save className="w-5 h-5" />
            {saving ? '保存中...' : '保存案例'}
          </button>
        </div>
      </form>
    </div>
  );
}
