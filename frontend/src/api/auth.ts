import api from './client'
import type { TokenResponse, User } from '@/types'

export const authApi = {
  setupStatus: () => api.get<{ setup_complete: boolean }>('/auth/setup/status'),

  setup: (email: string, username: string, password: string) =>
    api.post<User>('/auth/setup', { email, username, password }),

  register: (email: string, username: string, password: string) =>
    api.post<User>('/auth/register', { email, username, password }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),

  me: () => api.get<User>('/auth/me'),

  resetPassword: (current_password: string, new_password: string) =>
    api.post('/auth/reset-password', { current_password, new_password }),
}
