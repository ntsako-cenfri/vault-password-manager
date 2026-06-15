/**
 * Dynamic credential field editor.
 * Each row has: type dropdown → label input → value/file input → comment → delete.
 */
import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Download, Eye, EyeOff, Copy, Code } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import type { CredentialFieldDraft, FieldType } from '@/types'
import {
  FIELD_TYPE_LABELS,
  FIELD_TYPE_GROUPS,
  FILE_FIELD_TYPES,
  SENSITIVE_FIELD_TYPES,
} from '@/types'
import { isPreviewable } from './FilePreviewModal'

const CODE_LANGUAGES = [
  { value: 'python',     label: 'Python',       border: 'border-blue-500',   badge: 'bg-blue-500/20 text-blue-400' },
  { value: 'javascript', label: 'JavaScript',   border: 'border-yellow-500', badge: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'typescript', label: 'TypeScript',   border: 'border-blue-400',   badge: 'bg-blue-400/20 text-blue-300' },
  { value: 'bash',       label: 'Bash / Shell', border: 'border-green-500',  badge: 'bg-green-500/20 text-green-400' },
  { value: 'powershell', label: 'PowerShell',   border: 'border-blue-600',   badge: 'bg-blue-600/20 text-blue-300' },
  { value: 'sql',        label: 'SQL',          border: 'border-orange-500', badge: 'bg-orange-500/20 text-orange-400' },
  { value: 'json',       label: 'JSON',         border: 'border-gray-400',   badge: 'bg-gray-400/20 text-gray-300' },
  { value: 'yaml',       label: 'YAML',         border: 'border-red-400',    badge: 'bg-red-400/20 text-red-400' },
  { value: 'html',       label: 'HTML',         border: 'border-red-500',    badge: 'bg-red-500/20 text-red-400' },
  { value: 'css',        label: 'CSS',          border: 'border-indigo-500', badge: 'bg-indigo-500/20 text-indigo-400' },
  { value: 'php',        label: 'PHP',          border: 'border-purple-500', badge: 'bg-purple-500/20 text-purple-400' },
  { value: 'java',       label: 'Java',         border: 'border-amber-600',  badge: 'bg-amber-600/20 text-amber-400' },
  { value: 'go',         label: 'Go',           border: 'border-cyan-500',   badge: 'bg-cyan-500/20 text-cyan-400' },
  { value: 'rust',       label: 'Rust',         border: 'border-orange-600', badge: 'bg-orange-600/20 text-orange-400' },
  { value: 'csharp',     label: 'C#',           border: 'border-violet-500', badge: 'bg-violet-500/20 text-violet-400' },
  { value: 'cpp',        label: 'C / C++',      border: 'border-zinc-400',   badge: 'bg-zinc-400/20 text-zinc-300' },
  { value: 'ruby',       label: 'Ruby',         border: 'border-red-600',    badge: 'bg-red-600/20 text-red-400' },
  { value: 'dockerfile', label: 'Dockerfile',   border: 'border-sky-500',    badge: 'bg-sky-500/20 text-sky-400' },
  { value: 'text',       label: 'Plain Text',   border: 'border-vault-border', badge: 'bg-vault-border/20 text-vault-muted' },
]

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
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  const toggleReveal = (key: string) =>
    setRevealed((r) => ({ ...r, [key]: !r[key] }))

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
          const isSensitive = SENSITIVE_FIELD_TYPES.includes(field.field_type)
          const isCode = field.field_type === 'code'
          const isShown = revealed[field._key] ?? false
          const codeLang = CODE_LANGUAGES.find((l) => l.value === (field.comment || 'text')) ?? CODE_LANGUAGES[CODE_LANGUAGES.length - 1]

          return (
            <motion.div
              key={field._key}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={clsx(
                'glass rounded-xl p-4 flex flex-col gap-3',
                isCode && `border-l-2 ${codeLang.border}`,
              )}
            >
              {/* Row 1: type + label + delete */}
              <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1.5 w-48 shrink-0">
                  <label className="text-xs font-medium text-vault-muted uppercase tracking-wider">Type</label>
                  <select
                    value={field.field_type}
                    disabled={readOnly}
                    onChange={(e) => !readOnly && update(field._key, { field_type: e.target.value as FieldType, value: '', comment: '', file: undefined })}
                    className="bg-vault-elevated border border-vault-border text-vault-text text-sm rounded-lg px-3 py-2 outline-none focus:border-vault-primary disabled:opacity-60 disabled:cursor-default"
                  >
                    {FIELD_TYPE_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.types.map((type) => (
                          <option key={type} value={type}>{FIELD_TYPE_LABELS[type]}</option>
                        ))}
                      </optgroup>
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

              {/* Row 2: value / file / code */}
              {isFile ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-vault-muted uppercase tracking-wider">File</label>
                  <div
                    onClick={() => !readOnly && fileRefs.current[field._key]?.click()}
                    className={clsx(
                      'border-2 border-dashed rounded-lg px-4 py-3 text-sm transition-colors',
                      readOnly ? 'cursor-default' : 'cursor-pointer',
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
              ) : isCode ? (
                /* Code Snippet: language picker + big monospace textarea */
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-medium text-vault-muted uppercase tracking-wider flex items-center gap-1.5">
                        <Code size={11} /> Language
                      </label>
                      <select
                        value={field.comment || 'text'}
                        disabled={readOnly}
                        onChange={(e) => !readOnly && update(field._key, { comment: e.target.value })}
                        className="bg-vault-elevated border border-vault-border text-vault-text text-sm rounded-lg px-3 py-2 outline-none focus:border-vault-primary disabled:opacity-60 disabled:cursor-default"
                      >
                        {CODE_LANGUAGES.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className={clsx('mt-5 px-2.5 py-1 rounded-full text-[10px] font-semibold', codeLang.badge)}>
                      {codeLang.label}
                    </div>
                    {field.value && (
                      <button
                        type="button"
                        title="Copy code"
                        onClick={() => { navigator.clipboard.writeText(field.value); toast.success('Copied!') }}
                        className="mt-5 shrink-0 p-2 rounded-lg border border-vault-border bg-vault-elevated text-vault-muted hover:text-vault-text hover:border-vault-primary transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-vault-muted uppercase tracking-wider">Code</label>
                    <textarea
                      rows={12}
                      value={field.value}
                      readOnly={readOnly}
                      onChange={(e) => !readOnly && update(field._key, { value: e.target.value })}
                      placeholder={`Paste your ${codeLang.label} code here…`}
                      spellCheck={false}
                      className={clsx(
                        'w-full bg-vault-elevated rounded-lg px-4 py-3 text-sm font-mono text-vault-text placeholder:text-vault-muted/50 outline-none transition-colors resize-y border',
                        codeLang.border,
                        'focus:border-opacity-100',
                        readOnly && 'cursor-default',
                      )}
                    />
                  </div>
                </div>
              ) : (
                /* Regular text / sensitive field */
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="Value"
                      type={isSensitive && !isShown ? 'password' : 'text'}
                      placeholder={isSensitive ? '••••••••••' : 'Enter value'}
                      value={field.value}
                      readOnly={readOnly}
                      onChange={(e) => update(field._key, { value: e.target.value })}
                      className={clsx(
                        (isSensitive || ['ssh_key', 'license_key', 'env_var'].includes(field.field_type)) && 'font-mono',
                        field.field_type === 'url' && 'lowercase',
                      )}
                    />
                  </div>
                  {isSensitive && (
                    <button
                      type="button"
                      title={isShown ? 'Hide' : 'Show'}
                      onClick={() => toggleReveal(field._key)}
                      className="mb-0.5 shrink-0 p-2 rounded-lg border border-vault-border bg-vault-elevated text-vault-muted hover:text-vault-text hover:border-vault-primary transition-colors"
                    >
                      {isShown ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                  {field.value && (
                    <button
                      type="button"
                      title="Copy value"
                      onClick={() => { navigator.clipboard.writeText(field.value); toast.success('Copied!') }}
                      className="mb-0.5 shrink-0 p-2 rounded-lg border border-vault-border bg-vault-elevated text-vault-muted hover:text-vault-text hover:border-vault-primary transition-colors"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Row 3: comment — hidden for code fields (comment stores language) */}
              {!isCode && (
                <Textarea
                  label="Comment / Notes"
                  placeholder="Describe usage, rotation schedule, notes…"
                  value={field.comment}
                  readOnly={readOnly}
                  onChange={(e) => update(field._key, { comment: e.target.value })}
                  rows={2}
                />
              )}
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


