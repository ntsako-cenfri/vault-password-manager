import api from './client'
import type { ShareLink, ShareMeta, SharedItemResponse } from '@/types'

export const sharesApi = {
  create: (itemId: string, body: { recipient_email?: string; is_strict?: boolean; expires_at?: string }) =>
    api.post<ShareLink>(`/shares/vault/${itemId}`, body),

  list: (itemId: string) => api.get<ShareLink[]>(`/shares/vault/${itemId}`),

  revoke: (token: string) => api.delete(`/shares/${token}`),

  resolve: (token: string) => api.get<ShareMeta>(`/shares/resolve/${token}`),

  access: (token: string) => api.get<SharedItemResponse>(`/shares/access/${token}`),
}
