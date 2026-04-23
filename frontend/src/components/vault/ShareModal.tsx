import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link2, Copy, Trash2, Plus, Calendar, Mail, UserPlus, UserCheck, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { sharesApi } from '@/api/shares'
import { grantsApi } from '@/api/grants'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { VaultItem, ShareLink, ItemGrant } from '@/types'

interface Props {
  item: VaultItem
  open: boolean
  onClose: () => void
}

export function ShareModal({ item, open, onClose }: Props) {
  const [shares, setShares] = useState<ShareLink[]>([])
  const [grants, setGrants] = useState<ItemGrant[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [creating, setCreating] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [grantEmail, setGrantEmail] = useState('')
  const [granting, setGranting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoadingList(true)
    Promise.all([
      sharesApi.list(item.id),
      grantsApi.listGrants(item.id),
    ])
      .then(([s, g]) => {
        setShares(s.data)
        setGrants(g.data)
      })
      .finally(() => setLoadingList(false))
  }, [open, item.id])

  const createShare = async () => {
    setCreating(true)
    try {
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

  const revokeLink = async (token: string) => {
    try {
      await sharesApi.revoke(token)
      setShares((prev) => prev.filter((s) => s.token !== token))
      toast.success('Link revoked')
    } catch {
      toast.error('Failed to revoke')
    }
  }

  const grantAccess = async () => {
    if (!grantEmail.trim()) return
    setGranting(true)
    try {
      const { data } = await grantsApi.grantAccess(item.id, grantEmail.trim())
      setGrants((prev) => {
        const exists = prev.find((g) => g.id === data.id)
        return exists ? prev : [data, ...prev]
      })
      setGrantEmail('')
      toast.success('Access granted')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to grant access')
    } finally {
      setGranting(false)
    }
  }

  const revokeGrant = async (grantId: string) => {
    try {
      await grantsApi.revokeGrant(item.id, grantId)
      setGrants((prev) => prev.filter((g) => g.id !== grantId))
      toast.success('Access revoked')
    } catch {
      toast.error('Failed to revoke')
    }
  }

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${token}`)
    toast.success('Link copied!')
  }

  const shareUrl = (token: string) => `${window.location.origin}/share/${token}`

  return (
    <Modal open={open} onClose={onClose} title={`Share — ${item.title}`} maxWidth="max-w-xl">
      <div className="flex flex-col gap-5">

        {/* ── Direct user grants ─────────────────────────────── */}
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-vault-elevated border border-vault-border">
          <p className="text-xs font-medium text-vault-muted uppercase tracking-wider flex items-center gap-1.5">
            <UserPlus size={12} /> Direct Access (Permanent)
          </p>
          <p className="text-xs text-vault-muted">
            Grant a user permanent read access by email. Works even before they register.
          </p>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label=""
                type="email"
                placeholder="user@company.com"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && grantAccess()}
              />
            </div>
            <Button onClick={grantAccess} loading={granting} size="sm" className="shrink-0 self-end mb-0.5">
              Grant
            </Button>
          </div>

          {/* Existing grants */}
          {grants.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              {grants.map((grant) => (
                <motion.div
                  key={grant.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-vault-border bg-vault-surface"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <UserCheck size={13} className="text-vault-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-vault-text truncate">
                      {grant.grantee_username ?? grant.granted_to_email}
                    </p>
                    <p className="text-[10px] text-vault-muted flex items-center gap-1">
                      {grant.granted_to_id ? (
                        <><UserCheck size={9} className="text-vault-success" /> Registered</>
                      ) : (
                        <><Clock size={9} /> Pending registration</>
                      )}
                      {' · '}{grant.granted_to_email}
                    </p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => revokeGrant(grant.id)} title="Revoke">
                    <Trash2 size={12} />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
          {grants.length === 0 && !loadingList && (
            <p className="text-xs text-vault-muted text-center py-1">No direct grants yet</p>
          )}
        </div>

        {/* ── Time-limited share links ──────────────────────── */}
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-vault-elevated border border-vault-border">
          <p className="text-xs font-medium text-vault-muted uppercase tracking-wider flex items-center gap-1.5">
            <Link2 size={12} /> Share Link (24 h)
          </p>

          <Input
            label="Recipient Email (optional)"
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

        {/* Existing share links */}
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
                <Button variant="danger" size="sm" onClick={() => revokeLink(share.token)} title="Revoke">
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
