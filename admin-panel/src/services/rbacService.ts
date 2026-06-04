import api from '../lib/axios'

export interface Role {
  id: string
  name: string
  description: string
  is_system: boolean
  scope: string
  version: number
  is_active: boolean
  member_count: number
  permission_count: number
  created_at: string
  updated_at: string
}

export interface RoleListResponse {
  items: Role[]
  total: number
}

export interface PermissionCatalogItem {
  key: string
  description: string
  domain: string
  is_scopeable: boolean
  held_by: number
}

export interface PermissionDomainGroup {
  domain: string
  items: PermissionCatalogItem[]
}

export interface PermissionCatalogResponse {
  domains: PermissionDomainGroup[]
  total: number
}

export interface RolePermissionItem {
  permission_key: string
  description: string
  domain: string
  is_scopeable: boolean
  state: 'none' | 'scoped' | 'granted'
  scope_data: string | null
}

export interface RolePermissionsResponse {
  role_id: string
  permissions: RolePermissionItem[]
}

export interface RbacStats {
  total_roles: number
  system_roles: number
  custom_roles: number
  total_permissions: number
  admins_assigned: number
  pending_review: number
}

export interface RoleCreate {
  name: string
  description: string
  is_system: boolean
  scope: string
}

export interface RoleUpdate {
  name?: string
  description?: string
  scope?: string
}

export interface PermissionsPayload {
  permissions: Array<{ permission_key: string; state: string; scope_data: string | null }>
}

export const rbacService = {
  getStats: () =>
    api.get<RbacStats>('/rbac/stats').then(r => r.data),

  listRoles: () =>
    api.get<RoleListResponse>('/rbac/roles').then(r => r.data),

  getRole: (id: string) =>
    api.get<Role>(`/rbac/roles/${id}`).then(r => r.data),

  createRole: (body: RoleCreate) =>
    api.post<Role>('/rbac/roles', body).then(r => r.data),

  updateRole: (id: string, body: RoleUpdate) =>
    api.patch<Role>(`/rbac/roles/${id}`, body).then(r => r.data),

  deleteRole: (id: string) =>
    api.delete(`/rbac/roles/${id}`).then(r => r.data),

  getPermissionCatalog: () =>
    api.get<PermissionCatalogResponse>('/rbac/permissions').then(r => r.data),

  getRolePermissions: (roleId: string) =>
    api.get<RolePermissionsResponse>(`/rbac/roles/${roleId}/permissions`).then(r => r.data),

  setRolePermissions: (roleId: string, payload: PermissionsPayload) =>
    api.put<RolePermissionsResponse>(`/rbac/roles/${roleId}/permissions`, payload).then(r => r.data),
}
