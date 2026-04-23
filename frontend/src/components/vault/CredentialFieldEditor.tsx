/**
 * Dynamic credential field editor.
 * Each row has: type dropdown → label input → value/file input → comment → delete.
 */
import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Download, Eye } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import type { CredentialFieldDraft, FieldType } from '@/types'
import { FIELD_TYPE_LABELS, FILE_FIELD_TYPES } from '@/types'
import { isPreviewable } from './FilePreviewModal'

const FIELD_TYPES = Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]

interface Props {
  fields: CredentialFieldDraft[]
  onChange: (fields: CredentialFieldDraft[]) => void
  /** Existing saved fields with download URLs (edit mode) */
  savedFileFields?: { id: string; label: string; original_filename: string }[]
  onDownloadField?: (fieldId: string) => void
  onPreviewField?: (fieldId: string) => void
  /** When true: hides add/delete controls and makes all inputs read-only */
  readOnly?: boolean
}

function uid() { return Math.random().toString(36).slice(2) }

export function CredentialFieldEditor({ fields, onChange, savedFileFields, onDownloadField, onPreviewField, readOnly = false }: Props) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const add = () =>
    onChange([
      ...fields,
      { _key: uid(), field_type: 'username', label: '', value: '', comment: '', order: fields.length },
    ])

  const update = (key: string, patch: Partial<CredentialFieldDraft>) =>
    onChange(fields.map((f) => (f._key === key ? { ...f, ...patch } : f)))

  const remove = (key: string) =>
    onChange(fields.filter((f) => f._key !== key))

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {fields.map((field) => {
          const isFile = FILE_FIELD_TYPES.includes(field.field_type)
          return (
            <motion.div
              key={field._key}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="glass rounded-xl p-4 flex flex-col gap-3"
            >
              {/* Row 1: type + label + delete */}
              <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1.5 w-44 shrink-0">
                  <label className="text-xs font-medium text-vault-muted uppercase tracking-wider">
                    Type
                  </label>
                  <select
                    value={field.field_type}
                    disabled={readOnly}
                    onChange={(e) => !readOnly && update(field._key, { field_type: e.target.value as FieldType, value: '', file: undefined })}
                    className="bg-vault-elevated border border-vault-border text-vault-text text-sm rounded-lg px-3 py-2 outline-none focus:border-vault-primary disabled:opacity-60 disabled:cursor-default"
                  >
                    {FIELD_TYPES.map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <Input
                    label="Label / Description"
                    placeholder={`e.g. ${FIELD_TYPE_LABELS[field.field_type]}`}
                    value={field.label}
                    readOnly={readOnly}
                    onChange={(e) => update(field._key, { label: e.target.value })}
                    required
                  />
                </div>

                {!readOnly && (
                  <Button variant="danger" size="sm" onClick={() => remove(field._key)} className="mb-0.5 shrink-0">
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>

              {/* Row 2: value or file upload */}
              {isFile ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-vault-muted uppercase tracking-wider">
                    File
                  </label>
                  <div
                    onClick={() => fileRefs.current[field._key]?.click()}
                    className={clsx(
                      'border-2 border-dashed rounded-lg px-4 py-3 text-sm cursor-pointer transition-colors',
                      field.file
                        ? 'border-vault-success/50 text-vault-success bg-vault-success/5'
                        : 'border-vault-border text-vault-muted hover:border-vault-primary hover:text-vault-primary',
                    )}
                  >
                    {field.file ? `✓ ${field.file.name}` : 'Click to select file'}
                  </div>
                  <input
                    ref={(el) => { fileRefs.current[field._key] = el }}
                    type="file"
                    className="hidden"
                    onChange={(e) => update(field._key, { file: e.target.files?.[0] })}
                  />
                </div>
              ) : (
                <Input
                  label="Value"
                  type={field.field_type === 'password' ? 'password' : 'text'}
                  placeholder={field.field_type === 'password' ? '••••••••••' : 'Enter value'}
                  value={field.value}
                  readOnly={readOnly}
                  onChange={(e) => update(field._key, { value: e.target.value })}
                  className={clsx(
                    ['password', 'api_key', 'ssh_key'].includes(field.field_type) && 'font-mono'
                  )}
                />
              )}

              {/* Row 3: comment */}
              <Textarea
                label="Comment / Notes"
                placeholder="Describe usage, rotation schedule, notes…"
                value={field.comment}
                readOnly={readOnly}
                onChange={(e) => update(field._key, { comment: e.target.value })}
                rows={2}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Existing saved file fields (edit mode) */}
      {savedFileFields && savedFileFields.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-vault-muted uppercase tracking-wider font-medium">Saved Files</p>
          {savedFileFields.map((f) => (
            <div key={f.id} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
              <span className="text-sm flex-1 text-vault-muted truncate">
                <span className="text-vault-text">{f.label}</span> — {f.original_filename}
              </span>
              {isPreviewable(f.original_filename) && (
                <Button variant="ghost" size="sm" onClick={() => onPreviewField?.(f.id)} title="Preview">
                  <Eye size={14} /> Preview
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onDownloadField?.(f.id)}>
                <Download size={14} /> Download
              </Button>
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <Button variant="outline" size="sm" onClick={add} className="self-start">
          <Plus size={14} /> Add Field
        </Button>
      )}
    </div>
  )
}
