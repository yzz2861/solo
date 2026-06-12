import { useState, useRef } from "react";
import { 
  ClipboardList, 
  Calendar, 
  TreePine, 
  Camera, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Search,
  Filter,
  Upload,
  Image as ImageIcon,
  ChevronRight,
  MapPin
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useAppStore } from "../store/useAppStore";
import { determinePruningSide, generatePhotoRequirements } from "../utils/landscapeScorer";
import { fileToDataUrl, resizeImage } from "../utils/exportUtils";

export function TasksPage() {
  const { tasks, trees, user, role, updateTaskStatus, uploadPhoto, recheckRecords } = useAppStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusConfig = {
    pending: { 
      label: "待执行", 
      color: "bg-gray-100 text-gray-700",
      icon: Clock
    },
    in_progress: { 
      label: "进行中", 
      color: "bg-sky-100 text-sky-700",
      icon: Clock
    },
    completed: { 
      label: "已完成", 
      color: "bg-green-100 text-green-700",
      icon: CheckCircle
    },
    needs_review: { 
      label: "待复查", 
      color: "bg-warning-100 text-warning-700",
      icon: AlertTriangle
    },
  };

  const filteredTasks = tasks.filter((task) => {
    const tree = trees.find((t) => t.id === task.treeId);
    const matchesSearch = tree?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tree?.species.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesAssignee = role === "gardener" 
      ? task.assignee === user?.id 
      : true;
    return matchesSearch && matchesStatus && matchesAssignee && tree;
  });

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateTaskStatus(taskId, newStatus as any);
  };

  const handlePhotoUpload = async (taskId: string, photoType: "before" | "after" | "recheck") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          const dataUrl = await fileToDataUrl(file);
          const resized = await resizeImage(dataUrl, 1200, 1200);
          const notes = prompt("请输入照片备注（可选）：");
          uploadPhoto(taskId, resized, photoType, notes || undefined);
          alert("照片上传成功！");
        } catch (error) {
          alert("照片上传失败，请重试");
        }
      }
    };
    
    input.click();
  };

  const stats = {
    total: tasks.filter(t => role === "gardener" ? t.assignee === user?.id : true).length,
    pending: tasks.filter(t => t.status === "pending" && (role === "gardener" ? t.assignee === user?.id : true)).length,
    completed: tasks.filter(t => t.status === "completed" && (role === "gardener" ? t.assignee === user?.id : true)).length,
    needsReview: tasks.filter(t => t.status === "needs_review" && (role === "gardener" ? t.assignee === user?.id : true)).length,
  };

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">任务执行</h2>
          <p className="text-sm text-gray-500 mt-1">查看修剪任务，上传照片，更新任务状态</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>今天是 {format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN })}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-sm text-gray-500">总任务数</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-sky-600" />
            </div>
            <span className="text-sm text-gray-500">待执行</span>
          </div>
          <p className="text-3xl font-bold text-sky-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">已完成</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning-600" />
            </div>
            <span className="text-sm text-gray-500">待复查</span>
          </div>
          <p className="text-3xl font-bold text-warning-600">{stats.needsReview}</p>
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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest-500"
          >
            <option value="all">全部状态</option>
            <option value="pending">待执行</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
            <option value="needs_review">待复查</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-card">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">暂无任务</h3>
            <p className="text-gray-500">当前没有可执行的修剪任务</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTasks.map((task) => {
              const tree = trees.find((t) => t.id === task.treeId);
              if (!tree) return null;

              const pruningSide = determinePruningSide(tree, task.pruningBox);
              const photoReq = generatePhotoRequirements(tree, pruningSide);
              const status = statusConfig[task.status];
              const StatusIcon = status.icon;
              const isExpanded = selectedTask === task.id;
              const taskRecheckRecords = recheckRecords.filter(r => r.taskId === task.id);

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl shadow-card transition-all ${
                    isExpanded ? "ring-2 ring-forest-500" : "hover:shadow-lg"
                  }`}
                >
                  <div 
                    className="p-5 cursor-pointer"
                    onClick={() => setSelectedTask(isExpanded ? null : task.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-forest-100 to-forest-200 rounded-xl flex items-center justify-center">
                          <TreePine className="w-6 h-6 text-forest-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-800">{tree.code}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color} flex items-center gap-1`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{tree.species} · {pruningSide}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">复查日期</p>
                          <p className="text-sm font-medium text-gray-800">
                            {format(new Date(task.recheckDate), "yyyy-MM-dd", { locale: zhCN })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">位置</p>
                          <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            X:{tree.positionX.toFixed(1)} Z:{tree.positionZ.toFixed(1)}
                          </p>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">行人净空</p>
                          <p className="text-sm font-medium text-gray-800">
                            {(task.pruningBox.position[1] - task.pruningBox.size[1] / 2).toFixed(1)} m
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">修剪体积</p>
                          <p className="text-sm font-medium text-gray-800">
                            {(task.pruningBox.size[0] * task.pruningBox.size[1] * task.pruningBox.size[2]).toFixed(1)} m³
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">创建时间</p>
                          <p className="text-sm font-medium text-gray-800">
                            {format(new Date(task.createdAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-forest-50 rounded-lg border border-forest-100 mb-4">
                        <p className="text-xs text-forest-600 mb-1 font-medium">照片要求</p>
                        <p className="text-sm text-forest-800">{photoReq}</p>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">照片上传</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center hover:border-forest-400 transition-colors cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); handlePhotoUpload(task.id, "before"); }}
                          >
                            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                              <Camera className="w-5 h-5 text-warning-600" />
                            </div>
                            <p className="text-xs font-medium text-gray-700">修剪前照片</p>
                            {task.photos.filter(p => p.type === "before").length > 0 && (
                              <div className="mt-2 flex items-center justify-center gap-1 text-green-600">
                                <ImageIcon className="w-3 h-3" />
                                <span className="text-xs">已上传 {task.photos.filter(p => p.type === "before").length} 张</span>
                              </div>
                            )}
                          </div>
                          <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center hover:border-forest-400 transition-colors cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); handlePhotoUpload(task.id, "after"); }}
                          >
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                              <Camera className="w-5 h-5 text-green-600" />
                            </div>
                            <p className="text-xs font-medium text-gray-700">修剪后照片</p>
                            {task.photos.filter(p => p.type === "after").length > 0 && (
                              <div className="mt-2 flex items-center justify-center gap-1 text-green-600">
                                <ImageIcon className="w-3 h-3" />
                                <span className="text-xs">已上传 {task.photos.filter(p => p.type === "after").length} 张</span>
                              </div>
                            )}
                          </div>
                          <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center hover:border-forest-400 transition-colors cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); handlePhotoUpload(task.id, "recheck"); }}
                          >
                            <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                              <Camera className="w-5 h-5 text-sky-600" />
                            </div>
                            <p className="text-xs font-medium text-gray-700">复查照片</p>
                            {task.photos.filter(p => p.type === "recheck").length > 0 && (
                              <div className="mt-2 flex items-center justify-center gap-1 text-green-600">
                                <ImageIcon className="w-3 h-3" />
                                <span className="text-xs">已上传 {task.photos.filter(p => p.type === "recheck").length} 张</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {taskRecheckRecords.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">复查记录</p>
                          <div className="space-y-2">
                            {taskRecheckRecords.map((record) => (
                              <div key={record.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-700">
                                    {format(new Date(record.recheckDate), "yyyy-MM-dd", { locale: zhCN })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {record.isRainReview && (
                                    <span className="px-2 py-0.5 bg-sky-100 text-sky-600 text-xs rounded">雨后复查</span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded text-xs ${record.passed ? "bg-green-100 text-green-600" : "bg-warning-100 text-warning-600"}`}>
                                    {record.passed ? "通过" : "需返工"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {task.status === "pending" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, "in_progress"); }}
                            className="flex-1 btn-primary"
                          >
                            开始执行
                          </button>
                        )}
                        {task.status === "in_progress" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, "completed"); }}
                            className="flex-1 btn-primary"
                          >
                            标记完成（等待复查）
                          </button>
                        )}
                        {task.status === "needs_review" && role !== "gardener" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, "completed"); }}
                            className="flex-1 btn-primary"
                          >
                            复查通过
                          </button>
                        )}
                        {task.status === "completed" && role !== "gardener" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, "needs_review"); }}
                            className="flex-1 btn-secondary"
                          >
                            标记需返工
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
