import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Pet, Owner, Groomer, Assistant, Appointment, Alert } from '@/types'
import { SEED_GROOMERS, SEED_ASSISTANTS, SEED_OWNERS, SEED_PETS, SEED_APPOINTMENTS } from '@/utils/seed'
import { getAlertsForAppointment } from '@/utils/alerts'
import { findConflicts } from '@/utils/conflicts'

interface AppointmentStore {
  appointments: Appointment[]
  pets: Pet[]
  owners: Owner[]
  groomers: Groomer[]
  assistants: Assistant[]
  initialized: boolean

  initSeed: () => void
  addAppointment: (apt: Appointment) => void
  updateAppointment: (id: string, data: Partial<Appointment>) => void
  deleteAppointment: (id: string) => void

  addPet: (pet: Pet) => void
  updatePet: (id: string, data: Partial<Pet>) => void

  addOwner: (owner: Owner) => void
  updateOwner: (id: string, data: Partial<Owner>) => void

  getPetById: (id: string) => Pet | undefined
  getOwnerById: (id: string) => Owner | undefined
  getGroomerById: (id: string) => Groomer | undefined

  getAppointmentsByDate: (date: string) => Appointment[]
  getAppointmentsByGroomer: (groomerId: string, date: string) => Appointment[]
  getConflicts: (groomerId: string, date: string, start: string, end: string, excludeId?: string) => Appointment[]
  getAlerts: (appointment: Appointment) => Alert[]
  getAllAlertsForDate: (date: string) => Alert[]
}

export const useStore = create<AppointmentStore>()(
  persist(
    (set, get) => ({
      appointments: [],
      pets: [],
      owners: [],
      groomers: SEED_GROOMERS,
      assistants: SEED_ASSISTANTS,
      initialized: false,

      initSeed: () => {
        const state = get()
        if (!state.initialized) {
          set({
            appointments: SEED_APPOINTMENTS,
            pets: SEED_PETS,
            owners: SEED_OWNERS,
            initialized: true,
          })
        }
      },

      addAppointment: (apt) =>
        set((state) => ({ appointments: [...state.appointments, apt] })),

      updateAppointment: (id, data) =>
        set((state) => ({
          appointments: state.appointments.map((apt) =>
            apt.id === id ? { ...apt, ...data } : apt
          ),
        })),

      deleteAppointment: (id) =>
        set((state) => ({
          appointments: state.appointments.filter((apt) => apt.id !== id),
        })),

      addPet: (pet) =>
        set((state) => ({ pets: [...state.pets, pet] })),

      updatePet: (id, data) =>
        set((state) => ({
          pets: state.pets.map((p) => (p.id === id ? { ...p, ...data } : p)),
        })),

      addOwner: (owner) =>
        set((state) => ({ owners: [...state.owners, owner] })),

      updateOwner: (id, data) =>
        set((state) => ({
          owners: state.owners.map((o) => (o.id === id ? { ...o, ...data } : o)),
        })),

      getPetById: (id) => get().pets.find((p) => p.id === id),
      getOwnerById: (id) => get().owners.find((o) => o.id === id),
      getGroomerById: (id) => get().groomers.find((g) => g.id === id),

      getAppointmentsByDate: (date) =>
        get().appointments.filter((apt) => apt.date === date && apt.status !== 'cancelled'),

      getAppointmentsByGroomer: (groomerId, date) =>
        get().appointments.filter(
          (apt) => apt.groomerId === groomerId && apt.date === date && apt.status !== 'cancelled'
        ),

      getConflicts: (groomerId, date, start, end, excludeId) =>
        findConflicts(groomerId, date, start, end, get().appointments, excludeId),

      getAlerts: (appointment) => {
        const pet = get().getPetById(appointment.petId)
        return getAlertsForAppointment(appointment, pet, get().appointments)
      },

      getAllAlertsForDate: (date) => {
        const apts = get().getAppointmentsByDate(date)
        return apts.flatMap((apt) => get().getAlerts(apt))
      },
    }),
    {
      name: 'pet-grooming-store',
    }
  )
)
