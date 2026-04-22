/**
 * Create / Edit vault item page.
 * Supports creating a new item with all credential fields,
 * or editing an existing item (loads current data, handles file uploads).
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { vaultApi } from '@/api/vault'
import { useVaultStore } from '@/store/vaultStore'
import { Layout } from '@/components/layout/Layout'
import { CredentialFieldEditor } from '@/components/vault/CredentialFieldEditor'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FILE_FIELD_TYPES } from '@/types'
import type { CredentialFieldDraft, VaultItem } from '@/types'

function uid() { return Math.random().toString(36).slice(2) }

export default function VaultItemPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = !id
  const upsert = useVaultStore((s) => s.upsert)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<CredentialFieldDraft[]>([])
  const [existingItem, setExistingItem] = useState<VaultItem | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

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
        field_type: f.field_type,
        label: f.label,
        value: f.value ?? '',
        comment: f.comment ?? '',
        order: f.order,
      })))
    }).catch(() => toast.error('Item not found')).finally(() => setLoading(false))
  }, [id])

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

        // Add new text fields
        for (const f of fields.filter((fd) => !FILE_FIELD_TYPES.includes(fd.field_type) && fd.value)) {
          await vaultApi.addField(id!, { field_type: f.field_type, label: f.label, value: f.value, comment: f.comment, order: f.order })
        }

        const fresh = await vaultApi.get(id!)
        item = fresh.data
      }

      upsert(item)
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

  return (
    <Layout>
      <div className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} />
          </Button>
          <h1 className="text-lg font-bold">{isNew ? 'New Vault Item' : 'Edit Item'}</h1>
        </div>

        <motion.div className="flex flex-col gap-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {/* Metadata */}
          <div className="glass rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-xs font-medium text-vault-muted uppercase tracking-wider">Details</p>
            <Input
              label="Title"
              placeholder="e.g. Production Database"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus={isNew}
            />
            <Textarea
              label="Description (optional)"
              placeholder="What is this for?"
              value={description}
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
            />
          </div>

          <Button onClick={handleSave} loading={saving} className="self-end" size="lg">
            <Save size={16} /> {isNew ? 'Create Item' : 'Save Changes'}
          </Button>
        </motion.div>
      </div>
    </Layout>
  )
}
