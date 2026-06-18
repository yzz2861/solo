import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Registration, Trip, Reminder, FamilyMember, Payment, RoomAssignment, BusAssignment } from '@/types';
import { MOCK_REGISTRATIONS, MOCK_TRIPS, generateReminders } from '@/data/mockData';
import { generateId, calculateTotalAmount, calculateDeposit, getFinalPaymentDueDate } from '@/utils';
import { INSURANCE_PLANS, ROOM_TYPES } from '@/types';

interface AppState {
  registrations: Registration[];
  trips: Trip[];
  reminders: Reminder[];
  roomAssignments: RoomAssignment[];
  busAssignments: BusAssignment[];
  currentTripId: string | null;
  
  addRegistration: (reg: Omit<Registration, 'id' | 'createdAt' | 'updatedAt'>) => Registration;
  updateRegistration: (id: string, updates: Partial<Registration>) => void;
  deleteRegistration: (id: string) => void;
  getRegistration: (id: string) => Registration | undefined;
  
  addMember: (regId: string, member: Omit<FamilyMember, 'id' | 'registrationId'>) => void;
  updateMember: (regId: string, memberId: string, updates: Partial<FamilyMember>) => void;
  deleteMember: (regId: string, memberId: string) => void;
  
  addPayment: (regId: string, payment: Omit<Payment, 'id' | 'registrationId'>) => void;
  
  cancelRegistration: (regId: string, refundInfo: {
    refundDate: string;
    refundAmount: number;
    deductionAmount: number;
    deductionReason: string;
    refundMethod: string;
    operator: string;
  }) => void;
  
  markReminderRead: (id: string) => void;
  markAllRemindersRead: () => void;
  
  setCurrentTrip: (tripId: string | null) => void;
  
  autoRoomAssignment: (tripId: string) => void;
  updateRoomAssignment: (tripId: string, assignments: RoomAssignment[]) => void;
  
  autoBusAssignment: (tripId: string) => void;
  updateBusAssignment: (tripId: string, assignments: BusAssignment[]) => void;
  
  refreshReminders: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      registrations: MOCK_REGISTRATIONS,
      trips: MOCK_TRIPS,
      reminders: generateReminders(MOCK_REGISTRATIONS, MOCK_TRIPS),
      roomAssignments: [],
      busAssignments: [],
      currentTripId: MOCK_TRIPS[0]?.id || null,

