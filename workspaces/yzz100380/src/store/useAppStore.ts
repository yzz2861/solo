import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Member,
  Section,
  SectionHistory,
  Sheet,
  Practice,
  Attendance,
  Performance,
  PerformanceConfirm,
  ViewMode,
} from '@/types';
import {
  mockMembers,
  mockSections,
  mockSectionHistory,
  mockSheets,
  mockPractices,
  mockAttendances,
  mockPerformances,
  mockPerformanceConfirms,
} from '@/data/mockData';

interface AppState {
  viewMode: ViewMode;
  currentMemberId: string | null;
  sidebarCollapsed: boolean;
  members: Member[];
  sections: Section[];
  sectionHistories: SectionHistory[];
  sheets: Sheet[];
  practices: Practice[];
  attendances: Attendance[];
  performances: Performance[];
  performanceConfirms: PerformanceConfirm[];

  setViewMode: (mode: ViewMode) => void;
  setCurrentMemberId: (id: string | null) => void;
  toggleSidebar: () => void;

  addMember: (member: Omit<Member, 'id'>) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  changeMemberSection: (memberId: string, newSectionId: string, reason?: string) => void;

  addSection: (section: Omit<Section, 'id'>) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  deleteSection: (id: string) => void;

  addSheet: (sheet: Omit<Sheet, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSheet: (id: string, updates: Partial<Sheet>) => void;
  deleteSheet: (id: string) => void;
  toggleSheetValid: (id: string) => void;

  addPractice: (practice: Omit<Practice, 'id'>) => void;
  updatePractice: (id: string, updates: Partial<Practice>) => void;
  getPractice: (memberId: string, sheetId: string) => Practice | undefined;

  addAttendance: (attendance: Omit<Attendance, 'id'>) => void;
  updateAttendance: (id: string, updates: Partial<Attendance>) => void;
  getAttendancesByDate: (date: string) => Attendance[];

  addPerformance: (performance: Omit<Performance, 'id'>) => void;
  updatePerformance: (id: string, updates: Partial<Performance>) => void;
  deletePerformance: (id: string) => void;
  setPerformanceConfirm: (performanceId: string, memberId: string, confirmed: boolean) => void;

  exportData: () => string;
  importData: (jsonString: string) => void;
  resetData: () => void;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      viewMode: 'leader',
      currentMemberId: null,
      sidebarCollapsed: false,
      members: mockMembers,
      sections: mockSections,
      sectionHistories: mockSectionHistory,
      sheets: mockSheets,
      practices: mockPractices,
      attendances: mockAttendances,
      performances: mockPerformances,
      performanceConfirms: mockPerformanceConfirms,

      setViewMode: (mode) => set({ viewMode: mode }),
      setCurrentMemberId: (id) => set({ currentMemberId: id }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      addMember: (member) =>
        set((state) => ({
          members: [...state.members, { ...member, id: generateId('m') }],
        })),

      updateMember: (id, updates) =>
        set((state) => ({
          members: state.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      deleteMember: (id) =>
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
          practices: state.practices.filter((p) => p.memberId !== id),
          attendances: state.attendances.filter((a) => a.memberId !== id),
          performanceConfirms: state.performanceConfirms.filter((pc) => pc.memberId !== id),
          sectionHistories: state.sectionHistories.filter((sh) => sh.memberId !== id),
        })),

      changeMemberSection: (memberId, newSectionId, reason) => {
        const member = get().members.find((m) => m.id === memberId);
        if (!member || member.sectionId === newSectionId) return;

        const history: SectionHistory = {
          id: generateId('sh'),
          memberId,
          fromSectionId: member.sectionId,
          toSectionId: newSectionId,
          changeDate: new Date().toISOString().split('T')[0],
          reason,
        };

        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, sectionId: newSectionId } : m
          ),
          sectionHistories: [...state.sectionHistories, history],
        }));
      },

      addSection: (section) =>
        set((state) => ({
          sections: [...state.sections, { ...section, id: generateId('sec') }],
        })),

      updateSection: (id, updates) =>
        set((state) => ({
          sections: state.sections.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      deleteSection: (id) =>
        set((state) => ({
          sections: state.sections.filter((s) => s.id !== id),
        })),

      addSheet: (sheet) => {
        const now = new Date().toISOString().split('T')[0];
        set((state) => ({
          sheets: [...state.sheets, { ...sheet, id: generateId('s'), createdAt: now, updatedAt: now }],
        }));
      },

      updateSheet: (id, updates) =>
        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : s
          ),
        })),

      deleteSheet: (id) =>
        set((state) => ({
          sheets: state.sheets.filter((s) => s.id !== id),
          practices: state.practices.filter((p) => p.sheetId !== id),
          performances: state.performances.map((p) => ({
            ...p,
            songIds: p.songIds.filter((sid) => sid !== id),
          })),
        })),

      toggleSheetValid: (id) =>
        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === id ? { ...s, fileValid: !s.fileValid } : s
          ),
        })),

      addPractice: (practice) =>
        set((state) => ({
          practices: [...state.practices, { ...practice, id: generateId('p') }],
        })),

      updatePractice: (id, updates) =>
        set((state) => ({
          practices: state.practices.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      getPractice: (memberId, sheetId) =>
        get().practices.find((p) => p.memberId === memberId && p.sheetId === sheetId),

      addAttendance: (attendance) =>
        set((state) => ({
          attendances: [...state.attendances, { ...attendance, id: generateId('a') }],
        })),

      updateAttendance: (id, updates) =>
        set((state) => ({
          attendances: state.attendances.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      getAttendancesByDate: (date) => get().attendances.filter((a) => a.date === date),

      addPerformance: (performance) =>
        set((state) => ({
          performances: [...state.performances, { ...performance, id: generateId('perf') }],
        })),

      updatePerformance: (id, updates) =>
        set((state) => ({
          performances: state.performances.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      deletePerformance: (id) =>
        set((state) => ({
          performances: state.performances.filter((p) => p.id !== id),
          performanceConfirms: state.performanceConfirms.filter((pc) => pc.performanceId !== id),
        })),

      setPerformanceConfirm: (performanceId, memberId, confirmed) => {
        const existing = get().performanceConfirms.find(
          (pc) => pc.performanceId === performanceId && pc.memberId === memberId
        );

        if (existing) {
          set((state) => ({
            performanceConfirms: state.performanceConfirms.map((pc) =>
              pc.id === existing.id
                ? { ...pc, confirmed, confirmedAt: confirmed ? new Date().toISOString() : undefined }
                : pc
            ),
          }));
        } else {
          set((state) => ({
            performanceConfirms: [
              ...state.performanceConfirms,
              {
                id: generateId('pc'),
                performanceId,
                memberId,
                confirmed,
                confirmedAt: confirmed ? new Date().toISOString() : undefined,
              },
            ],
          }));
        }
      },

      exportData: () => {
        const state = get();
        const data = {
          members: state.members,
          sections: state.sections,
          sectionHistories: state.sectionHistories,
          sheets: state.sheets,
          practices: state.practices,
          attendances: state.attendances,
          performances: state.performances,
          performanceConfirms: state.performanceConfirms,
        };
        return JSON.stringify(data, null, 2);
      },

      importData: (jsonString) => {
        try {
          const data = JSON.parse(jsonString);
          set({
            members: data.members || [],
            sections: data.sections || [],
            sectionHistories: data.sectionHistories || [],
            sheets: data.sheets || [],
            practices: data.practices || [],
            attendances: data.attendances || [],
            performances: data.performances || [],
            performanceConfirms: data.performanceConfirms || [],
          });
        } catch (e) {
          console.error('Import failed:', e);
        }
      },

      resetData: () => {
        set({
          members: mockMembers,
          sections: mockSections,
          sectionHistories: mockSectionHistory,
          sheets: mockSheets,
          practices: mockPractices,
          attendances: mockAttendances,
          performances: mockPerformances,
          performanceConfirms: mockPerformanceConfirms,
        });
      },
    }),
    {
      name: 'harmonica-club-data',
      version: 1,
    }
  )
);
