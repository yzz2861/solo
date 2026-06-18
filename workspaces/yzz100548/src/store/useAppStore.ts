import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Student,
  Parent,
  Teacher,
  Group,
  FollowupRecord,
  UserRole,
  Alert,
} from "@/types";

interface AppState {
  currentRole: UserRole;
  students: Student[];
  parents: Parent[];
  teachers: Teacher[];
  groups: Group[];
  followupRecords: FollowupRecord[];
  alerts: Alert[];
  setCurrentRole: (role: UserRole) => void;
  addStudent: (student: Omit<Student, "id">) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  addParent: (parent: Omit<Parent, "id">) => void;
  updateParent: (id: string, data: Partial<Parent>) => void;
  deleteParent: (id: string) => void;
  addTeacher: (teacher: Omit<Teacher, "id">) => void;
  updateTeacher: (id: string, data: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  addGroup: (group: Omit<Group, "id" | "position">) => void;
  updateGroup: (id: string, data: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  moveParentToGroup: (parentId: string, groupId: string | null) => void;
  addFollowupRecord: (record: Omit<FollowupRecord, "id">) => void;
  updateFollowupRecord: (id: string, data: Partial<FollowupRecord>) => void;
  deleteFollowupRecord: (id: string) => void;
  generateAlerts: () => void;
  reorderGroups: (activeId: string, overId: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const mockStudents: Student[] = [
  { id: "s1", name: "张明", className: "三年级(1)班", grade: "三年级" },
  { id: "s2", name: "李华", className: "三年级(1)班", grade: "三年级" },
  { id: "s3", name: "王芳", className: "三年级(1)班", grade: "三年级" },
  { id: "s4", name: "赵磊", className: "三年级(1)班", grade: "三年级" },
  { id: "s5", name: "陈雨", className: "三年级(1)班", grade: "三年级" },
  { id: "s6", name: "刘洋", className: "三年级(1)班", grade: "三年级" },
  { id: "s7", name: "杨梅", className: "三年级(1)班", grade: "三年级" },
  { id: "s8", name: "周杰", className: "三年级(1)班", grade: "三年级" },
];

const mockTeachers: Teacher[] = [
  { id: "t1", name: "王老师", subject: "班主任/语文", maxGroups: 2 },
  { id: "t2", name: "李老师", subject: "数学", maxGroups: 2 },
  { id: "t3", name: "张老师", subject: "英语", maxGroups: 1 },
];

const mockParents: Parent[] = [
  {
    id: "p1",
    studentId: "s1",
    name: "张伟",
    relation: "父亲",
    phone: "13800138001",
    attended: true,
    topic: "学习习惯",
    specialNote: "",
    teacherId: "t1",
    needFollowup: false,
    groupId: null,
  },
  {
    id: "p2",
    studentId: "s2",
    name: "李娜",
    relation: "母亲",
    phone: "13800138002",
    attended: true,
    topic: "同伴关系",
    specialNote: "离异家庭，母亲抚养",
    teacherId: "t1",
    needFollowup: true,
    groupId: null,
  },
  {
    id: "p3",
    studentId: "s3",
    name: "王强",
    relation: "父亲",
    phone: "13800138003",
    attended: true,
    topic: "学习习惯",
    specialNote: "",
    teacherId: "t2",
    needFollowup: false,
    groupId: null,
  },
  {
    id: "p4",
    studentId: "s4",
    name: "赵敏",
    relation: "母亲",
    phone: "13800138004",
    attended: false,
    topic: "学业成绩",
    specialNote: "",
    teacherId: "t2",
    needFollowup: true,
    groupId: null,
  },
  {
    id: "p5",
    studentId: "s5",
    name: "陈军",
    relation: "父亲",
    phone: "13800138005",
    attended: true,
    topic: "心理健康",
    specialNote: "孩子性格内向",
    teacherId: "t1",
    needFollowup: true,
    groupId: null,
  },
  {
    id: "p6",
    studentId: "s6",
    name: "刘芳",
    relation: "母亲",
    phone: "13800138006",
    attended: true,
    topic: "同伴关系",
    specialNote: "",
    teacherId: null,
    needFollowup: false,
    groupId: null,
  },
  {
    id: "p7",
    studentId: "s7",
    name: "杨建国",
    relation: "父亲",
    phone: "13800138007",
    attended: true,
    topic: "学习习惯",
    specialNote: "离异家庭，父亲抚养",
    teacherId: "t3",
    needFollowup: true,
    groupId: null,
  },
  {
    id: "p8",
    studentId: "s8",
    name: "周婷",
    relation: "母亲",
    phone: "13800138008",
    attended: true,
    topic: "综合发展",
    specialNote: "",
    teacherId: "t3",
    needFollowup: false,
    groupId: null,
  },
];

const mockGroups: Group[] = [
  {
    id: "g1",
    name: "学习习惯组",
    teacherId: "t1",
    topic: "学习习惯培养",
    position: 0,
  },
  {
    id: "g2",
    name: "同伴关系组",
    teacherId: "t2",
    topic: "同伴交往与社会适应",
    position: 1,
  },
];

const mockFollowups: FollowupRecord[] = [
  {
    id: "f1",
    studentId: "s2",
    parentId: "p2",
    teacherId: "t1",
    status: "进行中",
    date: "2026-06-15",
    note: "家长反馈孩子近期情绪波动较大，需要持续关注。已约定下周电话跟进。",
    type: "面谈",
    nextPlanDate: "2026-06-22",
  },
  {
    id: "f2",
    studentId: "s4",
    parentId: "p4",
    teacherId: "t2",
    status: "待跟进",
    date: "2026-06-16",
    note: "家长未能参加家长会，需要电话沟通孩子的数学学习情况。",
    type: "电话",
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentRole: "班主任",
      students: mockStudents,
      parents: mockParents,
      teachers: mockTeachers,
      groups: mockGroups,
      followupRecords: mockFollowups,
      alerts: [],

      setCurrentRole: (role) => set({ currentRole: role }),

      addStudent: (student) =>
        set((state) => ({
          students: [...state.students, { ...student, id: generateId() }],
        })),

      updateStudent: (id, data) =>
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        })),

      deleteStudent: (id) =>
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
          parents: state.parents.filter((p) => p.studentId !== id),
        })),

      addParent: (parent) =>
        set((state) => ({
          parents: [...state.parents, { ...parent, id: generateId() }],
        })),

      updateParent: (id, data) =>
        set((state) => {
          const newParents = state.parents.map((p) =>
            p.id === id ? { ...p, ...data } : p
          );
          return { parents: newParents };
        }),

      deleteParent: (id) =>
        set((state) => ({
          parents: state.parents.filter((p) => p.id !== id),
        })),

      addTeacher: (teacher) =>
        set((state) => ({
          teachers: [...state.teachers, { ...teacher, id: generateId() }],
        })),

      updateTeacher: (id, data) =>
        set((state) => ({
          teachers: state.teachers.map((t) =>
            t.id === id ? { ...t, ...data } : t
          ),
        })),

      deleteTeacher: (id) =>
        set((state) => ({
          teachers: state.teachers.filter((t) => t.id !== id),
          groups: state.groups.map((g) =>
            g.teacherId === id ? { ...g, teacherId: null } : g
          ),
          parents: state.parents.map((p) =>
            p.teacherId === id ? { ...p, teacherId: null } : p
          ),
        })),

      addGroup: (group) =>
        set((state) => ({
          groups: [
            ...state.groups,
            { ...group, id: generateId(), position: state.groups.length },
          ],
        })),

      updateGroup: (id, data) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, ...data } : g
          ),
        })),

      deleteGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
          parents: state.parents.map((p) =>
            p.groupId === id ? { ...p, groupId: null } : p
          ),
        })),

      moveParentToGroup: (parentId, groupId) =>
        set((state) => ({
          parents: state.parents.map((p) =>
            p.id === parentId ? { ...p, groupId } : p
          ),
        })),

      addFollowupRecord: (record) =>
        set((state) => ({
          followupRecords: [
            ...state.followupRecords,
            { ...record, id: generateId() },
          ],
        })),

      updateFollowupRecord: (id, data) =>
        set((state) => ({
          followupRecords: state.followupRecords.map((r) =>
            r.id === id ? { ...r, ...data } : r
          ),
        })),

      deleteFollowupRecord: (id) =>
        set((state) => ({
          followupRecords: state.followupRecords.filter((r) => r.id !== id),
        })),

      reorderGroups: (activeId, overId) =>
        set((state) => {
          const groups = [...state.groups];
          const activeIndex = groups.findIndex((g) => g.id === activeId);
          const overIndex = groups.findIndex((g) => g.id === overId);
          if (activeIndex === -1 || overIndex === -1) return state;
          const [removed] = groups.splice(activeIndex, 1);
          groups.splice(overIndex, 0, removed);
          return {
            groups: groups.map((g, i) => ({ ...g, position: i })),
          };
        }),

      generateAlerts: () => {
        const { parents, teachers, groups } = get();
        const alerts: Alert[] = [];

        const teacherGroupCounts: Record<string, number> = {};
        groups.forEach((g) => {
          if (g.teacherId) {
            teacherGroupCounts[g.teacherId] =
              (teacherGroupCounts[g.teacherId] || 0) + 1;
          }
        });

        teachers.forEach((t) => {
          const count = teacherGroupCounts[t.id] || 0;
          if (count > t.maxGroups) {
            alerts.push({
              id: `alert-teacher-${t.id}`,
              type: "warning",
              title: `老师带组过多：${t.name}`,
              description: `${t.name} 老师目前负责 ${count} 个小组，超过了设定的 ${t.maxGroups} 组上限。`,
              relatedIds: [t.id],
            });
          }
        });

        const specialNoteKeywords = ["离异", "单亲", "敏感", "矛盾", "冲突"];
        groups.forEach((g) => {
          const groupParents = parents.filter((p) => p.groupId === g.id);
          const specialParents = groupParents.filter((p) =>
            specialNoteKeywords.some((k) => p.specialNote.includes(k))
          );
          if (specialParents.length >= 2) {
            const names = specialParents
              .map((p) => {
                const s = get().students.find((s) => s.id === p.studentId);
                return s?.name || p.name;
              })
              .join("、");
            alerts.push({
              id: `alert-special-${g.id}`,
              type: "error",
              title: `特殊备注冲突：${g.name}`,
              description: `小组内有 ${specialParents.length} 位家长有特殊家庭情况（${names}），建议不要安排在同一组。`,
              relatedIds: [g.id],
            });
          }
        });

        const unattendedInGroup = parents.filter(
          (p) => !p.attended && p.groupId
        );
        if (unattendedInGroup.length > 0) {
          alerts.push({
            id: "alert-unattended",
            type: "info",
            title: "未到场家长被分组",
            description: `有 ${unattendedInGroup.length} 位未到场的家长被分配到了小组中。`,
            relatedIds: unattendedInGroup.map((p) => p.id),
          });
        }

        const needFollowupNoTeacher = parents.filter(
          (p) => p.needFollowup && !p.teacherId
        );
        if (needFollowupNoTeacher.length > 0) {
          alerts.push({
            id: "alert-no-teacher-followup",
            type: "warning",
            title: "跟进无负责人",
            description: `有 ${needFollowupNoTeacher.length} 位需要跟进的家长还没有指定负责老师。`,
            relatedIds: needFollowupNoTeacher.map((p) => p.id),
          });
        }

        set({ alerts });
      },
    }),
    {
      name: "parent-meeting-storage",
      version: 1,
    }
  )
);
