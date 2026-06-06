import { create } from 'zustand'

interface PermissionDenied {
  message: string
  permissionKey: string | null
}

// Map of permission_key → state ('granted' | 'scoped' | 'none')
type PermMap = Record<string, string>

interface PermissionState {
  // 403 banner state
  denied: PermissionDenied | null
  setDenied: (denied: PermissionDenied) => void
  clearDenied: () => void

  // Current user's effective permissions
  permMap: PermMap
  isSuperAdmin: boolean
  permissionsLoaded: boolean
  setPermissions: (permMap: PermMap, isSuperAdmin: boolean) => void
  clearPermissions: () => void

  // Check a single key
  can: (key: string) => boolean
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  denied: null,
  setDenied: (denied) => set({ denied }),
  clearDenied: () => set({ denied: null }),

  permMap: {},
  isSuperAdmin: false,
  permissionsLoaded: false,

  setPermissions: (permMap, isSuperAdmin) =>
    set({ permMap, isSuperAdmin, permissionsLoaded: true }),

  clearPermissions: () =>
    set({ permMap: {}, isSuperAdmin: false, permissionsLoaded: false }),

  can: (key: string) => {
    const { isSuperAdmin, permMap } = get()
    if (isSuperAdmin) return true
    const state = permMap[key]
    return state === 'granted' || state === 'scoped'
  },
}))
