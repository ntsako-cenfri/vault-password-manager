import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Share2, Trash2, Clock, User as UserIcon } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { vaultApi } from '@/api/vault'
import { useVaultStore } from '@/store/vaultStore'
import { Button } from '@/components/ui/Button'
import { FIELD_TYPE_LABELS, FILE_FIELD_TYPES } from '@/types'
import type { VaultItem } from '@/types'

interface Props {
  item: VaultItem
  onShare: (item: VaultItem) => void
}

export function VaultItemCard({ item, onShare }: Props) {
  const navigate = useNavigate()
  const removeFromStore = useVaultStore((s) => s.remove)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState(false)

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

  const sensitiveTypes = ['password', 'api_key', 'ssh_key']

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
        </div>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={() => onShare(item)} title="Share">
            <Share2 size={14} />
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting} title="Delete">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Fields preview */}
      {item.fields.length > 0 && (
        <div className="flex flex-col gap-2">
          {item.fields.slice(0, 4).map((field) => {
            const isFile = FILE_FIELD_TYPES.includes(field.field_type)
            const isSensitive = sensitiveTypes.includes(field.field_type)
            const isHidden = isSensitive && !revealed[field.id]

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
                {isSensitive && (
                  <button
                    onClick={() => toggle(field.id)}
                    className="text-vault-muted hover:text-vault-text shrink-0"
                  >
                    {revealed[field.id] ? <EyeOff size={12} /> : <Eye size={12} />}
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
