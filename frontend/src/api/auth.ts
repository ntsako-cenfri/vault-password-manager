import api from './client'
import type { TokenResponse, User } from '@/types'

export interface TotpSetupResponse {
  secret: string
  otpauth_uri: string
}

export const authApi = {
  setupStatus: () => api.get<{ setup_complete: boolean }>('/auth/setup/status'),

  setup: (email: string, username: string, password: string) =>
    api.post<User>('/auth/setup', { email, username, password }),

  register: (email: string, username: string, password: string, inviteToken?: string) =>
    api.post<User>('/auth/register', { email, username, password, ...(inviteToken ? { invite_token: inviteToken } : {}) }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),

  completePasswordChange: (password_change_token: string, new_password: string) =>
    api.post<TokenResponse>('/auth/complete-password-change', { password_change_token, new_password }),

  me: () => api.get<User>('/auth/me'),

  resetPassword: (current_password: string, new_password: string) =>
    api.post('/auth/reset-password', { current_password, new_password }),

  totpSetup: () =>
    api.post<TotpSetupResponse>('/auth/totp/setup'),

  totpEnable: (code: string) =>
    api.post('/auth/totp/enable', { code }),

  totpDisable: (code: string) =>
    api.post('/auth/totp/disable', { code }),

  totpVerifyLogin: (mfa_token: string, code: string) =>
    api.post<TokenResponse>('/auth/totp/verify-login', { mfa_token, code }),
}
