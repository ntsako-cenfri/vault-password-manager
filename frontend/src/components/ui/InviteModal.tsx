import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Copy, Check, UserPlus, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '@/api/users'
import type { InviteResult } from '@/api/users'
import { Modal } from './Modal'
import { Button } from './Button'

interface Props {
  open: boolean
  onClose: () => void
}

export function InviteModal({ open, onClose }: Props) {
  const [emails, setEmails] = useState<string[]>([''])
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<InviteResult[]>([])
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  const reset = () => {
    setEmails([''])
    setResults([])
    setCopied({})
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const updateEmail = (idx: number, val: string) => {
    setEmails((prev) => prev.map((e, i) => (i === idx ? val : e)))
  }

  const addEmail = () => setEmails((prev) => [...prev, ''])

  const removeEmail = (idx: number) => {
    setEmails((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSend = async () => {
    const valid = emails.map((e) => e.trim()).filter((e) => e.length > 0)
    if (valid.length === 0) {
      toast.error('Enter at least one email address')
      return
    }
    setSending(true)
    try {
      const { data } = await usersApi.invite(valid)
      setResults(data)
      toast.success(`${data.length} invite link${data.length !== 1 ? 's' : ''} generated`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate invite links')
    } finally {
      setSending(false)
    }
  }

  const copyLink = (link: string, email: string) => {
    navigator.clipboard.writeText(link)
    setCopied((prev) => ({ ...prev, [email]: true }))
    toast.success('Invite link copied!')
    setTimeout(() => setCopied((prev) => ({ ...prev, [email]: false })), 2000)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Invite People to Register" maxWidth="max-w-lg">
      <div className="flex flex-col gap-5">
        {results.length === 0 ? (
          <>
            <p className="text-xs text-vault-muted">
              Generate invite links for one or more email addresses. Share the links with the recipients so they can register.
            </p>

            {/* Email inputs */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-vault-muted uppercase tracking-wider">
                Email Addresses
              </p>
              <AnimatePresence initial={false}>
                {emails.map((email, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(idx, e.target.value)}
                      placeholder={`email@example.com`}
                      className="flex-1 bg-vault-elevated border border-vault-border rounded-lg px-3 py-2 text-sm text-vault-text placeholder:text-vault-muted/50 outline-none focus:border-vault-primary transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); addEmail() }
                      }}
                    />
                    {emails.length > 1 && (
                      <button
                        onClick={() => removeEmail(idx)}
                        className="text-vault-muted hover:text-vault-danger transition-colors"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              <button
                onClick={addEmail}
                className="flex items-center gap-1.5 text-xs text-vault-primary hover:text-vault-primary/80 transition-colors self-start mt-1"
              >
                <Plus size={12} /> Add another email
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1 border-t border-vault-border">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSend} loading={sending} size="sm">
                <Send size={14} />
                Generate {emails.filter((e) => e.trim()).length > 1
                  ? `${emails.filter((e) => e.trim()).length} Links`
                  : 'Invite Link'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-vault-muted">
              Share each link with the corresponding recipient. Links expire in <span className="text-vault-primary font-medium">7 days</span>.
            </p>

            <div className="flex flex-col gap-2">
              {results.map((r) => (
                <motion.div
                  key={r.email}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-1.5 p-3 rounded-xl border border-vault-border bg-vault-elevated"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserPlus size={13} className="text-vault-primary shrink-0" />
                      <span className="text-sm font-medium text-vault-text">{r.email}</span>
                    </div>
                    <button
                      onClick={() => copyLink(r.invite_link, r.email)}
                      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border border-vault-border bg-vault-surface hover:border-vault-primary hover:text-vault-primary transition-colors"
                      title="Copy invite link"
                    >
                      {copied[r.email] ? <Check size={12} className="text-vault-success" /> : <Copy size={12} />}
                      {copied[r.email] ? 'Copied' : 'Copy link'}
                    </button>
                  </div>
                  <p className="text-[11px] text-vault-muted font-mono truncate">{r.invite_link}</p>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-1 border-t border-vault-border">
              <Button variant="ghost" size="sm" onClick={reset}>
                Invite more
              </Button>
              <Button size="sm" onClick={handleClose}>
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
