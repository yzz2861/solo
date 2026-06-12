import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Tree,
  StreetLamp,
  Sign,
  Bench,
  PowerLine,
  RoadSegment,
  User,
  PruningBoxState,
  Warning,
  PruningScheme,
  Task,
  Photo,
  RecheckRecord,
} from "../types";
import {
  mockTrees,
  mockStreetLamps,
  mockSigns,
  mockBenches,
  mockPowerLines,
  mockRoadSegments,
  mockUsers,
  mockTasks,
  mockSchemes,
  getDefaultPruningBox,
} from "../data/mockData";
import { determinePruningSide, generatePhotoRequirements } from "../utils/landscapeScorer";

interface AppState {
  user: User | null;
  role: "admin" | "gardener" | "supervisor" | null;
  isLoggedIn: boolean;

  trees: Tree[];
  streetLamps: StreetLamp[];
  signs: Sign[];
  benches: Bench[];
  powerLines: PowerLine[];
  roadSegments: RoadSegment[];
  users: User[];

  selectedTreeId: string | null;
  pruningBox: PruningBoxState;
  warnings: Warning[];

  pruningSchemes: PruningScheme[];
  schemes: PruningScheme[];
  currentScheme: PruningScheme | null;

  tasks: Task[];
  photos: Photo[];
  recheckRecords: RecheckRecord[];

  showNightMode: boolean;
  showHeatmap: boolean;
  showClearanceLines: boolean;

  login: (role: "admin" | "gardener" | "supervisor") => void;
  logout: () => void;

  selectTree: (id: string | null) => void;
  updatePruningBox: (box: Partial<PruningBoxState>) => void;
  resetPruningBox: () => void;
  setSelectedPruningBox: (box: PruningBoxState) => void;

  setWarnings: (warnings: Warning[]) => void;
  addWarning: (warning: Warning) => void;
  clearWarnings: () => void;

  saveScheme: (name: string) => PruningScheme;
  deleteScheme: (id: string) => void;
  loadScheme: (scheme: PruningScheme) => void;

  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  updateTaskStatus: (id: string, status: Task["status"]) => void;
  createTaskFromSelectedTree: (recheckDate: Date) => Task | null;
  setRecheckDate: (taskId: string, date: Date) => void;
  completeTask: (taskId: string) => void;

  uploadPhoto: (taskId: string, dataUrl: string, type: Photo["type"], notes?: string) => void;
  getPhotosForTask: (taskId: string) => Photo[];

  scheduleRainReview: (date: Date, taskIds: string[], assignee: string) => void;
  addRecheckRecord: (record: Omit<RecheckRecord, "id">) => void;

  setShowHeatmap: (show: boolean) => void;
  setShowClearanceLines: (show: boolean) => void;
  toggleNightMode: () => void;
  toggleHeatmap: () => void;
  toggleClearanceLines: () => void;

