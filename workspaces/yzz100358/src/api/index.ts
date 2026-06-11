import type {
  Client,
  ClientInput,
  Artist,
  BodyPart,
  Booking,
  BookingDetail,
  BookingInput,
  ConflictCheckResult,
  TattooDesign,
  DesignDetail,
  DesignInput,
  Deposit,
  DepositInput,
  Alert,
  ImageCheckResult,
} from '@shared/types';

export const api = {
  clients: {
    list: (filters?: { keyword?: string; hasAllergies?: boolean }): Promise<Client[]> =>
      window.electronAPI.clients.list(filters) as Promise<Client[]>,
    get: (id: number): Promise<Client | undefined> =>
      window.electronAPI.clients.get(id) as Promise<Client | undefined>,
    save: (client: ClientInput): Promise<Client> =>
      window.electronAPI.clients.save(client) as Promise<Client>,
    delete: (id: number): Promise<boolean> =>
      window.electronAPI.clients.delete(id),
  },

  artists: {
    list: (activeOnly = true): Promise<Artist[]> =>
      window.electronAPI.artists.list(activeOnly) as Promise<Artist[]>,
    save: (artist: Partial<Artist> & { name: string }): Promise<Artist> =>
      window.electronAPI.artists.save(artist) as Promise<Artist>,
  },

  bodyParts: {
    list: (): Promise<BodyPart[]> =>
      window.electronAPI.bodyParts.list() as Promise<BodyPart[]>,
  },

  bookings: {
    list: (filters?: {
      dateRange?: [string, string];
      artistId?: number;
      status?: string;
      clientId?: number;
    }): Promise<BookingDetail[]> =>
      window.electronAPI.bookings.list(filters) as Promise<BookingDetail[]>,
    get: (id: number): Promise<BookingDetail | undefined> =>
      window.electronAPI.bookings.get(id) as Promise<BookingDetail | undefined>,
    checkConflict: (
      artistId: number,
      startTime: string,
      endTime: string,
      excludeBookingId?: number
    ): Promise<ConflictCheckResult> =>
      window.electronAPI.bookings.checkConflict(artistId, startTime, endTime, excludeBookingId) as Promise<ConflictCheckResult>,
    save: (booking: BookingInput): Promise<BookingDetail> =>
      window.electronAPI.bookings.save(booking) as Promise<BookingDetail>,
    cancel: (id: number): Promise<boolean> =>
      window.electronAPI.bookings.cancel(id),
    today: (artistId?: number): Promise<BookingDetail[]> =>
      window.electronAPI.bookings.today(artistId) as Promise<BookingDetail[]>,
  },

  designs: {
    list: (filters?: { clientId?: number; bookingId?: number }): Promise<DesignDetail[]> =>
      window.electronAPI.designs.list(filters) as Promise<DesignDetail[]>,
    get: (id: number): Promise<DesignDetail | undefined> =>
      window.electronAPI.designs.get(id) as Promise<DesignDetail | undefined>,
    save: (design: DesignInput): Promise<DesignDetail> =>
      window.electronAPI.designs.save(design) as Promise<DesignDetail>,
    delete: (id: number): Promise<boolean> =>
      window.electronAPI.designs.delete(id),
    checkImages: (): Promise<ImageCheckResult> =>
      window.electronAPI.designs.checkImages() as Promise<ImageCheckResult>,
    uploadImage: (sourcePath: string, designId: number): Promise<{ savedPath: string }> =>
      window.electronAPI.designs.uploadImage(sourcePath, designId),
  },

  deposits: {
    list: (bookingId?: number): Promise<Deposit[]> =>
      window.electronAPI.deposits.list(bookingId) as Promise<Deposit[]>,
    save: (deposit: DepositInput): Promise<Deposit> =>
      window.electronAPI.deposits.save(deposit) as Promise<Deposit>,
    uploadImage: (sourcePath: string, bookingId: number): Promise<{ savedPath: string }> =>
      window.electronAPI.deposits.uploadImage(sourcePath, bookingId),
  },

  alerts: {
    generate: (): Promise<Alert[]> =>
      window.electronAPI.alerts.generate() as Promise<Alert[]>,
  },

  export: {
    confirmation: (bookingId: number, version: 'client' | 'internal'): Promise<{ success: boolean; filePath: string | null }> =>
      window.electronAPI.export.confirmation(bookingId, version),
  },

  dialog: {
    openFile: (filters?: unknown): Promise<string | null> =>
      window.electronAPI.dialog.openFile(filters),
    openDirectory: (): Promise<string | null> =>
      window.electronAPI.dialog.openDirectory(),
  },

  fs: {
    fileExists: (filePath: string): Promise<boolean> =>
      window.electronAPI.fs.fileExists(filePath),
    readFile: (filePath: string): Promise<string> =>
      window.electronAPI.fs.readFile(filePath),
  },

  app: {
    getDbPath: (): Promise<string> =>
      window.electronAPI.app.getDbPath(),
    backupDb: (): Promise<{ success: boolean; filePath: string | null }> =>
      window.electronAPI.app.backupDb(),
    restoreDb: (): Promise<{ success: boolean; backupPath?: string }> =>
      window.electronAPI.app.restoreDb(),
  },
};

export default api;
