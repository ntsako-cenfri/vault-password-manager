import api from './client'
import type { GrantedItem, ItemGrant } from '@/types'

export const grantsApi = {
  grantAccess: (itemId: string, email: string) =>
    api.post<ItemGrant>(`/shares/vault/${itemId}/grant`, { email }),

  listGrants: (itemId: string) =>
    api.get<ItemGrant[]>(`/shares/vault/${itemId}/grants`),

  revokeGrant: (itemId: string, grantId: string) =>
    api.delete(`/shares/vault/${itemId}/grant/${grantId}`),

  listSharedWithMe: () =>
    api.get<GrantedItem[]>('/vault/shared'),
}
