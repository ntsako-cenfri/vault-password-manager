import api from './client'
import type { User, UserVaultResponse } from '@/types'

export const usersApi = {
  list: () => api.get<User[]>('/users'),
  assignRole: (userId: string, role: string) =>
    api.patch<User>(`/users/${userId}/role`, { role }),
  toggleActive: (userId: string) => api.patch<User>(`/users/${userId}/toggle-active`),
  getUserVault: (userId: string) => api.get<UserVaultResponse>(`/users/${userId}/vault`),
}
