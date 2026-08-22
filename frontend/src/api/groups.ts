import api from './client'

export interface Group {
  id: string
  name: string
  created_at: string
}

export const groupsApi = {
  list: () => api.get<Group[]>('/groups'),
  create: (name: string) => api.post<Group>('/groups', { name }),
  delete: (id: string) => api.delete(`/groups/${id}`),
}
