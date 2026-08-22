import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Share2, Trash2, Clock, User as UserIcon, Copy, FolderInput } from 'lucide-react'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { vaultApi } from '@/api/vault'
import { useVaultStore } from '@/store/vaultStore'
import { useGroupsStore } from '@/store/groupsStore'
import { Button } from '@/components/ui/Button'
import { FIELD_TYPE_LABELS, FILE_FIELD_TYPES, SENSITIVE_FIELD_TYPES } from '@/types'
import type { VaultItem } from '@/types'

interface Props {
  item: VaultItem
  onShare?: (item: VaultItem) => void
  readOnly?: boolean
  sharedBy?: string
}

export function VaultItemCard({ item, onShare, readOnly = false, sharedBy }: Props) {
  const navigate = useNavigate()
  const { remove: removeFromStore, upsert } = useVaultStore()
  const { groups, fetch: fetchGroups } = useGroupsStore()
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState(false)
  const [editingGroup, setEditingGroup] = useState(false)
  const [groupDraft, setGroupDraft] = useState(item.category ?? '')
  const [savingGroup, setSavingGroup] = useState(false)

  const toggle = (id: string) => setRevealed((r) => ({ ...r, [id]: !r[id] }))

  const handleDelete = async () => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await vaultApi.delete(item.id)
      removeFromStore(item.id)
      toast.success('Item deleted')
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const startEditingGroup = (e: React.MouseEvent) => {
    e.stopPropagation()
    setGroupDraft(item.category ?? '')
    setEditingGroup(true)
  }

  const saveGroup = async () => {
    setSavingGroup(true)
    try {
      const { data } = await vaultApi.update(item.id, { category: groupDraft })
      upsert(data)
      fetchGroups() // pick up a newly-typed group name so the sidebar stays in sync
      toast.success(data.category ? `Moved to "${data.category}"` : 'Removed from group')
    } catch {
      toast.error('Could not update group')
    } finally {
      setSavingGroup(false)
      setEditingGroup(false)
    }
  }

  const isSensitive = (ft: string) => SENSITIVE_FIELD_TYPES.includes(ft as any)

  return (
    <motion.div
      layout
      className="glass rounded-2xl p-5 flex flex-col gap-4 hover:border-vault-primary/40 transition-colors group"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-vault-text truncate cursor-pointer hover:text-vault-primary transition-colors"
            onClick={() => navigate(`/vault/${item.id}`)}
          >
            {item.title}
          </h3>
          {item.description && (
            <p className="text-xs text-vault-muted mt-0.5 line-clamp-1">{item.description}</p>
          )}
          {sharedBy && (
            <p className="text-[10px] text-vault-accent mt-0.5">Shared by {sharedBy}</p>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={startEditingGroup} title="Move to group">
              <FolderInput size={14} />
            </Button>
            {onShare && (
              <Button variant="ghost" size="sm" onClick={() => onShare(item)} title="Share">
                <Share2 size={14} />
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting} title="Delete">
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </div>

      {/* Group badge / inline editor — always visible, not hover-only, so it's
          obvious at a glance which group an item is in (or that it has none). */}
      {!readOnly && editingGroup ? (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            list={`group-suggestions-${item.id}`}
            value={groupDraft}
            onChange={(e) => setGroupDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveGroup(); if (e.key === 'Escape') setEditingGroup(false) }}
            placeholder="Group — pick one or type a new name"
            className="flex-1 bg-vault-elevated border border-vault-border rounded-lg px-2.5 py-1.5 text-xs text-vault-text placeholder:text-vault-muted/50 outline-none focus:border-vault-primary transition-colors"
          />
          <datalist id={`group-suggestions-${item.id}`}>
            {groups.map((g) => <option key={g.id} value={g.name} />)}
          </datalist>
          <Button size="sm" onClick={saveGroup} loading={savingGroup}>Save</Button>
        </div>
      ) : (
        <button
          onClick={startEditingGroup}
          disabled={readOnly}
          className={clsx(
            'self-start px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors -mt-2',
            item.category
              ? 'bg-vault-primary/10 text-vault-primary hover:bg-vault-primary/20'
              : 'bg-vault-elevated text-vault-muted hover:text-vault-text border border-dashed border-vault-border',
          )}
        >
          {item.category || (readOnly ? 'No group' : '+ Add to group')}
        </button>
      )}

      {/* Fields preview */}
      {item.fields.length > 0 && (
        <div className="flex flex-col gap-2">
          {item.fields.slice(0, 4).map((field) => {
            const isFile = FILE_FIELD_TYPES.includes(field.field_type)
            const sensitive = isSensitive(field.field_type)
            const isHidden = sensitive && !revealed[field.id]

            return (
              <div key={field.id} className="flex items-center gap-2 text-xs">
                <span className="text-vault-muted w-20 shrink-0 truncate">
                  {FIELD_TYPE_LABELS[field.field_type]}
                </span>
                <span className={clsx(
                  'flex-1 truncate',
                  isFile ? 'text-vault-accent' : 'text-vault-text font-mono',
                  isHidden && 'blur-sm select-none',
                )}>
                  {isFile ? field.original_filename ?? '—' : (field.value ?? '—')}
                </span>
                {sensitive && (
                  <button
                    onClick={() => toggle(field.id)}
                    className="text-vault-muted hover:text-vault-text shrink-0"
                    title={revealed[field.id] ? 'Hide' : 'Show'}
                  >
                    {revealed[field.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                )}
                {!isFile && field.value && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(field.value ?? '')
                      toast.success('Copied!')
                    }}
                    className="text-vault-muted hover:text-vault-text shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy value"
                  >
                    <Copy size={12} />
                  </button>
                )}
              </div>
            )
          })}
          {item.fields.length > 4 && (
            <p className="text-xs text-vault-muted">+{item.fields.length - 4} more fields</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 text-[10px] text-vault-muted pt-1 border-t border-vault-border/60">
        <span className="flex items-center gap-1"><Clock size={10} /> {new Date(item.updated_at).toLocaleDateString()}</span>
        <span className="flex items-center gap-1"><UserIcon size={10} /> {item.fields.length} field{item.fields.length !== 1 ? 's' : ''}</span>
      </div>
    </motion.div>
  )
}
