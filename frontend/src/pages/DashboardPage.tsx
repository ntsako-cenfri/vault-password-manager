import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, LayoutGrid, Users } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { VaultItemCard } from '@/components/vault/VaultItemCard'
import { ShareModal } from '@/components/vault/ShareModal'
import { Button } from '@/components/ui/Button'
import { useVaultStore } from '@/store/vaultStore'
import type { VaultItem } from '@/types'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { items, loading, fetch, sharedItems, sharedLoading, fetchShared } = useVaultStore()
  const [search, setSearch] = useState('')
  const [shareTarget, setShareTarget] = useState<VaultItem | null>(null)

  useEffect(() => {
    fetch()
    fetchShared()

    // Re-fetch shared items when the tab becomes visible again (e.g. user was on
    // another tab while someone granted them access) and every 30 s while active.
    const onVisible = () => { if (document.visibilityState === 'visible') fetchShared() }
    document.addEventListener('visibilitychange', onVisible)

    const poll = setInterval(fetchShared, 30_000)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(poll)
    }
  }, [fetch, fetchShared])

  const q = search.toLowerCase()
  const filtered = items.filter((i) =>
    i.title.toLowerCase().includes(q) ||
    i.description?.toLowerCase().includes(q)
  )
  const filteredShared = sharedItems.filter((gi) =>
    gi.item.title.toLowerCase().includes(q) ||
    gi.item.description?.toLowerCase().includes(q)
  )

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Vault</h1>
          <p className="text-xs text-vault-muted mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => navigate('/vault/new')}>
          <Plus size={16} /> New Item
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          className="w-full bg-vault-surface border border-vault-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-vault-text placeholder:text-vault-muted/50 outline-none focus:border-vault-primary transition-colors"
        />
      </div>

      {/* My Vault */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass rounded-2xl h-40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 && !search ? (
        <motion.div
          className="flex flex-col items-center gap-3 py-20 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="p-5 rounded-2xl bg-vault-elevated text-vault-muted">
            <LayoutGrid size={28} />
          </div>
          <p className="text-vault-muted text-sm">No items yet — create your first</p>
          <Button onClick={() => navigate('/vault/new')} size="sm">
            <Plus size={14} /> New Item
          </Button>
        </motion.div>
      ) : (
        <>
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <AnimatePresence>
                {filtered.map((item) => (
                  <VaultItemCard key={item.id} item={item} onShare={setShareTarget} />
                ))}
              </AnimatePresence>
            </div>
          )}
          {search && filtered.length === 0 && filteredShared.length === 0 && (
            <p className="text-vault-muted text-sm text-center py-10">No items match your search</p>
          )}
        </>
      )}

      {/* Shared with me */}
      {(sharedItems.length > 0 || sharedLoading) && (
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-vault-accent/10 text-vault-accent">
              <Users size={14} />
            </div>
            <h2 className="text-sm font-semibold text-vault-text">Shared with me</h2>
            <span className="text-xs text-vault-muted">{sharedItems.length} item{sharedItems.length !== 1 ? 's' : ''}</span>
          </div>

          {sharedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass rounded-2xl h-40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredShared.map((gi) => (
                  <VaultItemCard
                    key={gi.grant_id}
                    item={gi.item}
                    readOnly
                    sharedBy={gi.granted_by_username}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Share modal */}
      {shareTarget && (
        <ShareModal
          item={shareTarget}
          open={!!shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}
    </Layout>
  )
}
