import api from './client'
import type { User } from '@/types'

export const usersApi = {
  list: () => api.get<User[]>('/users'),
  assignRole: (userId: string, role: string) =>
    api.patch<User>(`/users/${userId}/role`, { role }),
  toggleActive: (userId: string) => api.patch<User>(`/users/${userId}/toggle-active`),
}
