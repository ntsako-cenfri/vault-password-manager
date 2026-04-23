/**
 * Create / Edit vault item page.
 * Supports creating a new item with all credential fields,
 * or editing an existing item (loads current data, handles file uploads).
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, UserCheck, Clock, Trash2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { vaultApi } from '@/api/vault'
import { grantsApi } from '@/api/grants'
import { useVaultStore } from '@/store/vaultStore'
import { useAuthStore } from '@/store/authStore'
import { Layout } from '@/components/layout/Layout'
import { CredentialFieldEditor } from '@/components/vault/CredentialFieldEditor'
import { FilePreviewModal } from '@/components/vault/FilePreviewModal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FILE_FIELD_TYPES } from '@/types'
import type { CredentialFieldDraft, ItemGrant, VaultItem } from '@/types'

function uid() { return Math.random().toString(36).slice(2) }

export default function VaultItemPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = !id
  const upsert = useVaultStore((s) => s.upsert)
  const upsertShared = useVaultStore((s) => s.upsertShared)
  const currentUser = useAuthStore((s) => s.user)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<CredentialFieldDraft[]>([])
  const [existingItem, setExistingItem] = useState<VaultItem | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [grants, setGrants] = useState<ItemGrant[]>([])
  const [preview, setPreview] = useState<{ filename: string; content: string; fieldId: string } | null>(null)

  // Load existing item in edit mode
  useEffect(() => {
    if (!id) return
    vaultApi.get(id).then(({ data }) => {
      setExistingItem(data)
      setTitle(data.title)
      setDescription(data.description ?? '')
      // Only load non-file fields as editable drafts; file fields shown separately
      const textFields = data.fields.filter((f) => !FILE_FIELD_TYPES.includes(f.field_type))
      setFields(textFields.map((f) => ({
        _key: uid(),
        savedId: f.id, // track server ID so we know these are pre-existing
        field_type: f.field_type,
        label: f.label,
        value: f.value ?? '',
        comment: f.comment ?? '',
        order: f.order,
      })))
    }).catch(() => toast.error('Item not found')).finally(() => setLoading(false))

    // Fetch grants (only succeeds for the owner — silently ignore 403)
    const refreshGrants = () => grantsApi.listGrants(id).then(({ data }) => setGrants(data)).catch(() => {})
    refreshGrants()

    // Re-fetch when tab regains focus so resolved "pending" grants update automatically
    const onVisible = () => { if (document.visibilityState === 'visible') refreshGrants() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [id])

  const handleRevokeGrant = async (grantId: string) => {
    if (!id) return
    try {
      await grantsApi.revokeGrant(id, grantId)
      setGrants((prev) => prev.filter((g) => g.id !== grantId))
      toast.success('Access revoked')
    } catch {
      toast.error('Failed to revoke')
    }
  }

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      let item: VaultItem

      if (isNew) {
        // Create item with all text fields
        const textFields = fields
          .filter((f) => !FILE_FIELD_TYPES.includes(f.field_type))
          .map((f) => ({ field_type: f.field_type, label: f.label, value: f.value, comment: f.comment, order: f.order }))

        const { data } = await vaultApi.create(title, description || null, textFields)
        item = data

        // Upload file fields
        for (const f of fields.filter((fd) => FILE_FIELD_TYPES.includes(fd.field_type) && fd.file)) {
          const form = new FormData()
          form.append('field_type', f.field_type)
          form.append('label', f.label)
          if (f.comment) form.append('comment', f.comment)
          form.append('order', String(f.order))
          form.append('file', f.file!)
          await vaultApi.uploadField(item.id, form)
        }

        // Re-fetch with all fields
        const fresh = await vaultApi.get(item.id)
        item = fresh.data
      } else {
        // Update title/description
        const { data } = await vaultApi.update(id!, { title, description: description || undefined })
        item = data

        // Upload any new file fields
        for (const f of fields.filter((fd) => FILE_FIELD_TYPES.includes(fd.field_type) && fd.file)) {
          const form = new FormData()
          form.append('field_type', f.field_type)
          form.append('label', f.label)
          if (f.comment) form.append('comment', f.comment)
          form.append('order', String(f.order))
          form.append('file', f.file!)
          await vaultApi.uploadField(id!, form)
        }

        // Delete fields that were removed in the editor
        const keptSavedIds = new Set(fields.filter((fd) => fd.savedId).map((fd) => fd.savedId!))
        const deletedIds = (existingItem?.fields ?? [])
          .filter((sf) => !FILE_FIELD_TYPES.includes(sf.field_type) && !keptSavedIds.has(sf.id))
          .map((sf) => sf.id)
        for (const fid of deletedIds) {
          await vaultApi.deleteField(id!, fid)
        }

        // Only add brand-new fields (no savedId means the user just added them)
        for (const f of fields.filter((fd) => !FILE_FIELD_TYPES.includes(fd.field_type) && !fd.savedId)) {
          await vaultApi.addField(id!, { field_type: f.field_type, label: f.label, value: f.value, comment: f.comment, order: f.order })
        }

        const fresh = await vaultApi.get(id!)
        item = fresh.data
      }

      // Route the saved item to the correct store bucket so it stays in the right section
      const isOwnItem = isNew || existingItem?.owner_id === currentUser?.id
      if (isOwnItem) {
        upsert(item)
      } else {
        upsertShared(item)
      }
      toast.success(isNew ? 'Item created' : 'Item updated')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async (fieldId: string) => {
    if (!id) return
    try {
      const { data } = await vaultApi.downloadField(id, fieldId)
      const field = existingItem?.fields.find((f) => f.id === fieldId)
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url
      a.download = field?.original_filename ?? 'download'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    }
  }

  const handlePreview = async (fieldId: string) => {
    if (!id) return
    try {
      const { data } = await vaultApi.downloadField(id, fieldId)
      const field = existingItem?.fields.find((f) => f.id === fieldId)
      const text = await new Blob([data]).text()
      setPreview({ filename: field?.original_filename ?? 'file', content: text, fieldId })
    } catch {
      toast.error('Preview failed')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-6 h-6 border-2 border-vault-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    )
  }

  const savedFileFields = existingItem?.fields
    .filter((f) => FILE_FIELD_TYPES.includes(f.field_type) && f.original_filename)
    .map((f) => ({ id: f.id, label: f.label, original_filename: f.original_filename! })) ?? []

  // Grantees get a read-only view — only the owner and admins can edit
  const isReadOnly = !isNew &&
    existingItem !== null &&
    currentUser !== null &&
    existingItem.owner_id !== currentUser.id &&
    currentUser.role !== 'admin'

  return (
    <>
    <Layout>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} />
          </Button>
          <h1 className="text-lg font-bold">{isNew ? 'New Vault Item' : (isReadOnly ? 'View Item' : 'Edit Item')}</h1>
          {isReadOnly && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-vault-muted bg-vault-elevated border border-vault-border px-2.5 py-1 rounded-lg">
              <Lock size={11} /> View only
            </span>
          )}
        </div>

        <motion.div className="flex flex-col gap-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {/* Metadata */}
          <div className="glass rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
            <p className="text-xs font-medium text-vault-muted uppercase tracking-wider">Details</p>
            <Input
              label="Title"
              placeholder="e.g. Production Database"
              value={title}
              readOnly={isReadOnly}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus={isNew}
            />
            <Textarea
              label="Description (optional)"
              placeholder="What is this for?"
              value={description}
              readOnly={isReadOnly}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Credential fields */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-vault-muted uppercase tracking-wider">Credential Fields</p>
            <CredentialFieldEditor
              fields={fields}
              onChange={setFields}
              savedFileFields={savedFileFields}
              onDownloadField={handleDownload}
              onPreviewField={handlePreview}
              readOnly={isReadOnly}
            />
          </div>

          {!isReadOnly && (
            <Button onClick={handleSave} loading={saving} className="self-end" size="lg">
              <Save size={16} /> {isNew ? 'Create Item' : 'Save Changes'}
            </Button>
          )}

          {/* Shared with section — only shown for existing items that have grants */}
          {!isNew && grants.length > 0 && (
            <div className="glass rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
              <p className="text-xs font-medium text-vault-muted uppercase tracking-wider">
                Shared with ({grants.length})
              </p>
              {grants.map((grant) => (
                <div
                  key={grant.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-vault-border bg-vault-elevated"
                >
                  <div className="shrink-0">
                    {grant.granted_to_id ? (
                      <UserCheck size={14} className="text-vault-success" />
                    ) : (
                      <Clock size={14} className="text-vault-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-vault-text truncate">
                      {grant.grantee_username ?? grant.granted_to_email}
                    </p>
                    <p className="text-[10px] text-vault-muted">
                      {grant.granted_to_id ? 'Active' : 'Pending registration'} · {grant.granted_to_email}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRevokeGrant(grant.id)}
                    title="Revoke access"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>

      {preview && (
        <FilePreviewModal
          open
          onClose={() => setPreview(null)}
          filename={preview.filename}
          content={preview.content}
          onDownload={() => { handleDownload(preview.fieldId); setPreview(null) }}
        />
      )}
    </>
  )
}