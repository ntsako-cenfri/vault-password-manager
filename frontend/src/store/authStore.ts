import { create } from 'zustand'
import { authApi } from '@/api/auth'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  hydrate: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  hydrate: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) { set({ loading: false }); return }
    try {
      const { data } = await authApi.me()
      set({ user: data, loading: false })
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      set({ user: null, loading: false })
    }
  },

  login: async (email, password) => {
    const { data } = await authApi.login(email, password)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    const me = await authApi.me()
    set({ user: me.data })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null })
  },
}))
