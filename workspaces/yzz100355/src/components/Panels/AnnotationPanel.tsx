import { useState, useEffect, useMemo } from 'react';
import { Tag, Plus, Edit2, Trash2, Search, User, Clock, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAnnotationStore } from '@/store/useAnnotationStore';
import { useSceneStore } from '@/store/useSceneStore';
import { useDetection } from '@/hooks/useDetection';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/time';
import type { Annotation } from '@/types';

const annotationReasons = [
  '设备故障',
  '信号干扰',
  '障碍物阻挡',
  '人为干预',
  '程序异常',
  '电池不足',
  '误报',
  '其他原因',
];

const targetTypeLabels: { [key: string]: string } = {
  alarm: '告警',
  detection: '异常',
  point: '轨迹点',
};

export function AnnotationPanel() {
  const {
    annotations,
    isAnnotationMode,
    selectedAnnotationId,
    filter,
    searchQuery,
    actions: {
      addAnnotation,
      updateAnnotation,
      deleteAnnotation,
      toggleAnnotationMode,
      selectAnnotation,
      setFilter,
      setSearchQuery,
      getFilteredAnnotations,
    },
  } = useAnnotationStore();

  const { selectedShiftId, selectedAlarmId, selectedPointId } = useSceneStore();
  const { detections: detectionResults } = useDetection(selectedShiftId);

  const [showForm, setShowForm] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [formData, setFormData] = useState({
    reason: '',
    note: '',
    createdBy: '',
    targetId: '',
    targetType: 'detection' as 'alarm' | 'detection' | 'point',
  });

  useEffect(() => {
    const handleAnnotateEvent = (e: CustomEvent) => {
      const { detectionId, description } = e.detail;
      setFormData({
        reason: '',
        note: description || '',
        createdBy: '',
        targetId: detectionId,
        targetType: 'detection',
      });
      setShowForm(true);
      setEditingAnnotation(null);
    };

    window.addEventListener('annotate-detection', handleAnnotateEvent as EventListener);
    return () => {
      window.removeEventListener('annotate-detection', handleAnnotateEvent as EventListener);
    };
  }, []);

  const filteredAnnotations = useMemo(() => getFilteredAnnotations(), [
    annotations,
    filter,
    searchQuery,
    getFilteredAnnotations,
  ]);

  const groupedByTarget = useMemo(() => {
    const groups: { [key: string]: Annotation[] } = {};
    filteredAnnotations.forEach(a => {
      const key = `${a.targetType}-${a.targetId}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    return groups;
  }, [filteredAnnotations]);

  const getTargetDescription = (targetId: string, targetType: string) => {
    if (targetType === 'detection') {
      const detection = detectionResults.find((d: any) => d.id === targetId);
      return detection?.description || '未知异常';
    }
    if (targetType === 'alarm') {
      const selectedShift = useSceneStore.getState().actions.getSelectedShift();
      const alarm = selectedShift?.alarms.find(a => a.id === targetId);
      return alarm?.description || '未知告警';
    }
    return '轨迹点';
  };

  const handleSubmit = () => {
    if (!formData.reason.trim()) return;

    if (editingAnnotation) {
      updateAnnotation(editingAnnotation.id, {
        reason: formData.reason,
        note: formData.note,
        createdBy: formData.createdBy || '匿名',
      });
    } else {
      addAnnotation({
        targetId: formData.targetId,
        targetType: formData.targetType,
        reason: formData.reason,
        note: formData.note,
        createdBy: formData.createdBy || '匿名',
      });
    }

    setShowForm(false);
    setEditingAnnotation(null);
    setFormData({
      reason: '',
      note: '',
      createdBy: '',
      targetId: '',
      targetType: 'detection',
    });
  };

  const handleEdit = (annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setFormData({
      reason: annotation.reason,
      note: annotation.note,
      createdBy: annotation.createdBy,
      targetId: annotation.targetId,
      targetType: annotation.targetType,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除此标注吗？')) {
      deleteAnnotation(id);
    }
  };

  const handleNewAnnotation = () => {
    let targetId = '';
    let targetType: 'alarm' | 'detection' | 'point' = 'detection';

    if (selectedAlarmId) {
      targetId = selectedAlarmId;
      targetType = 'alarm';
    } else if (selectedPointId) {
      targetId = selectedPointId;
      targetType = 'point';
    }

    setFormData({
      reason: '',
      note: '',
      createdBy: '',
      targetId,
      targetType,
    });
    setEditingAnnotation(null);
    setShowForm(true);
  };

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg text-primary">手动标注</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAnnotationMode}
            className={cn(
              "px-2 py-1 rounded text-xs font-medium transition-colors",
              isAnnotationMode
                ? "bg-primary text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            )}
          >
            <Tag size={12} className="inline mr-1" />
            {isAnnotationMode ? '关闭标注' : '开启标注'}
          </button>
          <button
            onClick={handleNewAnnotation}
            className="px-2 py-1 rounded text-xs font-medium bg-success/20 text-success hover:bg-success/30 transition-colors"
          >
            <Plus size={12} className="inline mr-1" />
            新建
          </button>
        </div>
      </div>

      {isAnnotationMode && (
        <div className="mb-3 p-2 bg-primary/10 border border-primary/30 rounded text-xs text-primary">
          <AlertCircle size={12} className="inline mr-1" />
          标注模式已开启，点击异常或告警可添加标注
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="搜索标注..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
          />
        </div>
        <select
          value={filter.targetType || 'all'}
          onChange={(e) => setFilter({ targetType: e.target.value === 'all' ? undefined : e.target.value })}
          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-primary/50"
        >
          <option value="all">全部类型</option>
          <option value="alarm">告警</option>
          <option value="detection">异常</option>
          <option value="point">轨迹点</option>
        </select>
      </div>

      {showForm && (
        <div className="mb-4 p-3 bg-white/5 border border-primary/30 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white text-sm">
              {editingAnnotation ? '编辑标注' : '新建标注'}
            </h4>
            <button
              onClick={() => setShowForm(false)}
              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">目标类型</label>
              <select
                value={formData.targetType}
                onChange={(e) => setFormData({ ...formData, targetType: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-primary/50"
              >
                <option value="alarm">告警</option>
                <option value="detection">异常</option>
                <option value="point">轨迹点</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1">标注原因</label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-primary/50 mb-2"
              >
                <option value="">请选择原因</option>
                {annotationReasons.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="或输入自定义原因..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1">备注说明</label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="输入详细说明..."
                rows={2}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1">标注人</label>
              <input
                type="text"
                value={formData.createdBy}
                onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                placeholder="输入姓名..."
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!formData.reason.trim()}
                className="flex-1 px-3 py-1.5 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCircle2 size={14} className="inline mr-1" />
                {editingAnnotation ? '保存修改' : '添加标注'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 bg-white/10 text-white/70 rounded text-sm hover:bg-white/20 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredAnnotations.length === 0 ? (
        <div className="text-center py-8 text-white/50">
          <Tag size={32} className="mx-auto mb-2 opacity-50" />
          <p>暂无标注记录</p>
          <p className="text-xs mt-1">点击"新建"添加第一个标注</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
          {Object.entries(groupedByTarget).map(([key, items]) => {
            const [targetType, targetId] = key.split('-');
            const description = getTargetDescription(targetId, targetType);
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span className="px-1.5 py-0.5 bg-white/10 rounded">
                    {targetTypeLabels[targetType] || targetType}
                  </span>
                  <span className="truncate flex-1">{description}</span>
                  <span className="text-white/40">{items.length}条</span>
                </div>
                {items.map((annotation) => (
                  <div
                    key={annotation.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer",
                      selectedAnnotationId === annotation.id
                        ? "border-primary/50 bg-primary/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    )}
                    onClick={() => selectAnnotation(annotation.id)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded">
                        {annotation.reason}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(annotation);
                          }}
                          className="p-1 rounded text-white/30 hover:text-white hover:bg-white/10"
                          title="编辑"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(annotation.id, e)}
                          className="p-1 rounded text-white/30 hover:text-danger hover:bg-danger/10"
                          title="删除"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {annotation.note && (
                      <p className="text-sm text-white/70 mb-2">{annotation.note}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        {annotation.createdBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatDateTime(annotation.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/40">
        共 {filteredAnnotations.length} 条标注记录
      </div>
    </div>
  );
}
