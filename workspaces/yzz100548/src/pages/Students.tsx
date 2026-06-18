import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  User,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UserPlus,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type {
  Parent,
  Student,
  Teacher,
  ParentRelation,
  TopicType,
} from "@/types";

const relations: ParentRelation[] = [
  "父亲",
  "母亲",
  "爷爷",
  "奶奶",
  "外公",
  "外婆",
  "其他",
];

const topics: TopicType[] = [
  "学习习惯",
  "同伴关系",
  "心理健康",
  "学业成绩",
  "综合发展",
  "其他",
];

export default function StudentsPage() {
  const {
    students,
    parents,
    teachers,
    addStudent,
    updateStudent,
    deleteStudent,
    addParent,
    updateParent,
    deleteParent,
    addTeacher,
    updateTeacher,
    deleteTeacher,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<"students" | "teachers">(
    "students"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showParentModal, setShowParentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );

  const [studentForm, setStudentForm] = useState({
    name: "",
    className: "三年级(1)班",
    grade: "三年级",
  });

  const [teacherForm, setTeacherForm] = useState({
    name: "",
    subject: "",
    maxGroups: 2,
  });

  const [parentForm, setParentForm] = useState<Omit<Parent, "id">>({
    studentId: "",
    name: "",
    relation: "父亲",
    phone: "",
    attended: true,
    topic: "学习习惯",
    specialNote: "",
    teacherId: null,
    needFollowup: false,
    groupId: null,
  });

  const filteredStudents = students.filter(
    (s) =>
      s.name.includes(searchQuery) ||
      parents.some(
        (p) => p.studentId === s.id && p.name.includes(searchQuery)
      )
  );

  const openStudentModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setStudentForm({
        name: student.name,
        className: student.className,
        grade: student.grade,
      });
    } else {
      setEditingStudent(null);
      setStudentForm({ name: "", className: "三年级(1)班", grade: "三年级" });
    }
    setShowStudentModal(true);
  };

  const openTeacherModal = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setTeacherForm({
        name: teacher.name,
        subject: teacher.subject,
        maxGroups: teacher.maxGroups,
      });
    } else {
      setEditingTeacher(null);
      setTeacherForm({ name: "", subject: "", maxGroups: 2 });
    }
    setShowTeacherModal(true);
  };

  const openParentModal = (studentId: string, parent?: Parent) => {
    if (parent) {
      setEditingParent(parent);
      setParentForm(parent);
    } else {
      setEditingParent(null);
      setParentForm({
        studentId,
        name: "",
        relation: "父亲",
        phone: "",
        attended: true,
        topic: "学习习惯",
        specialNote: "",
        teacherId: null,
        needFollowup: false,
        groupId: null,
      });
    }
    setSelectedStudentId(studentId);
    setShowParentModal(true);
  };

  const handleSaveStudent = () => {
    if (!studentForm.name.trim()) return;
    if (editingStudent) {
      updateStudent(editingStudent.id, studentForm);
    } else {
      addStudent(studentForm);
    }
    setShowStudentModal(false);
  };

  const handleSaveTeacher = () => {
    if (!teacherForm.name.trim()) return;
    if (editingTeacher) {
      updateTeacher(editingTeacher.id, teacherForm);
    } else {
      addTeacher(teacherForm);
    }
    setShowTeacherModal(false);
  };

  const handleSaveParent = () => {
    if (!parentForm.name.trim()) return;
    if (editingParent) {
      updateParent(editingParent.id, parentForm);
    } else {
      addParent(parentForm);
    }
    setShowParentModal(false);
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm("确定要删除该学生及其家长信息吗？")) {
      deleteStudent(id);
    }
  };

  const handleDeleteParent = (id: string) => {
    if (confirm("确定要删除该家长信息吗？")) {
      deleteParent(id);
    }
  };

  const handleDeleteTeacher = (id: string) => {
    if (confirm("确定要删除该老师吗？")) {
      deleteTeacher(id);
    }
  };

  const getStudentParents = (studentId: string) =>
    parents.filter((p) => p.studentId === studentId);

  const getTeacherName = (teacherId: string | null) =>
    teachers.find((t) => t.id === teacherId)?.name || "未分配";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 font-serif">
            信息录入
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            管理学生、家长和老师的基本信息
          </p>
        </div>
      </div>

      <div className="flex gap-2 bg-white p-1.5 rounded-xl w-fit shadow-sm">
        <button
          onClick={() => setActiveTab("students")}
          className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === "students"
              ? "bg-primary-500 text-white shadow"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          学生与家长
        </button>
        <button
          onClick={() => setActiveTab("teachers")}
          className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === "teachers"
              ? "bg-primary-500 text-white shadow"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          负责老师
        </button>
      </div>

      {activeTab === "students" ? (
        <>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                placeholder="搜索学生或家长姓名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
            <button onClick={() => openStudentModal()} className="btn-primary">
              <Plus size={18} />
              添加学生
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStudents.map((student, index) => {
              const studentParents = getStudentParents(student.id);
              return (
                <div
                  key={student.id}
                  className="card p-5 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-primary-500/20">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-800">
                          {student.name}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          {student.grade} · {student.className}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openStudentModal(student)}
                        className="p-2 text-neutral-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="p-2 text-neutral-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500">
                        家长信息
                      </span>
                      <button
                        onClick={() => openParentModal(student.id)}
                        className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
                      >
                        <UserPlus size={14} />
                        添加家长
                      </button>
                    </div>
                    {studentParents.length === 0 ? (
                      <div className="py-4 text-center text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
                        暂无家长信息
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {studentParents.map((parent) => (
                          <div
                            key={parent.id}
                            className="p-3 bg-neutral-50 rounded-xl"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User size={14} className="text-neutral-400" />
                                <span className="font-medium text-neutral-700 text-sm">
                                  {parent.name}
                                </span>
                                <span className="badge bg-primary-100 text-primary-600">
                                  {parent.relation}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() =>
                                    openParentModal(student.id, parent)
                                  }
                                  className="p-1 text-neutral-400 hover:text-primary-500"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteParent(parent.id)
                                  }
                                  className="p-1 text-neutral-400 hover:text-danger-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {parent.phone && (
                                <span className="flex items-center gap-1 text-neutral-500">
                                  <Phone size={12} />
                                  {parent.phone}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-neutral-500">
                                <MessageSquare size={12} />
                                {parent.topic}
                              </span>
                              {parent.attended ? (
                                <span className="badge bg-success-100 text-success-600">
                                  <CheckCircle2 size={12} className="mr-1" />
                                  已到场
                                </span>
                              ) : (
                                <span className="badge bg-danger-100 text-danger-600">
                                  <XCircle size={12} className="mr-1" />
                                  未到场
                                </span>
                              )}
                              {parent.needFollowup && (
                                <span className="badge bg-warning-100 text-warning-600">
                                  <AlertTriangle size={12} className="mr-1" />
                                  需跟进
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-xs text-neutral-500">
                              负责老师：{getTeacherName(parent.teacherId)}
                            </div>
                            {parent.specialNote && (
                              <div className="mt-2 text-xs text-warning-600 bg-warning-50 px-2 py-1 rounded-lg">
                                备注：{parent.specialNote}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-neutral-500">
              共 {teachers.length} 位老师
            </p>
            <button onClick={() => openTeacherModal()} className="btn-primary">
              <Plus size={18} />
              添加老师
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {teachers.map((teacher, index) => (
              <div
                key={teacher.id}
                className="card p-5 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-success-400 to-success-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-success-500/20">
                      {teacher.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-800">
                        {teacher.name}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        {teacher.subject}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openTeacherModal(teacher)}
                      className="p-2 text-neutral-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(teacher.id)}
                      className="p-2 text-neutral-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">最多带组数</span>
                    <span className="font-medium text-neutral-700">
                      {teacher.maxGroups} 组
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showStudentModal && (
        <Modal title={editingStudent ? "编辑学生" : "添加学生"} onClose={() => setShowStudentModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                学生姓名
              </label>
              <input
                type="text"
                value={studentForm.name}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, name: e.target.value })
                }
                className="input"
                placeholder="请输入学生姓名"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  年级
                </label>
                <select
                  value={studentForm.grade}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, grade: e.target.value })
                  }
                  className="select"
                >
                  <option>一年级</option>
                  <option>二年级</option>
                  <option>三年级</option>
                  <option>四年级</option>
                  <option>五年级</option>
                  <option>六年级</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  班级
                </label>
                <input
                  type="text"
                  value={studentForm.className}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      className: e.target.value,
                    })
                  }
                  className="input"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowStudentModal(false)}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={handleSaveStudent} className="btn-primary">
              保存
            </button>
          </div>
        </Modal>
      )}

      {showTeacherModal && (
        <Modal title={editingTeacher ? "编辑老师" : "添加老师"} onClose={() => setShowTeacherModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                老师姓名
              </label>
              <input
                type="text"
                value={teacherForm.name}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, name: e.target.value })
                }
                className="input"
                placeholder="请输入老师姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                科目
              </label>
              <input
                type="text"
                value={teacherForm.subject}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, subject: e.target.value })
                }
                className="input"
                placeholder="例如：数学、语文"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                最多带组数
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={teacherForm.maxGroups}
                onChange={(e) =>
                  setTeacherForm({
                    ...teacherForm,
                    maxGroups: parseInt(e.target.value) || 1,
                  })
                }
                className="input"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowTeacherModal(false)}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={handleSaveTeacher} className="btn-primary">
              保存
            </button>
          </div>
        </Modal>
      )}

      {showParentModal && (
        <Modal title={editingParent ? "编辑家长" : "添加家长"} onClose={() => setShowParentModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  家长姓名
                </label>
                <input
                  type="text"
                  value={parentForm.name}
                  onChange={(e) =>
                    setParentForm({ ...parentForm, name: e.target.value })
                  }
                  className="input"
                  placeholder="请输入家长姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  关系
                </label>
                <select
                  value={parentForm.relation}
                  onChange={(e) =>
                    setParentForm({
                      ...parentForm,
                      relation: e.target.value as ParentRelation,
                    })
                  }
                  className="select"
                >
                  {relations.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                联系电话
              </label>
              <input
                type="tel"
                value={parentForm.phone}
                onChange={(e) =>
                  setParentForm({ ...parentForm, phone: e.target.value })
                }
                className="input"
                placeholder="请输入联系电话"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                沟通主题
              </label>
              <select
                value={parentForm.topic}
                onChange={(e) =>
                  setParentForm({
                    ...parentForm,
                    topic: e.target.value as TopicType,
                  })
                }
                className="select"
              >
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                负责老师
              </label>
              <select
                value={parentForm.teacherId || ""}
                onChange={(e) =>
                  setParentForm({
                    ...parentForm,
                    teacherId: e.target.value || null,
                  })
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
                特殊备注
              </label>
              <textarea
                value={parentForm.specialNote}
                onChange={(e) =>
                  setParentForm({
                    ...parentForm,
                    specialNote: e.target.value,
                  })
                }
                className="input min-h-[80px]"
                placeholder="如离异家庭、特殊情况等需要注意的事项"
              />
            </div>
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={parentForm.attended}
                  onChange={(e) =>
                    setParentForm({
                      ...parentForm,
                      attended: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-primary-500 rounded"
                />
                <span className="text-sm text-neutral-700">已到场</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={parentForm.needFollowup}
                  onChange={(e) =>
                    setParentForm({
                      ...parentForm,
                      needFollowup: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-primary-500 rounded"
                />
                <span className="text-sm text-neutral-700">需会后跟进</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowParentModal(false)}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={handleSaveParent} className="btn-primary">
              保存
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4 font-serif">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
