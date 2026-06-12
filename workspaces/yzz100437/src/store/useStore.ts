import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppStore, Member, Piece, LeaveRecord, Alert } from '../types';
import { initialMembers, initialPieces, initialLeaveRecords } from '../data/mockData';
import { generateAlertsForNewLeave, generateAllAlerts } from '../utils/alerts';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      members: initialMembers,
      pieces: initialPieces,
      leaveRecords: initialLeaveRecords,
      alerts: [],
      currentRole: 'leader',
      currentMemberId: undefined,

      addMember: (member) => {
        const newMember: Member = {
          ...member,
          id: generateId(),
          createdAt: new Date().toISOString().split('T')[0],
        };
        set((state) => ({ members: [...state.members, newMember] }));
      },

      updateMember: (id, data) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === id ? { ...m, ...data } : m
          ),
        }));
      },

      deleteMember: (id) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
          leaveRecords: state.leaveRecords.filter((r) => r.memberId !== id),
        }));
      },

      addLeave: (leave) => {
        const newLeave: LeaveRecord = {
          ...leave,
          id: generateId(),
          createdAt: new Date().toISOString().split('T')[0],
        };
        
        const state = get();
        const newAlerts = generateAlertsForNewLeave(leave, state.members, state.leaveRecords);
        
        set((s) => ({
          leaveRecords: [...s.leaveRecords, newLeave],
          alerts: [...s.alerts, ...newAlerts],
        }));
        
        return newAlerts;
      },

      deleteLeave: (id) => {
        set((state) => ({
          leaveRecords: state.leaveRecords.filter((r) => r.id !== id),
        }));
      },

      markAlertRead: (id) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, read: true } : a
          ),
        }));
      },

      clearAlerts: () => {
        set({ alerts: [] });
      },

      setCurrentRole: (role) => {
        set({ currentRole: role });
      },

      setCurrentMember: (memberId) => {
        set({ currentMemberId: memberId });
      },

      addPiece: (piece) => {
        const newPiece: Piece = {
          ...piece,
          id: generateId(),
        };
        set((state) => ({ pieces: [...state.pieces, newPiece] }));
      },

      updatePiece: (id, data) => {
        set((state) => ({
          pieces: state.pieces.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
      },

      deletePiece: (id) => {
        set((state) => ({
          pieces: state.pieces.filter((p) => p.id !== id),
        }));
      },

      generateAlerts: () => {
        const state = get();
        const newAlerts = generateAllAlerts(state.members, state.leaveRecords);
        set({ alerts: newAlerts });
        return newAlerts;
      },
    }),
    {
      name: 'choir-leave-storage',
      partialize: (state) => ({
        members: state.members,
        pieces: state.pieces,
        leaveRecords: state.leaveRecords,
        alerts: state.alerts,
        currentRole: state.currentRole,
        currentMemberId: state.currentMemberId,
      }),
    }
  )
);

export const useMembers = () => useStore((state) => state.members);
export const usePieces = () => useStore((state) => state.pieces);
export const useLeaveRecords = () => useStore((state) => state.leaveRecords);
export const useAlerts = () => useStore((state) => state.alerts);
export const useUnreadAlertsCount = () => 
  useStore((state) => state.alerts.filter((a) => !a.read).length);
export const useCurrentRole = () => useStore((state) => state.currentRole);
export const useCurrentMemberId = () => useStore((state) => state.currentMemberId);

export const useMemberById = (id: string | undefined) => {
  return useStore((state) => 
    id ? state.members.find((m) => m.id === id) : undefined
  );
};

export const useLeaveRecordsByMember = (memberId: string | undefined) => {
  return useStore((state) =>
    memberId
      ? state.leaveRecords
          .filter((r) => r.memberId === memberId)
          .sort(
            (a, b) =>
              new Date(b.rehearsalDate).getTime() -
              new Date(a.rehearsalDate).getTime()
          )
      : []
  );
};

export const useLeaveRecordsByDate = (date: string) => {
  return useStore((state) =>
    state.leaveRecords.filter((r) => r.rehearsalDate === date)
  );
};

export const useVoicePartStats = (voicePart: string) => {
  return useStore((state) => {
    const totalMembers = state.members.filter(
      (m) => m.voicePart === voicePart && m.status === 'active'
    ).length;
    const today = new Date().toISOString().split('T')[0];
    const onLeaveToday = state.leaveRecords.filter(
      (r) =>
        r.rehearsalDate === today &&
        state.members.find((m) => m.id === r.memberId)?.voicePart ===
          voicePart
    ).length;
    return {
      total: totalMembers,
      onLeave: onLeaveToday,
      available: totalMembers - onLeaveToday,
      attendanceRate:
        totalMembers > 0
          ? Math.round(((totalMembers - onLeaveToday) / totalMembers) * 100)
          : 0,
    };
  });
};
