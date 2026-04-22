/**
 * Share access page — handles the /share/:token route.
 * Flow:
 *   1. Resolve the share token (unauthenticated) to get is_strict + expired status.
 *   2. If strict and not logged in → show login/register gate.
 *   3. If logged in → fetch and display the shared item.
 */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, AlertTriangle, Eye, EyeOff, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { sharesApi } from '@/api/shares'
import { vaultApi } from '@/api/vault'
import { useAuthStore } from '@/store/authStore'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { Button } from '@/components/ui/Button'
import { FIELD_TYPE_LABELS, FILE_FIELD_TYPES } from '@/types'
import type { SharedItemResponse, ShareMeta } from '@/types'

export default function SharedAccessPage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuthStore()
  const [meta, setMeta] = useState<ShareMeta | null>(null)
  const [shared, setShared] = useState<SharedItemResponse | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')

  // Step 1: resolve metadata
  useEffect(() => {
    if (!token) return
    sharesApi.resolve(token).then(({ data }) => setMeta(data)).catch(() => setError('Share link not found')).finally(() => setPageLoading(false))
  }, [token])

  // Step 2: if authenticated, fetch shared item
  useEffect(() => {
    if (!token || !user || authLoading) return
    sharesApi.access(token).then(({ data }) => setShared(data)).catch((err) => {
      setError(err.response?.data?.detail || 'Access denied')
    })
  }, [token, user, authLoading])

  const handleDownload = async (itemId: string, fieldId: string, filename: string) => {
    try {
      const { data } = await vaultApi.downloadField(itemId, fieldId)
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Download failed') }
  }

  if (pageLoading || authLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return <ErrorScreen message={error} />
  }

  if (meta?.expired) {
    return <ErrorScreen message="This share link has expired." />
  }

  // Gate: strict link & user not authenticated
  if (meta?.is_strict && !user) {
    return (
      <div className="min-h-screen bg-vault-bg flex items-center justify-center p-4">
        <motion.div
          className="glass rounded-2xl p-8 w-full max-w-md shadow-2xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-vault-primary/10 border border-vault-primary/20">
            <ShieldCheck size={16} className="text-vault-primary shrink-0" />
            <p className="text-xs text-vault-primary">
              This link requires authentication to access
            </p>
          </div>

          {authMode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setAuthMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setAuthMode('login')} shareToken={token} />
          )}
        </motion.div>
      </div>
    )
  }

  if (!shared) {
    return <LoadingScreen />
  }

  const { item } = shared

  return (
    <div className="min-h-screen bg-vault-bg p-4 sm:p-8">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-vault-primary/4 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-xl mx-auto">
        {/* Logo bar */}
        <div className="flex items-center gap-2 mb-8">
          <ShieldCheck size={18} className="text-vault-primary" />
          <span className="text-sm font-semibold text-vault-muted">Vault — Shared Item</span>
        </div>

        <motion.div
          className="glass rounded-2xl p-6 flex flex-col gap-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-xl font-bold">{item.title}</h1>
            {item.description && <p className="text-sm text-vault-muted mt-1">{item.description}</p>}
          </div>

          <div className="flex flex-col gap-3">
            {item.fields.map((field) => {
              const isFile = FILE_FIELD_TYPES.includes(field.field_type)
              const isSensitive = ['password', 'api_key', 'ssh_key'].includes(field.field_type)
              const isHidden = isSensitive && !revealed[field.id]

              return (
                <div key={field.id} className="p-4 rounded-xl bg-vault-elevated border border-vault-border flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-vault-muted uppercase tracking-wider">
                      {FIELD_TYPE_LABELS[field.field_type]} — {field.label}
                    </span>
                    {isSensitive && (
                      <button onClick={() => setRevealed((r) => ({ ...r, [field.id]: !r[field.id] }))} className="text-vault-muted hover:text-vault-text">
                        {revealed[field.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>

                  {isFile ? (
                    <Button variant="outline" size="sm" className="self-start" onClick={() => handleDownload(item.id, field.id, field.original_filename ?? 'file')}>
                      <Download size={13} /> {field.original_filename ?? 'Download'}
                    </Button>
                  ) : (
                    <p className={`font-mono text-sm text-vault-text break-all ${isHidden ? 'blur-sm select-none' : ''}`}>
                      {field.value ?? '—'}
                    </p>
                  )}

                  {field.comment && (
                    <p className="text-xs text-vault-muted italic border-t border-vault-border/60 pt-2 mt-1">
                      {field.comment}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-vault-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-8 h-8 border-2 border-vault-primary border-t-transparent rounded-full" />
        <p className="text-sm text-vault-muted">Loading…</p>
      </div>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-vault-bg flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 max-w-sm text-center flex flex-col items-center gap-4">
        <div className="p-4 rounded-2xl bg-vault-danger/10 text-vault-danger">
          <AlertTriangle size={28} />
        </div>
        <p className="font-semibold">{message}</p>
        <a href="/login" className="text-sm text-vault-primary hover:underline">Go to login</a>
      </div>
    </div>
  )
}
