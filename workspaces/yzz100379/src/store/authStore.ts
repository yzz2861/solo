import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Staff, StaffRole } from '@/shared/types'

interface AuthState {
  staff: Staff | null
  login: (staff: Staff) => void
  logout: () => void
  isAuthenticated: boolean
  userRole: StaffRole | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      staff: null,
      isAuthenticated: false,
      userRole: null,
      login: (staff: Staff) => {
        localStorage.setItem('auth_token', staff.id)
        set({ staff, isAuthenticated: true, userRole: staff.role })
      },
      logout: () => {
        localStorage.removeItem('auth_token')
        set({ staff: null, isAuthenticated: false, userRole: null })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        staff: state.staff,
        isAuthenticated: state.isAuthenticated,
        userRole: state.userRole,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            const token = localStorage.getItem('auth_token')
            if (!token || !state.staff) {
              state.staff = null
              state.isAuthenticated = false
              state.userRole = null
            }
          }
        }
      },
    }
  )
)
