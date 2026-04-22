import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link2, Copy, Trash2, Plus, Calendar, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { sharesApi } from '@/api/shares'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { VaultItem, ShareLink } from '@/types'

interface Props {
  item: VaultItem
  open: boolean
  onClose: () => void
}

export function ShareModal({ item, open, onClose }: Props) {
  const [shares, setShares] = useState<ShareLink[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [creating, setCreating] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')

  // Load existing shares when modal opens
  const handleOpen = async () => {
    if (!open) return
    setLoadingList(true)
    try {
      const { data } = await sharesApi.list(item.id)
      setShares(data)
    } finally {
      setLoadingList(false)
    }
  }

  // Track open state to trigger load
  useState(() => { if (open) handleOpen() })

  const createShare = async () => {
    setCreating(true)
    try {
      // Always strict, always expires in 24 hours
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const { data } = await sharesApi.create(item.id, {
        recipient_email: recipientEmail || undefined,
        is_strict: true,
        expires_at: expires,
      })
      setShares((prev) => [data, ...prev])
      setRecipientEmail('')
      toast.success('Share link created')
    } catch {
      toast.error('Failed to create share link')
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (token: string) => {
    try {
      await sharesApi.revoke(token)
      setShares((prev) => prev.filter((s) => s.token !== token))
      toast.success('Link revoked')
    } catch {
      toast.error('Failed to revoke')
    }
  }

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied!')
  }

  const shareUrl = (token: string) => `${window.location.origin}/share/${token}`

  return (
    <Modal open={open} onClose={onClose} title={`Share — ${item.title}`} maxWidth="max-w-xl">
      <div className="flex flex-col gap-5">
        {/* Create new share */}
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-vault-elevated border border-vault-border">
          <p className="text-xs font-medium text-vault-muted uppercase tracking-wider">New Share Link</p>

          <Input
            label="Recipient Email (optional — leaves link open if blank)"
            type="email"
            placeholder="teammate@company.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
          />

          <p className="text-xs text-vault-muted">
            Link expires in <span className="text-vault-primary font-medium">24 hours</span> · Requires login to view
          </p>

          <Button onClick={createShare} loading={creating} size="sm">
            <Plus size={14} /> Generate Link
          </Button>
        </div>

        {/* Existing shares */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-vault-muted uppercase tracking-wider">
            Active Links {loadingList && <span className="animate-pulse">…</span>}
          </p>

          {shares.length === 0 && !loadingList && (
            <p className="text-xs text-vault-muted text-center py-4">No active share links</p>
          )}

          {shares.map((share) => (
            <motion.div
              key={share.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-vault-border bg-vault-surface"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Link2 size={14} className="text-vault-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-vault-text truncate">{shareUrl(share.token)}</p>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-vault-muted">
                  {share.recipient_email && (
                    <span className="flex items-center gap-1"><Mail size={9} />{share.recipient_email}</span>
                  )}
                  {share.expires_at && (
                    <span className="flex items-center gap-1">
                      <Calendar size={9} /> Expires {new Date(share.expires_at).toLocaleDateString()}
                    </span>
                  )}
                  <span>{share.is_strict ? '🔒 Login required' : '🔓 Public'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => copyLink(share.token)} title="Copy link">
                  <Copy size={13} />
                </Button>
                <Button variant="danger" size="sm" onClick={() => revoke(share.token)} title="Revoke">
                  <Trash2 size={13} />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
