import type { VaultItem } from '@/types'

/** Label used for items with no category set. */
export const UNGROUPED = 'Other'

function keyOf(item: VaultItem): string {
  return item.category?.trim() || UNGROUPED
}

/** Distinct group names present in these items — alphabetical, "Other" always last. */
export function groupNames(items: VaultItem[]): string[] {
  const set = new Set(items.map(keyOf))
  return [...set].sort((a, b) => {
    if (a === UNGROUPED) return 1
    if (b === UNGROUPED) return -1
    return a.localeCompare(b)
  })
}

/** Buckets items by group name, in the same order as groupNames(). */
export function groupItems(items: VaultItem[]): Map<string, VaultItem[]> {
  const buckets = new Map<string, VaultItem[]>()
  for (const item of items) {
    const key = keyOf(item)
    const list = buckets.get(key)
    if (list) list.push(item)
    else buckets.set(key, [item])
  }
  return new Map(groupNames(items).map((name) => [name, buckets.get(name) ?? []]))
}
