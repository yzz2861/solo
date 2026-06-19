import { create } from 'zustand';
import type { Booking, Room, Package, ConflictAlert, BookingStatus } from '@/types';
import { initializeData, saveRooms, savePackages, saveBookings } from '@/utils/storage';
import { generateId, addMinutesToTime } from '@/utils/timeUtils';
import { detectConflicts, checkBookingConflict } from '@/utils/conflictDetector';
import { calculateExtendFee } from '@/utils/statsCalculator';

interface BookingState {
  rooms: Room[];
  packages: Package[];
  bookings: Booking[];
  alerts: ConflictAlert[];
  selectedDate: Date;

  init: () => void;
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'status' | 'extendedMinutes' | 'extendedFee' | 'packageReady' | 'notes'> & { notes?: string }) => { success: boolean; message?: string };
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;

  checkIn: (id: string) => void;
  startUsing: (id: string) => void;
  completeBooking: (id: string) => void;
  startCleaning: (id: string) => void;
  finishCleaning: (id: string) => void;
  togglePackageReady: (id: string) => void;

  extendBooking: (id: string, minutes: number) => { success: boolean; message?: string };

  setSelectedDate: (date: Date) => void;
  refreshAlerts: () => void;

  getBookingById: (id: string) => Booking | undefined;
  getRoomById: (id: string) => Room | undefined;
  getPackageById: (id: string) => Package | undefined;
  getBookingsByRoom: (roomId: string) => Booking[];
}

const initialData = initializeData();

export const useBookingStore = create<BookingState>((set, get) => ({
  rooms: initialData.rooms,
  packages: initialData.packages,
  bookings: initialData.bookings,
  alerts: [],
  selectedDate: new Date(),

  init: () => {
    const data = initializeData();
    set({ rooms: data.rooms, packages: data.packages, bookings: data.bookings });
    get().refreshAlerts();
  },

  addBooking: (bookingData) => {
    const { bookings, rooms, packages } = get();

    const hasConflict = checkBookingConflict(
      {
        roomId: bookingData.roomId,
        scheduledArrival: bookingData.scheduledArrival,
        scheduledEnd: bookingData.scheduledEnd,
      },
      bookings
    );

    if (hasConflict) {
      return { success: false, message: '该时间段与现有预订冲突，请调整时间或换包间' };
    }

    const newBooking: Booking = {
      ...bookingData,
      id: generateId(),
      status: 'pending',
      extendedMinutes: 0,
      extendedFee: 0,
      packageReady: false,
      notes: bookingData.notes || '',
      createdAt: new Date().toISOString(),
    };

    const updatedBookings = [...bookings, newBooking];
    set({ bookings: updatedBookings });
    saveBookings(updatedBookings);
    get().refreshAlerts();

    return { success: true };
  },

  updateBooking: (id, updates) => {
    const { bookings } = get();
    const updatedBookings = bookings.map((b) => (b.id === id ? { ...b, ...updates } : b));
    set({ bookings: updatedBookings });
    saveBookings(updatedBookings);
    get().refreshAlerts();
  },

  deleteBooking: (id) => {
    const { bookings } = get();
    const updatedBookings = bookings.filter((b) => b.id !== id);
    set({ bookings: updatedBookings });
    saveBookings(updatedBookings);
    get().refreshAlerts();
  },

  checkIn: (id) => {
    get().updateBooking(id, {
      status: 'checked-in',
      actualArrival: new Date().toISOString(),
    });
  },

  startUsing: (id) => {
    get().updateBooking(id, { status: 'in-use' });
  },

  completeBooking: (id) => {
    const { bookings } = get();
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;

    const now = new Date().toISOString();
    const updatedBookings = bookings.map((b) =>
      b.id === id
        ? {
            ...b,
            status: 'completed' as BookingStatus,
            actualEnd: now,
            cleaningStart: now,
          }
        : b
    );
    set({ bookings: updatedBookings });
    saveBookings(updatedBookings);
    get().refreshAlerts();
  },

  startCleaning: (id) => {
    get().updateBooking(id, { cleaningStart: new Date().toISOString() });
  },

  finishCleaning: (id) => {
    get().updateBooking(id, { cleaningEnd: new Date().toISOString() });
  },

  togglePackageReady: (id) => {
    const { bookings } = get();
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;
    get().updateBooking(id, { packageReady: !booking.packageReady });
  },

  extendBooking: (id, minutes) => {
    const { bookings, rooms, packages } = get();
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return { success: false, message: '预订不存在' };

    const pkg = packages.find((p) => p.id === booking.packageId);
    if (!pkg) return { success: false, message: '套餐不存在' };

    const newEndTime = addMinutesToTime(booking.scheduledEnd, minutes);

    const hasConflict = checkBookingConflict(
      {
        id: booking.id,
        roomId: booking.roomId,
        scheduledArrival: booking.scheduledArrival,
        scheduledEnd: newEndTime,
      },
      bookings
    );

    if (hasConflict) {
      return { success: false, message: '加钟后与下一桌预订冲突，请先沟通调整' };
    }

    const extendFee = calculateExtendFee(pkg.price, pkg.duration, minutes);

    const updatedBookings = bookings.map((b) =>
      b.id === id
        ? {
            ...b,
            scheduledEnd: newEndTime,
            extendedMinutes: b.extendedMinutes + minutes,
            extendedFee: b.extendedFee + extendFee,
          }
        : b
    );

    set({ bookings: updatedBookings });
    saveBookings(updatedBookings);
    get().refreshAlerts();

    return { success: true };
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().refreshAlerts();
  },

  refreshAlerts: () => {
    const { bookings, rooms, packages } = get();
    const alerts = detectConflicts(bookings, rooms, packages);
    set({ alerts });
  },

  getBookingById: (id) => {
    return get().bookings.find((b) => b.id === id);
  },

  getRoomById: (id) => {
    return get().rooms.find((r) => r.id === id);
  },

  getPackageById: (id) => {
    return get().packages.find((p) => p.id === id);
  },

  getBookingsByRoom: (roomId) => {
    return get().bookings.filter((b) => b.roomId === roomId);
  },
}));
