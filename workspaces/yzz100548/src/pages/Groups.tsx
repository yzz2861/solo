import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Plus,
  Users,
  Layers,
  Search,
  Edit2,
  Trash2,
  User,
  MessageSquare,
  AlertTriangle,
  XCircle,
  UserPlus,
  GripVertical,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import AlertPanel from "@/components/AlertPanel";
import type { Parent, Group } from "@/types";

interface DraggableParentCardProps {
  parent: Parent;
  studentName: string;
  teacherName: string;
}

function DraggableParentCard({
  parent,
  studentName,
  teacherName,
}: DraggableParentCardProps) {
  return (
    <div
      className={`p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
        !parent.attended
          ? "bg-neutral-50 border-neutral-200 opacity-60"
          : "bg-white border-neutral-200 hover:border-primary-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical
          size={16}
          className="text-neutral-300 flex-shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-neutral-800 truncate">
              {parent.name}
            </span>
            <span className="text-xs text-neutral-500 flex-shrink-0">
              {parent.relation}
            </span>
          </div>
          <div className="text-xs text-neutral-500 mt-0.5">
            {studentName}的家长
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs">
              <MessageSquare size={10} />
              {parent.topic}
            </span>
            {!parent.attended && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-danger-50 text-danger-600 rounded-full text-xs">
                <XCircle size={10} />
                未到
              </span>
            )}
            {parent.needFollowup && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning-50 text-warning-600 rounded-full text-xs">
                <AlertTriangle size={10} />
                待跟进
              </span>
            )}
            {parent.specialNote && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs">
                有备注
              </span>
            )}
          </div>
          <div className="text-xs text-neutral-400 mt-1.5">
            负责老师：{teacherName || "未分配"}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableParentCard({
  parent,
  studentName,
  teacherName,
}: DraggableParentCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: parent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DraggableParentCard
        parent={parent}
        studentName={studentName}
        teacherName={teacherName}
      />
    </div>
  );
}

interface DroppableGroupProps {
  group: Group;
  parents: Parent[];
  teacherName: string;
  onEdit: () => void;
  onDelete: () => void;
}

function DroppableGroup({
  group,
  parents,
  teacherName,
  onEdit,
  onDelete,
}: DroppableGroupProps) {
  const { students, teachers } = useAppStore();

  const getStudentName = (studentId: string) =>
    students.find((s) => s.id === studentId)?.name || "未知";

  const getTeacherName = (teacherId: string | null) =>
    teachers.find((t) => t.id === teacherId)?.name || "未分配";

  return (
    <div className="card p-4 flex flex-col min-h-[400px]">
      <div className="flex items-start justify-between mb-3 pb-3 border-b border-neutral-100">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-neutral-800">{group.name}</h3>
            <span className="badge bg-primary-100 text-primary-600">
              {parents.length} 人
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            负责老师：{teacherName || "未分配"}
          </p>
          {group.topic && (
            <p className="text-xs text-neutral-400 mt-0.5">
              主题：{group.topic}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-neutral-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-neutral-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
        <SortableContext
          items={parents.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {parents.map((parent) => (
            <SortableParentCard
              key={parent.id}
              parent={parent}
              studentName={getStudentName(parent.studentId)}
              teacherName={getTeacherName(parent.teacherId)}
            />
          ))}
        </SortableContext>
        {parents.length === 0 && (
          <div className="h-24 flex items-center justify-center text-sm text-neutral-400 border-2 border-dashed border-neutral-200 rounded-xl">
            拖拽家长到这里
          </div>
        )}
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const {
    parents,
    students,
    teachers,
    groups,
    addGroup,
    updateGroup,
    deleteGroup,
    moveParentToGroup,
    generateAlerts,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: "",
    teacherId: "",
    topic: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    generateAlerts();
  }, [parents, groups, teachers, generateAlerts]);

  const ungroupedParents = parents.filter((p) => !p.groupId);

  const filteredUngrouped = ungroupedParents.filter(
    (p) =>
      p.name.includes(searchQuery) ||
      students.find((s) => s.id === p.studentId)?.name.includes(searchQuery)
  );

  const getGroupParents = (groupId: string) =>
    parents.filter((p) => p.groupId === groupId);

  const getTeacherName = (teacherId: string | null) =>
    teachers.find((t) => t.id === teacherId)?.name || "未分配";

  const getStudentName = (studentId: string) =>
    students.find((s) => s.id === studentId)?.name || "未知";

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeParent = parents.find((p) => p.id === activeId);
    if (!activeParent) return;

    const overGroup = groups.find((g) => g.id === overId);
    const overParent = parents.find((p) => p.id === overId);

    if (overGroup) {
      if (activeParent.groupId !== overGroup.id) {
        moveParentToGroup(activeId, overGroup.id);
      }
    } else if (overParent) {
      if (overParent.groupId !== activeParent.groupId) {
        moveParentToGroup(activeId, overParent.groupId);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeParent = parents.find((p) => p.id === activeId);
    if (!activeParent) return;

    const overGroup = groups.find((g) => g.id === overId);
    const overParent = parents.find((p) => p.id === overId);

    if (overId === "ungrouped") {
      moveParentToGroup(activeId, null);
    } else if (overGroup) {
      moveParentToGroup(activeId, overGroup.id);
    } else if (overParent) {
      if (activeParent.groupId && overParent.groupId === activeParent.groupId) {
        // 同组内排序暂时不处理，简化版本
      } else if (overParent.groupId) {
        moveParentToGroup(activeId, overParent.groupId);
      }
    }
  };

  const openGroupModal = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name,
        teacherId: group.teacherId || "",
        topic: group.topic,
      });
    } else {
      setEditingGroup(null);
      setGroupForm({ name: "", teacherId: "", topic: "" });
    }
    setShowGroupModal(true);
  };

  const handleSaveGroup = () => {
    if (!groupForm.name.trim()) return;
    if (editingGroup) {
      updateGroup(editingGroup.id, {
        name: groupForm.name,
        teacherId: groupForm.teacherId || null,
        topic: groupForm.topic,
      });
    } else {
      addGroup({
        name: groupForm.name,
        teacherId: groupForm.teacherId || null,
        topic: groupForm.topic,
      });
    }
    setShowGroupModal(false);
  };

  const handleDeleteGroup = (id: string) => {
    if (confirm("确定要删除这个小组吗？小组内的家长将回到未分组池。")) {
      deleteGroup(id);
    }
  };

  const activeParent = activeId ? parents.find((p) => p.id === activeId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 font-serif">
            分组管理
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            拖拽家长卡片进行分组，系统会自动提醒潜在问题
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Users size={16} />
            <span>共 {parents.length} 位家长</span>
            <span className="text-neutral-300">|</span>
            <Layers size={16} />
            <span>{groups.length} 个小组</span>
          </div>
          <button onClick={() => openGroupModal()} className="btn-primary">
            <Plus size={18} />
            新建小组
          </button>
        </div>
      </div>

      <AlertPanel />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 items-start">
          <div className="w-72 flex-shrink-0">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-neutral-800 flex items-center gap-2">
                  <UserPlus size={18} className="text-primary-500" />
                  未分组
                  <span className="badge bg-neutral-100 text-neutral-600">
                    {ungroupedParents.length} 人
                  </span>
                </h2>
              </div>
              <div className="relative mb-3">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="text"
                  placeholder="搜索家长..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-sm pl-9"
                />
              </div>
              <div
                id="ungrouped"
                className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1"
                data-droppable="true"
              >
                <SortableContext
                  items={filteredUngrouped.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredUngrouped.map((parent) => (
                    <SortableParentCard
                      key={parent.id}
                      parent={parent}
                      studentName={getStudentName(parent.studentId)}
                      teacherName={getTeacherName(parent.teacherId)}
                    />
                  ))}
                </SortableContext>
                {filteredUngrouped.length === 0 && (
                  <div className="py-8 text-center text-sm text-neutral-400">
                    {searchQuery ? "未找到匹配的家长" : "所有家长已分配小组"}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {groups.map((group) => (
                <DroppableGroup
                  key={group.id}
                  group={group}
                  parents={getGroupParents(group.id)}
                  teacherName={getTeacherName(group.teacherId)}
                  onEdit={() => openGroupModal(group)}
                  onDelete={() => handleDeleteGroup(group.id)}
                />
              ))}
            </div>
            {groups.length === 0 && (
              <div className="card p-12 text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Layers size={28} className="text-primary-500" />
                </div>
                <h3 className="text-lg font-medium text-neutral-800 mb-2">
                  还没有小组
                </h3>
                <p className="text-sm text-neutral-500 mb-4">
                  点击右上角"新建小组"按钮创建讨论小组
                </p>
                <button onClick={() => openGroupModal()} className="btn-primary">
                  <Plus size={18} />
                  创建第一个小组
                </button>
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeParent ? (
            <div className="opacity-90 scale-105 shadow-xl">
              <DraggableParentCard
                parent={activeParent}
                studentName={getStudentName(activeParent.studentId)}
                teacherName={getTeacherName(activeParent.teacherId)}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowGroupModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4 font-serif">
              {editingGroup ? "编辑小组" : "新建小组"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  小组名称
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, name: e.target.value })
                  }
                  className="input"
                  placeholder="例如：学习习惯讨论组"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  负责老师
                </label>
                <select
                  value={groupForm.teacherId}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, teacherId: e.target.value })
                  }
                  className="select"
                >
                  <option value="">暂不指定</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}（{t.subject}）
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  讨论主题
                </label>
                <input
                  type="text"
                  value={groupForm.topic}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, topic: e.target.value })
                  }
                  className="input"
                  placeholder="本次座谈的主要议题"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowGroupModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button onClick={handleSaveGroup} className="btn-primary">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
