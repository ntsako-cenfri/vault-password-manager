import api from './client'
import type { CredentialField, VaultItem } from '@/types'

export const vaultApi = {
  list: () => api.get<VaultItem[]>('/vault'),

  get: (id: string) => api.get<VaultItem>(`/vault/${id}`),

  create: (title: string, description: string | null, fields: object[]) =>
    api.post<VaultItem>('/vault', { title, description, fields }),

  update: (id: string, data: { title?: string; description?: string }) =>
    api.patch<VaultItem>(`/vault/${id}`, data),

  delete: (id: string) => api.delete(`/vault/${id}`),

  addField: (itemId: string, field: object) =>
    api.post<CredentialField>(`/vault/${itemId}/fields`, field),

  uploadField: (itemId: string, form: FormData) =>
    api.post<CredentialField>(`/vault/${itemId}/fields/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  downloadField: (itemId: string, fieldId: string) =>
    api.get(`/vault/${itemId}/fields/${fieldId}/download`, { responseType: 'blob' }),

  deleteField: (itemId: string, fieldId: string) =>
    api.delete(`/vault/${itemId}/fields/${fieldId}`),
}
