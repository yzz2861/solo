import { useState } from "react";
import { 
  CalendarCheck, 
  Calendar, 
  TreePine, 
  CloudRain, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Clock,
  ChevronRight
} from "lucide-react";
import { format, addDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useAppStore } from "../store/useAppStore";

export function ReviewPage() {
  const { tasks, trees, recheckRecords, scheduleRainReview, users, role } = useAppStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    taskIds: [] as string[],
    assignee: "",
    notes: "雨后复查，检查树木倾斜和积水情况",
  });

  const needsReviewTasks = tasks.filter((t) => t.status === "needs_review");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const rainReviewTasks = tasks.filter((t) => 
    recheckRecords.some(r => r.taskId === t.id && r.isRainReview)
  );

  const gardeners = users.filter(u => u.role === "gardener");

  const filteredRecords = recheckRecords.filter((record) => {
    const tree = trees.find(t => tasks.find(task => task.id === record.taskId)?.treeId === t.id);
    const task = tasks.find(t => t.id === record.taskId);
    const matchesSearch = tree?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tree?.species.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || 
      (filterType === "rain" && record.isRainReview) ||
      (filterType === "pending" && !record.passed);
    return matchesSearch && matchesFilter && task;
  });

  const handleScheduleRainReview = () => {
    if (scheduleForm.taskIds.length === 0) {
      alert("请至少选择一个任务");
      return;
    }
    if (!scheduleForm.assignee) {
      alert("请选择复查人员");
      return;
    }
    
    scheduleRainReview(
      new Date(scheduleForm.date),
      scheduleForm.taskIds,
      scheduleForm.assignee
    );
    
    setShowScheduleModal(false);
    setScheduleForm({
      date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      taskIds: [],
      assignee: "",
      notes: "雨后复查，检查树木倾斜和积水情况",
    });
    alert("雨后复查任务已安排！");
  };

  const toggleTaskSelection = (taskId: string) => {
    setScheduleForm(prev => ({
      ...prev,
      taskIds: prev.taskIds.includes(taskId)
        ? prev.taskIds.filter(id => id !== taskId)
        : [...prev.taskIds, taskId]
    }));
  };

  const stats = {
    pending: needsReviewTasks.length,
    completed: recheckRecords.filter(r => r.passed).length,
    rainReviews: recheckRecords.filter(r => r.isRainReview).length,
    thisMonth: recheckRecords.filter(r => {
      const now = new Date();
      const recordDate = new Date(r.recheckDate);
      return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
    }).length,
  };

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">复查安排</h2>
          <p className="text-sm text-gray-500 mt-1">安排复查任务，管理雨后复查，跟踪复查进度</p>
        </div>
        {role !== "gardener" && (
          <button
            onClick={() => setShowScheduleModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            安排雨后复查
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning-600" />
            </div>
            <span className="text-sm text-gray-500">待复查</span>
          </div>
          <p className="text-3xl font-bold text-warning-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">已通过</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
              <CloudRain className="w-5 h-5 text-sky-600" />
            </div>
            <span className="text-sm text-gray-500">雨后复查</span>
          </div>
          <p className="text-3xl font-bold text-sky-600">{stats.rainReviews}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-forest-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-forest-600" />
            </div>
            <span className="text-sm text-gray-500">本月复查</span>
          </div>
          <p className="text-3xl font-bold text-forest-600">{stats.thisMonth}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索树木编号或树种..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest-500"
          >
            <option value="all">全部记录</option>
            <option value="rain">雨后复查</option>
            <option value="pending">待处理</option>
          </select>
        </div>
      </div>

      {needsReviewTasks.length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-warning-600" />
            <h3 className="font-semibold text-warning-800">待复查任务 ({needsReviewTasks.length})</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {needsReviewTasks.slice(0, 4).map((task) => {
              const tree = trees.find(t => t.id === task.treeId);
              if (!tree) return null;
              return (
                <div key={task.id} className="bg-white/80 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TreePine className="w-4 h-4 text-forest-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{tree.code}</p>
                      <p className="text-xs text-gray-500">{tree.species}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">复查日期</p>
                    <p className="text-sm font-medium text-warning-600">
                      {format(new Date(task.recheckDate), "MM-dd", { locale: zhCN })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-card">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarCheck className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">暂无复查记录</h3>
            <p className="text-gray-500">安排复查任务后将在这里显示</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRecords.map((record) => {
              const task = tasks.find(t => t.id === record.taskId);
              const tree = task ? trees.find(t => t.id === task.treeId) : null;
              const assignee = users.find(u => u.id === record.assigneeId);
              if (!task || !tree) return null;

              return (
                <div
                  key={record.id}
                  className="bg-white rounded-xl shadow-card p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        record.isRainReview 
                          ? "bg-gradient-to-br from-sky-100 to-sky-200" 
                          : "bg-gradient-to-br from-forest-100 to-forest-200"
                      }`}>
                        {record.isRainReview ? (
                          <CloudRain className="w-6 h-6 text-sky-600" />
                        ) : (
                          <CalendarCheck className="w-6 h-6 text-forest-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-800">{tree.code}</h3>
                          {record.isRainReview && (
                            <span className="px-2 py-0.5 bg-sky-100 text-sky-600 text-xs rounded font-medium">
                              雨后复查
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            record.passed 
                              ? "bg-green-100 text-green-700" 
                              : "bg-warning-100 text-warning-700"
                          }`}>
                            {record.passed ? "已通过" : "待处理"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{tree.species}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">复查日期</p>
                        <p className="text-sm font-medium text-gray-800">
                          {format(new Date(record.recheckDate), "yyyy-MM-dd", { locale: zhCN })}
                        </p>
                      </div>
                      {assignee && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">复查人员</p>
                          <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {assignee.name}
                          </p>
                        </div>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>

                  {record.notes && (
                    <div className="p-3 bg-gray-50 rounded-lg mb-3">
                      <p className="text-xs text-gray-500 mb-1">复查备注</p>
                      <p className="text-sm text-gray-700">{record.notes}</p>
                    </div>
                  )}

                  {task.photos.filter(p => p.type === "recheck").length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="flex -space-x-2">
                        {task.photos.filter(p => p.type === "recheck").slice(0, 3).map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo.dataUrl}
                            alt={`复查照片 ${idx + 1}`}
                            className="w-10 h-10 rounded-lg border-2 border-white object-cover"
                          />
                        ))}
                      </div>
                      <span>已上传 {task.photos.filter(p => p.type === "recheck").length} 张复查照片</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-sky-700 rounded-xl flex items-center justify-center">
                <CloudRain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">安排雨后复查</h3>
                <p className="text-sm text-gray-500">选择需要复查的任务和人员</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">复查日期</label>
                <input
                  type="date"
                  value={scheduleForm.date}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择任务 ({scheduleForm.taskIds.length} 个已选)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2">
                  {completedTasks.map((task) => {
                    const tree = trees.find(t => t.id === task.treeId);
                    if (!tree) return null;
                    const isSelected = scheduleForm.taskIds.includes(task.id);
                    return (
                      <label
                        key={task.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? "bg-sky-50 border border-sky-200" : "hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="w-4 h-4 text-sky-600 rounded"
                        />
                        <TreePine className="w-4 h-4 text-forest-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{tree.code}</p>
                          <p className="text-xs text-gray-500">{tree.species}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">复查人员</label>
                <select
                  value={scheduleForm.assignee}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, assignee: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-sky-500"
                >
                  <option value="">请选择复查人员</option>
                  {gardeners.map((gardener) => (
                    <option key={gardener.id} value={gardener.id}>
                      {gardener.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">备注说明</label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleScheduleRainReview}
                className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-xl font-medium hover:from-sky-600 hover:to-sky-700 transition-colors"
              >
                确认安排
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