  getSelectedTree: () => Tree | undefined;
  exportPruningList: () => any[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      role: null,
      isLoggedIn: false,

      trees: mockTrees,
      streetLamps: mockStreetLamps,
      signs: mockSigns,
      benches: mockBenches,
      powerLines: mockPowerLines,
      roadSegments: mockRoadSegments,
      users: mockUsers,

      selectedTreeId: null,
      pruningBox: {
        position: [0, 0, 0],
        size: [0, 0, 0],
        rotation: [0, 0, 0],
        visible: false,
      },
      warnings: [],

      pruningSchemes: mockSchemes,
      schemes: mockSchemes,
      currentScheme: null,

      tasks: mockTasks,
      photos: [],
      recheckRecords: [],

      showNightMode: false,
      showHeatmap: false,
      showClearanceLines: true,

      login: (role) => {
        const user = mockUsers.find((u) => u.role === role);
        set({ user: user || null, role, isLoggedIn: true });
      },

      logout: () => {
        set({ user: null, role: null, isLoggedIn: false, selectedTreeId: null });
      },

      selectTree: (id) => {
        if (id) {
          const tree = get().trees.find((t) => t.id === id);
          if (tree) {
            const defaultBox = getDefaultPruningBox(tree);
            set({ selectedTreeId: id, pruningBox: defaultBox });
          }
        } else {
          set({
            selectedTreeId: null,
            pruningBox: {
              position: [0, 0, 0],
              size: [0, 0, 0],
              rotation: [0, 0, 0],
              visible: false,
            },
          });
        }
        get().clearWarnings();
      },

      updatePruningBox: (box) => {
        set((state) => ({
          pruningBox: { ...state.pruningBox, ...box },
        }));
      },

      resetPruningBox: () => {
        const tree = get().getSelectedTree();
        if (tree) {
          const defaultBox = getDefaultPruningBox(tree);
          set({ pruningBox: defaultBox });
        }
      },

      setSelectedPruningBox: (box) => {
        set({ pruningBox: box });
      },

      setWarnings: (warnings) => set({ warnings }),
      addWarning: (warning) => {
        set((state) => ({
          warnings: [...state.warnings, warning],
        }));
      },
      clearWarnings: () => set({ warnings: [] }),

      saveScheme: (name) => {
        const state = get();
        const tree = state.getSelectedTree();
        if (!tree) throw new Error("No tree selected");

        const prunedVolume =
          state.pruningBox.size[0] * state.pruningBox.size[1] * state.pruningBox.size[2];

        const scheme: PruningScheme = {
          id: `scheme-${Date.now()}`,
          name,
          treeId: tree.id,
          pruningBox: { ...state.pruningBox },
          clearanceHeight: state.pruningBox.position[1] - state.pruningBox.size[1] / 2,
          lightingCoverage: 0.85 + Math.random() * 0.15,
          landscapeScore: 6 + Math.random() * 4,
          prunedVolume,
          createdAt: new Date(),
          createdBy: state.user?.name || "Unknown",
          taskIds: [],
        };

        set((s) => ({
          schemes: [...s.schemes, scheme],
          pruningSchemes: [...s.schemes, scheme],
          currentScheme: scheme,
        }));

        return scheme;
      },

      deleteScheme: (id) => {
        set((state) => ({
          schemes: state.schemes.filter((s) => s.id !== id),
          pruningSchemes: state.schemes.filter((s) => s.id !== id),
          currentScheme: state.currentScheme?.id === id ? null : state.currentScheme,
        }));
      },

      loadScheme: (scheme) => {
        const tree = get().trees.find((t) => t.id === scheme.treeId);
        if (tree) {
          set({
            selectedTreeId: scheme.treeId,
            pruningBox: { ...scheme.pruningBox },
            currentScheme: scheme,
          });
        }
      },

      addTask: (task) => {
        const newTask: Task = {
          ...task,
          id: `task-${Date.now()}`,
          createdAt: new Date(),
        };
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      updateTaskStatus: (id, status) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status,
                  actualRecheckDate: status === "completed" ? new Date() : t.actualRecheckDate,
                }
              : t
          ),
        }));
      },

      createTaskFromSelectedTree: (recheckDate) => {
        const state = get();
        const tree = state.getSelectedTree();
        const gardener = state.users.find((u) => u.role === "gardener");

        if (!tree) return null;

        const pruningSide = determinePruningSide(tree, state.pruningBox);
        const photoReq = generatePhotoRequirements(tree, pruningSide);

        const newTask: Task = {
          id: `task-${Date.now()}`,
          schemeId: state.currentScheme?.id || "",
          treeId: tree.id,
          treeCode: tree.code,
          sideToPrune: pruningSide,
          photoRequirements: photoReq,
          pruningBox: { ...state.pruningBox },
          status: "pending",
          createdAt: new Date(),
          assignee: gardener?.id || "user-002",
          recheckDate,
          isRainReview: false,
          photos: [],
        };

        set((s) => ({
          tasks: [...s.tasks, newTask],
        }));

        if (state.currentScheme) {
          set((s) => ({
            schemes: s.schemes.map((sc) =>
              sc.id === state.currentScheme?.id
                ? { ...sc, taskIds: [...sc.taskIds, newTask.id] }
                : sc
            ),
            pruningSchemes: s.schemes.map((sc) =>
              sc.id === state.currentScheme?.id
                ? { ...sc, taskIds: [...sc.taskIds, newTask.id] }
                : sc
            ),
          }));
        }

        return newTask;
      },

      setRecheckDate: (taskId, date) => {
        get().updateTask(taskId, { recheckDate: date });
      },

      completeTask: (taskId) => {
        get().updateTask(taskId, {
          status: "completed",
          actualRecheckDate: new Date(),
        });
      },

      uploadPhoto: (taskId, dataUrl, type, notes) => {
        const photo: Photo = {
          id: `photo-${Date.now()}`,
          taskId,
          dataUrl,
          type,
          uploadedAt: new Date(),
          notes,
        };
        set((state) => ({
          photos: [...state.photos, photo],
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, photos: [...t.photos, photo] } : t
          ),
        }));
      },

      getPhotosForTask: (taskId) => {
        return get().photos.filter((p) => p.taskId === taskId);
      },

      scheduleRainReview: (date, taskIds, assignee) => {
        taskIds.forEach((taskId) => {
          const task = get().tasks.find((t) => t.id === taskId);
          if (task) {
            get().updateTask(taskId, {
              recheckDate: date,
              isRainReview: true,
              assignee,
              status: "needs_review",
            });

            const record: RecheckRecord = {
              id: `recheck-${Date.now()}-${taskId}`,
              taskId,
              assigneeId: assignee,
              recheckDate: date,
              passed: false,
              isRainReview: true,
              notes: "雨后复查，检查树木倾斜和积水情况",
            };

            set((state) => ({
              recheckRecords: [...state.recheckRecords, record],
            }));
          }
        });
      },

      addRecheckRecord: (record) => {
        const newRecord: RecheckRecord = {
          ...record,
          id: `recheck-${Date.now()}`,
        };
        set((state) => ({
          recheckRecords: [...state.recheckRecords, newRecord],
        }));
      },

      setShowHeatmap: (show) => set({ showHeatmap: show }),
      setShowClearanceLines: (show) => set({ showClearanceLines: show }),
      toggleNightMode: () => set((s) => ({ showNightMode: !s.showNightMode })),
      toggleHeatmap: () => set((s) => ({ showHeatmap: !s.showHeatmap })),
      toggleClearanceLines: () => set((s) => ({ showClearanceLines: !s.showClearanceLines })),

      getSelectedTree: () => {
        return get().trees.find((t) => t.id === get().selectedTreeId);
      },

      exportPruningList: () => {
        const state = get();
        return state.tasks.map((task) => {
          const tree = state.trees.find((t) => t.id === task.treeId);
          const assigneeUser = state.users.find((u) => u.id === task.assignee);
          return {
            树木编号: task.treeCode,
            树种: tree?.species || "",
            位置: `X:${tree?.positionX || 0}, Z:${tree?.positionZ || 0}`,
            修剪方位: task.sideToPrune,
            照片要求: task.photoRequirements,
            复查日期: task.recheckDate ? new Date(task.recheckDate).toISOString().split("T")[0] : "",
            负责人: assigneeUser?.name || task.assignee,
            状态: getTaskStatusText(task.status),
          };
        });
      },
    }),
    {
      name: "tree-pruning-storage",
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isLoggedIn: state.isLoggedIn,
        schemes: state.schemes,
        pruningSchemes: state.schemes,
        tasks: state.tasks,
        photos: state.photos,
        recheckRecords: state.recheckRecords,
      }),
    }
  )
);

function getTaskStatusText(status: Task["status"]): string {
  const map: Record<Task["status"], string> = {
    pending: "待处理",
    in_progress: "进行中",
    completed: "已完成",
    needs_review: "需复查",
  };
  return map[status];
}
