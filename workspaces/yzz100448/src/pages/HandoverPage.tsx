import { useState } from 'react';
import { Handshake, User, Clock, CheckCircle2, AlertTriangle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDateTime, getTodayDateString } from '../utils/dateUtils';

export default function HandoverPage() {
  const { handovers, addHandover, reviewHandover, currentUser, visitors } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    toPerson: '',
    notes: '',
    pendingItems: [] as string[],
    newItem: '',
  });

  const today = getTodayDateString();
  const todayVisitors = visitors.filter((v) => v.visitDate === today && v.status !== 'checked_out');
  
  const pendingCount = todayVisitors.filter((v) => v.status === 'pending').length;
  const arrivedCount = todayVisitors.filter((v) => v.status === 'arrived').length;
  const overdueCount = todayVisitors.filter((v) => v.status === 'overdue').length;

  const autoPendingItems = [
    pendingCount > 0 ? `还有 ${pendingCount} 辆车待到场` : null,
    arrivedCount > 0 ? `场内有 ${arrivedCount} 辆车待离场` : null,
    overdueCount > 0 ? `有 ${overdueCount} 辆车超时未离场` : null,
  ].filter(Boolean) as string[];

  const handleAddItem = () => {
    if (formData.newItem.trim()) {
      setFormData((prev) => ({
        ...prev,
        pendingItems: [...prev.pendingItems, prev.newItem.trim()],
        newItem: '',
      }));
    }
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      pendingItems: prev.pendingItems.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.toPerson.trim()) {
      alert('请输入接班人姓名');
      return;
    }

    const allPendingItems = [...autoPendingItems, ...formData.pendingItems];
    
    addHandover({
      handoverTime: new Date().toISOString(),
      fromPerson: currentUser?.name || '',
      toPerson: formData.toPerson.trim(),
      notes: formData.notes,
      pendingItems: allPendingItems,
    });

    setFormData({
      toPerson: '',
      notes: '',
      pendingItems: [],
      newItem: '',
    });
    setShowForm(false);
    alert('交接记录已保存！');
  };

  const sortedHandovers = [...handovers].sort((a, b) => 
    b.handoverTime.localeCompare(a.handoverTime)
  );

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">安保交接</h1>
          <p className="text-gray-500 mt-1">记录交接班事项，复核未处理事务</p>
        </div>

        {currentUser?.role === 'security' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-all shadow-lg shadow-accent-500/30"
          >
            <Plus size={20} />
            新建交接
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8 animate-fade-in-up">
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Handshake size={20} className="text-accent-500" />
            新建交接记录
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  交班人
                </label>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                  <User size={18} className="text-gray-400" />
                  <span className="font-medium text-gray-700">{currentUser?.name}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  接班人 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.toPerson}
                  onChange={(e) => setFormData((prev) => ({ ...prev, toPerson: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-accent-500 transition-colors"
                  placeholder="请输入接班人姓名"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                交接时间
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                <Clock size={18} className="text-gray-400" />
                <span className="font-medium text-gray-700">{formatDateTime(new Date())}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                待处理事项（自动识别）
              </label>
              {autoPendingItems.length > 0 ? (
                <div className="space-y-2">
                  {autoPendingItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
                      <span className="text-amber-700">{item}</span>
                      <span className="text-xs text-amber-500 ml-auto">自动添加</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  暂无自动识别的待处理事项
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                添加其他待处理事项
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.newItem}
                  onChange={(e) => setFormData((prev) => ({ ...prev, newItem: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-accent-500 transition-colors"
                  placeholder="输入待处理事项后按回车添加"
                />
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  添加
                </button>
              </div>

              {formData.pendingItems.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.pendingItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="ml-auto text-red-500 hover:text-red-600 text-sm"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注说明
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-accent-500 transition-colors resize-none"
                placeholder="可选填其他需要说明的事项"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-lg border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-lg bg-accent-500 text-white font-medium hover:bg-accent-600 transition-colors flex items-center justify-center gap-2"
              >
                <Handshake size={18} />
                确认交接
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {sortedHandovers.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center text-gray-400">
            <Handshake size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">暂无交接记录</p>
            <p className="text-sm mt-2">点击上方按钮创建第一条交接记录</p>
          </div>
        ) : (
          sortedHandovers.map((handover) => (
            <div
              key={handover.id}
              className={`bg-white rounded-2xl shadow-sm border transition-all ${
                handover.isReviewed
                  ? 'border-gray-100 opacity-75'
                  : 'border-accent-200 shadow-accent-50'
              }`}
            >
              <div
                className="p-6 cursor-pointer"
                onClick={() => setExpandedId(expandedId === handover.id ? null : handover.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      handover.isReviewed
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-accent-100 text-accent-600'
                    }`}>
                      {handover.isReviewed ? (
                        <CheckCircle2 size={24} />
                      ) : (
                        <AlertTriangle size={24} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-800">
                          {handover.fromPerson} → {handover.toPerson}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          handover.isReviewed
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {handover.isReviewed ? '已复核' : '待复核'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDateTime(new Date(handover.handoverTime))}
                      </p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    {expandedId === handover.id ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </button>
                </div>

                {handover.pendingItems.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {handover.pendingItems.slice(0, 3).map((item, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
                      >
                        {item}
                      </span>
                    ))}
                    {handover.pendingItems.length > 3 && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                        +{handover.pendingItems.length - 3} 更多
                      </span>
                    )}
                  </div>
                )}
              </div>

              {expandedId === handover.id && (
                <div className="px-6 pb-6 border-t border-gray-100 pt-4 animate-fade-in">
                  <h4 className="font-medium text-gray-700 mb-3">待处理事项清单</h4>
                  <div className="space-y-2 mb-4">
                    {handover.pendingItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg"
                      >
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          handover.isReviewed
                            ? 'border-green-500 bg-green-500'
                            : 'border-gray-300'
                        }`}>
                          {handover.isReviewed && (
                            <CheckCircle2 size={14} className="text-white" />
                          )}
                        </span>
                        <span className={handover.isReviewed ? 'text-gray-400 line-through' : 'text-gray-700'}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>

                  {handover.notes && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2">备注说明</h4>
                      <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-600">
                        {handover.notes}
                      </div>
                    </div>
                  )}

                  {!handover.isReviewed && currentUser?.role === 'security' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('确认已复核所有事项？')) {
                          reviewHandover(handover.id);
                        }
                      }}
                      className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} />
                      确认复核
                    </button>
                  )}

                  {handover.isReviewed && handover.reviewedAt && (
                    <div className="text-sm text-gray-400 text-center">
                      已于 {formatDateTime(new Date(handover.reviewedAt))} 完成复核
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
