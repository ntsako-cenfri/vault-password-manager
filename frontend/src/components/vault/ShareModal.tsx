import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link2, Copy, Trash2, Plus, Calendar, Mail, UserPlus, UserCheck, Clock, Search, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { sharesApi } from '@/api/shares'
import { grantsApi } from '@/api/grants'
import { usersApi } from '@/api/users'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { VaultItem, ShareLink, ItemGrant, User } from '@/types'

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
  const [granting, setGranting] = useState(false)
  const [confirmRevokeGrant, setConfirmRevokeGrant] = useState<string | null>(null)
  const [confirmRevokeLink, setConfirmRevokeLink] = useState<string | null>(null)

  // User picker state — Direct Access section
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState('')

  // User picker state — Share Link section
  const [selectedShareUsers, setSelectedShareUsers] = useState<User[]>([])
  const [shareSearch, setShareSearch] = useState('')

  const toggleShareUser = (user: User) => {
    setSelectedShareUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    )
  }

  useEffect(() => {
    if (!open) {
      setSelectedShareUsers([])
      setShareSearch('')
      return
    }
    setLoadingList(true)
    Promise.allSettled([
      sharesApi.list(item.id),
      grantsApi.listGrants(item.id),
      usersApi.list(),
    ])
      .then(([s, g, u]) => {
        if (s.status === 'fulfilled') setShares(s.value.data)
        if (g.status === 'fulfilled') setGrants(g.value.data)
        if (u.status === 'fulfilled') setUsers(u.value.data)
      })
      .finally(() => setLoadingList(false))
  }, [open, item.id])

  const createShare = async () => {
    setCreating(true)
    try {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      // Build list of recipients: selected users + any manually typed email
      const recipients: (string | undefined)[] = [
        ...selectedShareUsers.map((u) => u.email),
        ...(recipientEmail.trim() ? [recipientEmail.trim()] : []),
      ]
      // If nothing selected/typed, create one open link
      const targets = recipients.length > 0 ? recipients : [undefined]
      const results = await Promise.allSettled(
        targets.map((email) =>
          sharesApi.create(item.id, {
            recipient_email: email,
            is_strict: true,
            expires_at: expires,
          })
        )
      )
      const created = results.filter((r) => r.status === 'fulfilled').map((r) => (r as PromiseFulfilledResult<any>).value.data)
      const failCount = results.filter((r) => r.status === 'rejected').length
      setShares((prev) => [...created, ...prev])
      setRecipientEmail('')
      setSelectedShareUsers([])
      setShareSearch('')
      if (created.length) toast.success(`${created.length} share link${created.length > 1 ? 's' : ''} created`)
      if (failCount) toast.error(`Failed to create ${failCount} link${failCount > 1 ? 's' : ''}`)
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

  const toggleUser = (user: User) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    )
  }

  const grantAccessToSelected = async () => {
    if (selectedUsers.length === 0) return
    setGranting(true)
    try {
      const results = await Promise.allSettled(
        selectedUsers.map((u) => grantsApi.grantAccess(item.id, u.email))
      )
      const succeeded: ItemGrant[] = []
      let failCount = 0
      for (const r of results) {
        if (r.status === 'fulfilled') succeeded.push(r.value.data)
        else failCount++
      }
      setGrants((prev) => {
        let updated = [...prev]
        for (const data of succeeded) {
          const exists = updated.find((g) => g.id === data.id)
          updated = exists
            ? updated.map((g) => (g.id === data.id ? data : g))
            : [data, ...updated]
        }
        return updated
      })
      setSelectedUsers([])
      setUserSearch('')
      if (succeeded.length) toast.success(`Access granted to ${succeeded.length} user${succeeded.length > 1 ? 's' : ''}`)
      if (failCount) toast.error(`Failed to grant ${failCount} user${failCount > 1 ? 's' : ''}`)
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
            Select one or more users to grant permanent read access.
          </p>

          {/* User picker — native datalist combobox */}
          <div>
            {(() => {
              const alreadyGrantedIds = new Set(grants.map((g) => g.granted_to_id).filter(Boolean))
              return (
                <datalist id="grant-users-list">
                  {users
                    .filter((u) => !alreadyGrantedIds.has(u.id) && !selectedUsers.find((s) => s.id === u.id))
                    .map((u) => <option key={u.id} value={`${u.username} — ${u.email}`} />)}
                </datalist>
              )
            })()}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-vault-border bg-vault-surface focus-within:border-vault-primary transition-colors">
              <Search size={13} className="text-vault-muted shrink-0" />
              <input
                type="text"
                list="grant-users-list"
                className="flex-1 bg-transparent text-xs text-vault-text outline-none placeholder:text-vault-muted"
                placeholder={loadingList ? 'Loading users…' : 'Search or pick a user…'}
                value={userSearch}
                onChange={(e) => {
                  const val = e.target.value
                  setUserSearch(val)
                  const matched = users.find((u) => val === `${u.username} — ${u.email}`)
                  if (matched && !selectedUsers.find((s) => s.id === matched.id)) {
                    toggleUser(matched)
                    setUserSearch('')
                  }
                }}
              />
            </div>
          </div>

          {/* Selected user chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map((user) => (
                <span
                  key={user.id}
                  className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border border-vault-border bg-vault-surface text-[11px] font-medium text-vault-text"
                >
                  {user.username}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                    user.role === 'team' ? 'bg-blue-500/20 text-blue-400' :
                    user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-orange-500/20 text-orange-400'
                  }`}>
                    {user.role}
                  </span>
                  <button
                    onClick={() => toggleUser(user)}
                    className="text-vault-muted hover:text-vault-text transition-colors ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {selectedUsers.length > 0 && (
            <Button onClick={grantAccessToSelected} loading={granting} size="sm" className="self-end">
              Grant to {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''}
            </Button>
          )}

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
                  {confirmRevokeGrant === grant.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-vault-muted">Revoke?</span>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmRevokeGrant(null)} title="Cancel">
                        <X size={11} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => { revokeGrant(grant.id); setConfirmRevokeGrant(null) }} title="Confirm">
                        <Check size={11} />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="danger" size="sm" onClick={() => setConfirmRevokeGrant(grant.id)} title="Revoke">
                      <Trash2 size={12} />
                    </Button>
                  )}
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

          <p className="text-xs text-vault-muted -mb-1">Recipients (optional) — select users or type an email</p>

          {/* Share-link user picker — native datalist combobox */}
          <div>
            <datalist id="share-users-list">
              {users
                .filter((u) => !selectedShareUsers.find((s) => s.id === u.id))
                .map((u) => <option key={u.id} value={`${u.username} — ${u.email}`} />)}
            </datalist>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-vault-border bg-vault-surface focus-within:border-vault-primary transition-colors">
              <Search size={13} className="text-vault-muted shrink-0" />
              <input
                type="text"
                list="share-users-list"
                className="flex-1 bg-transparent text-xs text-vault-text outline-none placeholder:text-vault-muted"
                placeholder={loadingList ? 'Loading users…' : 'Pick a user or type an email…'}
                value={shareSearch}
                onChange={(e) => {
                  const val = e.target.value
                  setShareSearch(val)
                  const matched = users.find((u) => val === `${u.username} — ${u.email}`)
                  if (matched && !selectedShareUsers.find((s) => s.id === matched.id)) {
                    toggleShareUser(matched)
                    setShareSearch('')
                    setRecipientEmail('')
                  } else {
                    setRecipientEmail(val)
                  }
                }}
              />
            </div>
          </div>

          {/* Selected chips */}
          {selectedShareUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedShareUsers.map((user) => (
                <span
                  key={user.id}
                  className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border border-vault-border bg-vault-surface text-[11px] font-medium text-vault-text"
                >
                  {user.username}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                    user.role === 'team' ? 'bg-blue-500/20 text-blue-400' :
                    user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-orange-500/20 text-orange-400'
                  }`}>{user.role}</span>
                  <button
                    onClick={() => toggleShareUser(user)}
                    className="text-vault-muted hover:text-vault-text transition-colors ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-vault-muted">
            Link expires in <span className="text-vault-primary font-medium">24 hours</span> · Requires login to view
          </p>

          <Button onClick={createShare} loading={creating} size="sm">
            <Plus size={14} />
            {selectedShareUsers.length > 1
              ? `Generate ${selectedShareUsers.length} Links`
              : 'Generate Link'}
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
                {confirmRevokeLink === share.token ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-vault-muted">Delete?</span>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmRevokeLink(null)} title="Cancel">
                      <X size={11} />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => { revokeLink(share.token); setConfirmRevokeLink(null) }} title="Confirm">
                      <Check size={11} />
                    </Button>
                  </div>
                ) : (
                  <Button variant="danger" size="sm" onClick={() => setConfirmRevokeLink(share.token)} title="Delete">
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
