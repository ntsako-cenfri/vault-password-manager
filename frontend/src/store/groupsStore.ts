import { create } from 'zustand'
import { groupsApi, type Group } from '@/api/groups'

interface GroupsState {
  groups: Group[]
  loading: boolean
  fetch: () => Promise<void>
  add: (g: Group) => void
  remove: (id: string) => void
}

/**
 * The authoritative list of groups a user has created — separate from
 * vault_items.category (plain text on each item). This is what makes an
 * empty group ("created but nothing filed under it yet") show up anywhere.
 */
export const useGroupsStore = create<GroupsState>((set) => ({
  groups: [],
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const { data } = await groupsApi.list()
      set({ groups: data })
    } finally {
      set({ loading: false })
    }
  },

  add: (g) =>
    set((s) =>
      s.groups.some((x) => x.id === g.id || x.name === g.name)
        ? s
        : { groups: [...s.groups, g].sort((a, b) => a.name.localeCompare(b.name)) }
    ),

  remove: (id) => set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),
}))
