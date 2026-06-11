import { create } from 'zustand';
import api from '@/api';
import type {
  Client,
  Artist,
  BodyPart,
  BookingDetail,
  DesignDetail,
  Alert,
  Deposit,
} from '@shared/types';

interface AppState {
  clients: Client[];
  artists: Artist[];
  bodyParts: BodyPart[];
  bookings: BookingDetail[];
  designs: DesignDetail[];
  alerts: Alert[];
  deposits: Deposit[];
  loading: Record<string, boolean>;
  selectedArtistId: number | null;
  currentDate: string;

  loadAllData: () => Promise<void>;
  loadClients: (filters?: { keyword?: string; hasAllergies?: boolean }) => Promise<void>;
  loadArtists: () => Promise<void>;
  loadBodyParts: () => Promise<void>;
  loadBookings: (filters?: {
    dateRange?: [string, string];
    artistId?: number;
    status?: string;
    clientId?: number;
  }) => Promise<void>;
  loadDesigns: (filters?: { clientId?: number; bookingId?: number }) => Promise<void>;
  loadAlerts: () => Promise<void>;
  loadDeposits: (bookingId?: number) => Promise<void>;

  setSelectedArtist: (id: number | null) => void;
  setCurrentDate: (date: string) => void;

  setLoading: (key: string, value: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  clients: [],
  artists: [],
  bodyParts: [],
  bookings: [],
  designs: [],
  alerts: [],
  deposits: [],
  loading: {},
  selectedArtistId: null,
  currentDate: new Date().toISOString().split('T')[0],

  loadAllData: async () => {
    await Promise.all([
      get().loadClients(),
      get().loadArtists(),
      get().loadBodyParts(),
      get().loadAlerts(),
    ]);
  },

  loadClients: async (filters) => {
    set({ loading: { ...get().loading, clients: true } });
    try {
      const data = await api.clients.list(filters);
      set({ clients: data });
    } finally {
      set({ loading: { ...get().loading, clients: false } });
    }
  },

  loadArtists: async () => {
    set({ loading: { ...get().loading, artists: true } });
    try {
      const data = await api.artists.list();
      set({ artists: data });
    } finally {
      set({ loading: { ...get().loading, artists: false } });
    }
  },

  loadBodyParts: async () => {
    try {
      const data = await api.bodyParts.list();
      set({ bodyParts: data });
    } catch (error) {
      console.error('Failed to load body parts:', error);
    }
  },

  loadBookings: async (filters) => {
    set({ loading: { ...get().loading, bookings: true } });
    try {
      const data = await api.bookings.list(filters);
      set({ bookings: data });
    } finally {
      set({ loading: { ...get().loading, bookings: false } });
    }
  },

  loadDesigns: async (filters) => {
    set({ loading: { ...get().loading, designs: true } });
    try {
      const data = await api.designs.list(filters);
      set({ designs: data });
    } finally {
      set({ loading: { ...get().loading, designs: false } });
    }
  },

  loadAlerts: async () => {
    set({ loading: { ...get().loading, alerts: true } });
    try {
      const data = await api.alerts.generate();
      set({ alerts: data });
    } finally {
      set({ loading: { ...get().loading, alerts: false } });
    }
  },

  loadDeposits: async (bookingId) => {
    set({ loading: { ...get().loading, deposits: true } });
    try {
      const data = await api.deposits.list(bookingId);
      set({ deposits: data });
    } finally {
      set({ loading: { ...get().loading, deposits: false } });
    }
  },

  setSelectedArtist: (id) => set({ selectedArtistId: id }),

  setCurrentDate: (date) => set({ currentDate: date }),

  setLoading: (key, value) =>
    set({ loading: { ...get().loading, [key]: value } }),
}));

export default useAppStore;
