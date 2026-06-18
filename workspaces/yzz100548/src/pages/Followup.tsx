import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  User,
  Phone,
  Home,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Repeat,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type {
  FollowupRecord,
  FollowupStatus,
  FollowupType,
} from "@/types";

const statusOptions: FollowupStatus[] = [
  "待跟进",
  "进行中",
  "已完成",
  "需持续跟进",
];

const typeOptions: FollowupType[] = ["面谈", "电话", "家访", "微信"];

const statusColors: Record<FollowupStatus, string> = {
  待跟进: "bg-warning-100 text-warning-600",
  进行中: "bg-primary-100 text-primary-600",
  已完成: "bg-success-100 text-success-600",
  需持续跟进: "bg-purple-100 text-purple-600",
};

const statusIcons: Record<FollowupStatus, React.ReactNode> = {
  待跟进: <Clock size={14} />,
  进行中: <PlayCircle size={14} />,
  已完成: <CheckCircle2 size={14} />,
  需持续跟进: <Repeat size={14} />,
};

const typeIcons: Record<FollowupType, React.ReactNode> = {
  面谈: <MessageSquare size={14} />,
  电话: <Phone size={14} />,
  家访: <Home size={14} />,
  微信: <MessageSquare size={14} />,
};

export default function FollowupPage() {
  const {
    parents,
    students,
    teachers,
    followupRecords,
    addFollowupRecord,
    updateFollowupRecord,
    deleteFollowupRecord,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<"all" | "pending" | "ongoing">(
    "all"
  );
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FollowupRecord | null>(
    null
  );
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    studentId: "",
    parentId: "",
    teacherId: "",
    status: "待跟进" as FollowupStatus,
    date: new Date().toISOString().split("T")[0],
    note: "",
    type: "电话" as FollowupType,
    nextPlanDate: "",
  });

  const needFollowupParents = parents.filter((p) => p.needFollowup);

  const getStudentName = (studentId: string) =>
    students.find((s) => s.id === studentId)?.name || "未知";

  const getTeacherName = (teacherId: string | null) =>
    teachers.find((t) => t.id === teacherId)?.name || "未分配";

  const getParentRecords = (parentId: string) =>
    followupRecords
      .filter((r) => r.parentId === parentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getLatestStatus = (parentId: string): FollowupStatus => {
    const records = getParentRecords(parentId);
    return records[0]?.status || "待跟进";
  };

  const filteredParents = needFollowupParents.filter((p) => {
    const status = getLatestStatus(p.id);
    if (activeTab === "pending") return status === "待跟进";
    if (activeTab === "ongoing")
      return status === "进行中" || status === "需持续跟进";
    return true;
  });

  const openModal = (parentId?: string, record?: FollowupRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        studentId: record.studentId,
        parentId: record.parentId,
        teacherId: record.teacherId || "",
        status: record.status,
        date: record.date,
        note: record.note,
        type: record.type,
        nextPlanDate: record.nextPlanDate || "",
      });
    } else if (parentId) {
      const parent = parents.find((p) => p.id === parentId);
      setEditingRecord(null);
      setFormData({
        studentId: parent?.studentId || "",
        parentId: parentId,
        teacherId: parent?.teacherId || "",
        status: "待跟进",
        date: new Date().toISOString().split("T")[0],
        note: "",
        type: "电话",
        nextPlanDate: "",
      });
    }
    setSelectedParentId(parentId || null);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.parentId || !formData.studentId) return;

    const recordData = {
      ...formData,
      teacherId: formData.teacherId || null,
    };

    if (editingRecord) {
      updateFollowupRecord(editingRecord.id, recordData);
    } else {
      addFollowupRecord(recordData);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("确定要删除这条跟进记录吗？")) {
      deleteFollowupRecord(id);
    }
  };

  const stats = {
    total: needFollowupParents.length,
    pending: needFollowupParents.filter(
      (p) => getLatestStatus(p.id) === "待跟进"
    ).length,
    ongoing: needFollowupParents.filter(
      (p) =>
        getLatestStatus(p.id) === "进行中" ||
        getLatestStatus(p.id) === "需持续跟进"
    ).length,
    completed: needFollowupParents.filter(
      (p) => getLatestStatus(p.id) === "已完成"
    ).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 font-serif">
            跟进管理
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            管理需要跟进的家庭，记录跟进进度和详情
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="需跟进家庭"
          value={stats.total}
          color="primary"
          icon={<AlertCircle size={20} />}
        />
        <StatCard
          label="待跟进"
          value={stats.pending}
          color="warning"
          icon={<Clock size={20} />}
        />
        <StatCard
          label="进行中"
          value={stats.ongoing}
          color="primary"
          icon={<PlayCircle size={20} />}
        />
        <StatCard
          label="已完成"
          value={stats.completed}
          color="success"
          icon={<CheckCircle2 size={20} />}
        />
      </div>

      <div className="flex gap-2 bg-white p-1.5 rounded-xl w-fit shadow-sm">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === "all"
              ? "bg-primary-500 text-white shadow"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === "pending"
              ? "bg-warning-500 text-white shadow"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          待跟进
        </button>
        <button
          onClick={() => setActiveTab("ongoing")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === "ongoing"
              ? "bg-primary-500 text-white shadow"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          进行中
        </button>
      </div>

      <div className="space-y-4">
        {filteredParents.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-success-500" />
            </div>
            <h3 className="text-lg font-medium text-neutral-800 mb-2">
              暂无需要跟进的家庭
            </h3>
            <p className="text-sm text-neutral-500">
              所有家庭跟进状态良好
            </p>
          </div>
        ) : (
          filteredParents.map((parent, index) => {
            const records = getParentRecords(parent.id);
            const status = getLatestStatus(parent.id);
            const isExpanded = expandedStudent === parent.id;

            return (
              <div
                key={parent.id}
                className="card overflow-hidden animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className="p-5 cursor-pointer hover:bg-neutral-50 transition-colors"
                  onClick={() =>
                    setExpandedStudent(isExpanded ? null : parent.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-warning-400 to-warning-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-warning-500/20">
                        {getStudentName(parent.studentId).charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-800">
                          {getStudentName(parent.studentId)}
                        </h3>
                        <p className="text-sm text-neutral-500">
                          {parent.name}（{parent.relation}）· {parent.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`badge ${statusColors[status]} flex items-center gap-1`}
                      >
                        {statusIcons[status]}
                        {status}
                      </span>
                      <span className="text-sm text-neutral-500">
                        {records.length} 条记录
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-neutral-400" />
                      ) : (
                        <ChevronDown size={20} className="text-neutral-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm text-neutral-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare size={14} />
                      {parent.topic}
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {getTeacherName(parent.teacherId)}
                    </span>
                    {parent.specialNote && (
                      <span className="text-warning-600">
                        备注：{parent.specialNote}
                      </span>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-neutral-100 bg-neutral-50 p-5 animate-slide-up">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-neutral-700">
                        跟进记录
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(parent.id);
                        }}
                        className="btn-primary text-sm py-1.5"
                      >
                        <Plus size={16} />
                        添加记录
                      </button>
                    </div>

                    {records.length === 0 ? (
                      <p className="text-sm text-neutral-400 text-center py-4">
                        暂无跟进记录
                      </p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-neutral-200" />
                        <div className="space-y-4">
                          {records.map((record, idx) => (
                            <div
                              key={record.id}
                              className="relative pl-8"
                            >
                              <div
                                className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${
                                  statusColors[record.status]
                                }`}
                              >
                                {statusIcons[record.status]}
                              </div>
                              <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`badge ${statusColors[record.status]}`}
                                    >
                                      {record.status}
                                    </span>
                                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                                      {typeIcons[record.type]}
                                      {record.type}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openModal(parent.id, record);
                                      }}
                                      className="p-1 text-neutral-400 hover:text-primary-500"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(record.id);
                                      }}
                                      className="p-1 text-neutral-400 hover:text-danger-500"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-sm text-neutral-700">
                                  {record.note}
                                </p>
                                <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    {record.date}
                                  </span>
                                  <span>
                                    老师：{getTeacherName(record.teacherId)}
                                  </span>
                                  {record.nextPlanDate && (
                                    <span className="text-warning-600 flex items-center gap-1">
                                      <Clock size={12} />
                                      下次：{record.nextPlanDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4 font-serif">
              {editingRecord ? "编辑跟进记录" : "添加跟进记录"}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    跟进日期
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    跟进方式
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as FollowupType,
                      })
                    }
                    className="select"
                  >
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  跟进状态
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as FollowupStatus,
                    })
                  }
                  className="select"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  负责老师
                </label>
                <select
                  value={formData.teacherId}
                  onChange={(e) =>
                    setFormData({ ...formData, teacherId: e.target.value })
                  }
                  className="select"
                >
                  <option value="">未分配</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}（{t.subject}）
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  跟进内容
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  className="input min-h-[120px]"
                  placeholder="请详细记录本次跟进的内容和结果..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  下次计划日期
                </label>
                <input
                  type="date"
                  value={formData.nextPlanDate}
                  onChange={(e) =>
                    setFormData({ ...formData, nextPlanDate: e.target.value })
                  }
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button onClick={handleSave} className="btn-primary">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: "primary" | "success" | "warning" | "danger";
  icon: React.ReactNode;
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  const colorClasses = {
    primary: "bg-primary-50 text-primary-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    danger: "bg-danger-50 text-danger-600",
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}
        >
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-neutral-800">{value}</div>
          <div className="text-xs text-neutral-500">{label}</div>
        </div>
      </div>
    </div>
  );
}
