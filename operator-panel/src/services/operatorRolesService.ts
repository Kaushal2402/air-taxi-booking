import api from '../lib/axios'

export interface OperatorRole {
  id: string
  name: string
  display_name: string
  is_system: boolean
  permissions: string[]
  user_count: number
}

export interface OperatorRoleCreate {
  name: string
  display_name: string
  permissions: string[]
}

export interface OperatorRoleUpdate {
  display_name?: string
  permissions?: string[]
}

export const operatorRolesService = {
  listRoles: (): Promise<OperatorRole[]> =>
    api.get<OperatorRole[]>('/roles').then(r => r.data),

  createRole: (body: OperatorRoleCreate): Promise<OperatorRole> =>
    api.post<OperatorRole>('/roles', body).then(r => r.data),

  updateRole: (id: string, body: OperatorRoleUpdate): Promise<OperatorRole> =>
    api.patch<OperatorRole>(`/roles/${id}`, body).then(r => r.data),

  assignRole: (userId: string, roleId: string): Promise<unknown> =>
    api.post(`/users/${userId}/assign-role`, { role_id: roleId }).then(r => r.data),

  listPermissions: (): Promise<{ permissions: string[] }> =>
    api.get<{ permissions: string[] }>('/roles/permissions').then(r => r.data),
}
