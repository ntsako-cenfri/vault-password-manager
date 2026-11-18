import api from './client'
import type { User, UserVaultResponse, VpnConfig } from '@/types'

export interface InviteResult {
  email: string
  token: string
  invite_link: string
  expires_in_days: number
}

export const usersApi = {
  list: () => api.get<User[]>('/users'),
  assignRole: (userId: string, role: string) =>
    api.patch<User>(`/users/${userId}/role`, { role }),
  toggleActive: (userId: string) => api.patch<User>(`/users/${userId}/toggle-active`),
  getUserVault: (userId: string) => api.get<UserVaultResponse>(`/users/${userId}/vault`),
  invite: (emails: string[]) => api.post<InviteResult[]>('/users/invite', { emails }),
  setSftp: (userId: string, enabled: boolean, username?: string) =>
    api.patch<User>(`/users/${userId}/sftp`, { enabled, username: username || null }),
  setVpn: (userId: string, enabled: boolean) => api.patch<User>(`/users/${userId}/vpn`, { enabled }),
  getVpnConfig: (userId: string) => api.get<VpnConfig>(`/users/${userId}/vpn/config`),
  resetPassword: (userId: string) =>
    api.post<{ temporary_password: string }>(`/users/${userId}/reset-password`),
}