      addRegistration: (reg) => {
        const newReg: Registration = {
          ...reg,
          id: generateId('reg'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          registrations: [...state.registrations, newReg],
        }));
        get().refreshReminders();
        return newReg;
      },

      updateRegistration: (id, updates) => {
        set((state) => ({
          registrations: state.registrations.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          ),
        }));
        get().refreshReminders();
      },

      deleteRegistration: (id) => {
        set((state) => ({
          registrations: state.registrations.filter((r) => r.id !== id),
        }));
        get().refreshReminders();
      },

      getRegistration: (id) => {
        return get().registrations.find((r) => r.id === id);
      },

      addMember: (regId, member) => {
        const newMember: FamilyMember = {
          ...member,
          id: generateId('mem'),
          registrationId: regId,
        };
        set((state) => {
          const reg = state.registrations.find((r) => r.id === regId);
          if (!reg) return state;
          
          const updatedMembers = [...reg.members, newMember];
          const memberCount = updatedMembers.length;
          
          let totalAmount = reg.basePrice * memberCount;
          
          if (reg.insurance) {
            totalAmount += reg.insurance.premiumPerPerson * memberCount;
          }
          
          const roomPrice = reg.roomBooking.roomPrice * reg.roomBooking.roomCount;
          totalAmount += roomPrice;
          
          const depositAmount = calculateDeposit(totalAmount);
          const finalPaymentAmount = totalAmount - depositAmount;
          
          return {
            registrations: state.registrations.map((r) =>
              r.id === regId
                ? {
                    ...r,
                    members: updatedMembers,
                    totalAmount,
                    depositAmount,
                    finalPaymentAmount,
                    updatedAt: new Date().toISOString(),
                  }
                : r
            ),
          };
        });
        get().refreshReminders();
      },

      updateMember: (regId, memberId, updates) => {
        set((state) => ({
          registrations: state.registrations.map((r) =>
            r.id === regId
              ? {
                  ...r,
                  members: r.members.map((m) =>
                    m.id === memberId ? { ...m, ...updates } : m
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        }));
        get().refreshReminders();
      },

      deleteMember: (regId, memberId) => {
        set((state) => {
          const reg = state.registrations.find((r) => r.id === regId);
          if (!reg) return state;
          
          const updatedMembers = reg.members.filter((m) => m.id !== memberId);
          const memberCount = updatedMembers.length;
          
          if (memberCount === 0) return state;
          
          let totalAmount = reg.basePrice * memberCount;
          
          if (reg.insurance) {
            totalAmount += reg.insurance.premiumPerPerson * memberCount;
          }
          
          const roomPrice = reg.roomBooking.roomPrice * reg.roomBooking.roomCount;
          totalAmount += roomPrice;
          
          const depositAmount = calculateDeposit(totalAmount);
          const finalPaymentAmount = totalAmount - depositAmount;
          
          return {
            registrations: state.registrations.map((r) =>
              r.id === regId
                ? {
                    ...r,
                    members: updatedMembers,
                    totalAmount,
                    depositAmount,
                    finalPaymentAmount,
                    updatedAt: new Date().toISOString(),
                  }
                : r
            ),
          };
        });
        get().refreshReminders();
      },

      addPayment: (regId, payment) => {
        const newPayment: Payment = {
          ...payment,
          id: generateId('pay'),
          registrationId: regId,
        };
        
        set((state) => {
          const reg = state.registrations.find((r) => r.id === regId);
          if (!reg) return state;
          
          const updatedPayments = [...reg.payments, newPayment];
          const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
          
          let newStatus = reg.status;
          if (totalPaid >= reg.totalAmount) {
            newStatus = 'fully_paid';
          } else if (totalPaid >= reg.depositAmount || payment.paymentType === 'deposit') {
            newStatus = 'deposit_paid';
          }
          
          return {
            registrations: state.registrations.map((r) =>
              r.id === regId
                ? {
                    ...r,
                    payments: updatedPayments,
                    status: newStatus,
                    updatedAt: new Date().toISOString(),
                  }
                : r
            ),
          };
        });
        get().refreshReminders();
      },

      cancelRegistration: (regId, refundInfo) => {
        set((state) => ({
          registrations: state.registrations.map((r) =>
            r.id === regId
              ? {
                  ...r,
                  status: 'cancelled',
                  refund: {
                    id: generateId('ref'),
                    registrationId: regId,
                    ...refundInfo,
                    status: 'completed',
                  },
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        }));
        get().refreshReminders();
      },

      markReminderRead: (id) => {
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, read: true } : r
          ),
        }));
      },

      markAllRemindersRead: () => {
        set((state) => ({
          reminders: state.reminders.map((r) => ({ ...r, read: true })),
        }));
      },

      setCurrentTrip: (tripId) => {
        set({ currentTripId: tripId });
      },

      autoRoomAssignment: (tripId) => {
        const tripRegistrations = get().registrations.filter(
          (r) => r.tripId === tripId && r.status !== 'cancelled' && r.status !== 'refunded'
        );
        
        const assignments: RoomAssignment[] = [];
        let roomNumber = 101;
        
        for (const reg of tripRegistrations) {
          const memberCount = reg.members.length;
          const roomType = ROOM_TYPES.find((rt) => rt.name === reg.roomBooking.roomType) || ROOM_TYPES[0];
          
          const roomsNeeded = reg.roomBooking.roomCount;
          
          for (let i = 0; i < roomsNeeded; i++) {
            assignments.push({
              id: generateId('room'),
              tripId,
              roomNo: String(roomNumber++),
              roomType: roomType.name,
              capacity: roomType.capacity,
              registrationIds: [reg.id],
              memberIds: reg.members.map((m) => m.id),
              notes: reg.roomBooking.sharingRequest,
            });
          }
        }
        
        set((state) => ({
          roomAssignments: [
            ...state.roomAssignments.filter((a) => a.tripId !== tripId),
            ...assignments,
          ],
        }));
      },

      updateRoomAssignment: (tripId, assignments) => {
        set((state) => ({
          roomAssignments: [
            ...state.roomAssignments.filter((a) => a.tripId !== tripId),
            ...assignments,
          ],
        }));
      },

      autoBusAssignment: (tripId) => {
        const tripRegistrations = get().registrations.filter(
          (r) => r.tripId === tripId && r.status !== 'cancelled' && r.status !== 'refunded'
        );
        
        const totalMembers = tripRegistrations.reduce((sum, r) => sum + r.members.length, 0);
        const busCapacity = 45;
        const busCount = Math.ceil(totalMembers / busCapacity);
        
        const assignments: BusAssignment[] = [];
        let currentRegIndex = 0;
        
        for (let i = 0; i < busCount; i++) {
          const busNo = String.fromCharCode(65 + i) + '车';
          const busRegs: string[] = [];
          const busMembers: string[] = [];
          let currentCount = 0;
          
          while (currentRegIndex < tripRegistrations.length && currentCount < busCapacity) {
            const reg = tripRegistrations[currentRegIndex];
            if (currentCount + reg.members.length <= busCapacity) {
              busRegs.push(reg.id);
              busMembers.push(...reg.members.map((m) => m.id));
              currentCount += reg.members.length;
              currentRegIndex++;
            } else {
              break;
            }
          }
          
          assignments.push({
            id: generateId('bus'),
            tripId,
            busNo,
            capacity: busCapacity,
            registrationIds: busRegs,
            memberIds: busMembers,
          });
        }
        
        set((state) => ({
          busAssignments: [
            ...state.busAssignments.filter((a) => a.tripId !== tripId),
            ...assignments,
          ],
        }));
      },

      updateBusAssignment: (tripId, assignments) => {
        set((state) => ({
          busAssignments: [
            ...state.busAssignments.filter((a) => a.tripId !== tripId),
            ...assignments,
          ],
        }));
      },

      refreshReminders: () => {
        const { registrations, trips } = get();
        set({ reminders: generateReminders(registrations, trips) });
      },
    }),
    {
      name: 'parent-trip-storage',
      partialize: (state) => ({
        registrations: state.registrations,
        roomAssignments: state.roomAssignments,
        busAssignments: state.busAssignments,
        currentTripId: state.currentTripId,
      }),
    }
  )
);
