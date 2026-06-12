import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OperatorUser {
  id: string
  name: string
  email: string
  role: string
  operatorId: string
  operatorName: string
  twoFactorEnabled: boolean
  phone: string | null
  avatarUrl: string | null
  // display preferences
  timezone: string
  language: string
  dateFormat: string
  timeFormat: string
}

interface OperatorAuthState {
  user: OperatorUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: OperatorUser, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
}

export const useOperatorAuthStore = create<OperatorAuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'operator-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
