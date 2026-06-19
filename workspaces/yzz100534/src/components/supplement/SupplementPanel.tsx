import { useState } from 'react';
import { ListTodo, Plus, Trash2, Edit2, Eye, AlertTriangle, Lock, Calendar } from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { SEVERITY_LABELS, type Severity } from '../../types';
import SupplementPreview from './SupplementPreview';

const SupplementPanel = () => {
  const { currentCase, generateSupplements, addSupplement, removeSupplement, updateSupplement, setSupplementDeadline } = useCaseStore();
  const [showPreview, setShowPreview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Severity,
    questionToCustomer: '',
    internalNote: '',
    isSensitive: false,
  });
  const [deadlineInput, setDeadlineInput] = useState('');

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const handleGenerate = () => {
    generateSupplements();
  };

  const handleAddSupplement = () => {
    if (!formData.title.trim()) return;

    if (editingId) {
      updateSupplement(editingId, formData);
      setEditingId(null);
    } else {
      addSupplement({
        id: generateId(),
        caseId: currentCase.id,
        ...formData,
        deadline: currentCase.supplementDeadline,
        completed: false,
      });
    }

    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      questionToCustomer: '',
      internalNote: '',
      isSensitive: false,
    });
    setShowAddForm(false);
  };

  const handleEdit = (item: typeof currentCase.supplements[0]) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      description: item.description,
      priority: item.priority,
      questionToCustomer: item.questionToCustomer,
      internalNote: item.internalNote,
      isSensitive: item.isSensitive,
    });
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      questionToCustomer: '',
      internalNote: '',
      isSensitive: false,
    });
  };

  const handleDeadlineChange = (value: string) => {
    setDeadlineInput(value);
    if (value) {
      setSupplementDeadline(new Date(value));
    } else {
      setSupplementDeadline(undefined);
    }
  };

  const priorityColors: Record<Severity, string> = {
    high: 'tag-high',
    medium: 'tag-medium',
    low: 'tag-low',
  };

  const pendingCount = currentCase.supplements.filter(s => !s.completed).length;

  return (
    <div className="w-96 bg-white border-t border-gray-200 flex flex-col" style={{ height: '45%' }}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-base font-semibold text-primary-900 flex items-center gap-2">
          <ListTodo className="w-5 h-5" />
          补件清单
          <span className="text-xs font-normal text-gray-500 ml-1">
            ({pendingCount} 项待补充)
          </span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            className="btn-secondary text-xs"
          >
            自动生成
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="btn-primary text-xs flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            预览导出
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-600">补件截止日：</span>
            <input
              type="date"
              value={deadlineInput}
              onChange={(e) => handleDeadlineChange(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-300 rounded flex-1"
            />
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            添加
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin space-y-2">
        {currentCase.supplements.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm mb-1">暂无补件项</p>
            <p className="text-xs">点击"自动生成"根据检测结果创建</p>
          </div>
        ) : (
          currentCase.supplements.map((item, index) => (
            <div
              key={item.id}
              className={`border rounded p-3 group transition-all ${
                item.completed
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-sm'
              }`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`tag ${priorityColors[item.priority]}`}>
                    {SEVERITY_LABELS[item.priority]}
                  </span>
                  {item.isSensitive && (
                    <span className="tag bg-purple-100 text-purple-700 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" />
                      敏感
                    </span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="编辑"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button
                    onClick={() => removeSupplement(item.id)}
                    className="p-1 hover:bg-red-50 rounded"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
              
              <h4 className="text-sm font-medium text-gray-800 mb-1">
                {item.title}
              </h4>
              <p className="text-xs text-gray-600 mb-2">
                {item.description}
              </p>
              
              <div className="pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-1">
                  <span className="font-medium">补问客户：</span>
                  {item.questionToCustomer || '—'}
                </div>
                {item.internalNote && item.isSensitive && (
                  <div className="text-xs text-purple-600 bg-purple-50 p-1.5 rounded mt-1">
                    <span className="font-medium">内部备注：</span>
                    {item.internalNote}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 animate-slide-up">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingId ? '编辑补件项' : '添加补件项'}
              </h3>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标题
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入补件项标题"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="详细描述需要补充的内容"
                  rows={2}
                  className="input-field resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    优先级
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Severity })}
                    className="input-field"
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isSensitive}
                      onChange={(e) => setFormData({ ...formData, isSensitive: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">标记为敏感</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  补问客户的问题
                </label>
                <textarea
                  value={formData.questionToCustomer}
                  onChange={(e) => setFormData({ ...formData, questionToCustomer: e.target.value })}
                  placeholder="需要向客户确认或询问的问题"
                  rows={2}
                  className="input-field resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  内部备注
                  <span className="text-xs text-gray-400 font-normal ml-1">(仅内部可见)</span>
                </label>
                <textarea
                  value={formData.internalNote}
                  onChange={(e) => setFormData({ ...formData, internalNote: e.target.value })}
                  placeholder="内部处理意见或注意事项"
                  rows={2}
                  className="input-field resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={handleCancel} className="btn-secondary">
                取消
              </button>
              <button onClick={handleAddSupplement} className="btn-primary">
                {editingId ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && <SupplementPreview onClose={() => setShowPreview(false)} />}
    </div>
  );
};

export default SupplementPanel;
