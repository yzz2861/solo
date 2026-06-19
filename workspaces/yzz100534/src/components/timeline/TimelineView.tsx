import { useState } from 'react';
import { Clock, MessageSquare, Truck, ClipboardCheck, FileText, Plus, Edit2, Trash2 } from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { TimelineNodeType, EvidenceType } from '../../types';

const TimelineView = () => {
  const { currentCase, addTimelineNode, updateTimelineNode, removeTimelineNode, generateTimeline } = useCaseStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', time: new Date().toISOString().slice(0, 16) });

  const typeIcons: Record<TimelineNodeType | EvidenceType, typeof Clock> = {
    event: Clock,
    evidence: FileText,
    note: FileText,
    chat_screenshot: MessageSquare,
    logistics_photo: Truck,
    inspection_report: ClipboardCheck,
    customer_statement: FileText,
  };

  const typeColors: Record<TimelineNodeType | EvidenceType, string> = {
    event: 'bg-primary-500',
    evidence: 'bg-green-500',
    note: 'bg-yellow-500',
    chat_screenshot: 'bg-blue-500',
    logistics_photo: 'bg-orange-500',
    inspection_report: 'bg-purple-500',
    customer_statement: 'bg-teal-500',
  };

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const handleAddNode = () => {
    if (!formData.title.trim()) return;

    if (editingId) {
      updateTimelineNode(editingId, {
        title: formData.title,
        description: formData.description,
        time: new Date(formData.time),
      });
      setEditingId(null);
    } else {
      addTimelineNode({
        id: generateId(),
        caseId: currentCase.id,
        time: new Date(formData.time),
        title: formData.title,
        description: formData.description,
        evidenceIds: [],
        type: 'event',
      });
    }

    setFormData({ title: '', description: '', time: new Date().toISOString().slice(0, 16) });
    setShowAddForm(false);
  };

  const handleEdit = (node: typeof currentCase.timeline[0]) => {
    setEditingId(node.id);
    setFormData({
      title: node.title,
      description: node.description,
      time: new Date(node.time).toISOString().slice(0, 16),
    });
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({ title: '', description: '', time: new Date().toISOString().slice(0, 16) });
  };

  const getNodeIconColor = (node: typeof currentCase.timeline[0]) => {
    if (node.type === 'evidence' && node.evidenceIds.length > 0) {
      const evidence = currentCase.evidences.find(e => e.id === node.evidenceIds[0]);
      if (evidence) {
        return typeColors[evidence.type];
      }
    }
    return typeColors[node.type];
  };

  const getNodeIcon = (node: typeof currentCase.timeline[0]) => {
    if (node.type === 'evidence' && node.evidenceIds.length > 0) {
      const evidence = currentCase.evidences.find(e => e.id === node.evidenceIds[0]);
      if (evidence) {
        const Icon = typeIcons[evidence.type];
        return <Icon className="w-3 h-3 text-white" />;
      }
    }
    const Icon = typeIcons[node.type];
    return <Icon className="w-3 h-3 text-white" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-base font-semibold text-primary-900 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          证据时间线
          <span className="text-xs font-normal text-gray-500 ml-2">
            共 {currentCase.timeline.length} 个节点
          </span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={generateTimeline}
            className="btn-secondary text-xs"
          >
            自动生成
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary text-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            添加节点
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {currentCase.timeline.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-base mb-2">暂无时间线节点</p>
            <p className="text-sm">点击上方"自动生成"根据证据创建时间线</p>
            <p className="text-sm">或手动添加时间节点</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gray-200" />
            
            {currentCase.timeline.map((node, index) => (
              <div
                key={node.id}
                className="relative pl-12 pb-6 group animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={`absolute left-0 top-1 w-9 h-9 rounded-full flex items-center justify-center z-10 ${getNodeIconColor(node)}`}
                >
                  {getNodeIcon(node)}
                </div>

                <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        {format(new Date(node.time), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                      </div>
                      <h4 className="text-sm font-semibold text-gray-800">
                        {node.title}
                      </h4>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(node)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                        title="编辑"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => removeTimelineNode(node.id)}
                        className="p-1.5 hover:bg-red-50 rounded"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                  
                  {node.description && (
                    <p className="text-sm text-gray-600 mb-2">{node.description}</p>
                  )}

                  {node.evidenceIds.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">关联证据：</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {node.evidenceIds.map((evId) => {
                          const evidence = currentCase.evidences.find(e => e.id === evId);
                          if (!evidence) return null;
                          return (
                            <span
                              key={evId}
                              className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded"
                            >
                              {evidence.title}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-400">
                    来源：{node.type === 'evidence' ? '证据关联' : '手动添加'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 animate-slide-up">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingId ? '编辑时间节点' : '添加时间节点'}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  时间
                </label>
                <input
                  type="datetime-local"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标题
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入事件标题"
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
                  placeholder="输入事件描述（可选）"
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={handleCancel} className="btn-secondary">
                取消
              </button>
              <button onClick={handleAddNode} className="btn-primary">
                {editingId ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineView;
