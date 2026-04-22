import { create } from 'zustand'
import { vaultApi } from '@/api/vault'
import type { VaultItem } from '@/types'

interface VaultState {
  items: VaultItem[]
  loading: boolean
  fetch: () => Promise<void>
  remove: (id: string) => void
  upsert: (item: VaultItem) => void
}

export const useVaultStore = create<VaultState>((set) => ({
  items: [],
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const { data } = await vaultApi.list()
      set({ items: data })
    } finally {
      set({ loading: false })
    }
  },

  remove: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  upsert: (item) =>
    set((s) => {
      const exists = s.items.find((i) => i.id === item.id)
      return exists
        ? { items: s.items.map((i) => (i.id === item.id ? item : i)) }
        : { items: [item, ...s.items] }
    }),
}))
