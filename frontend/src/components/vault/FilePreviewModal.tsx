/**
 * Inline viewer for text-based file attachments.
 * Binary / unknown types fall through to the download button.
 */
import { Download, FileText } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

// Extensions we can render as plain text in-browser
const PREVIEWABLE = new Set([
  'txt', 'md', 'markdown', 'py', 'js', 'ts', 'jsx', 'tsx',
  'sh', 'bash', 'zsh', 'fish', 'ps1',
  'json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'cfg', 'env',
  'log', 'csv', 'xml', 'html', 'htm', 'css', 'scss',
  'sql', 'tf', 'hcl', 'dockerfile', 'makefile',
  'rs', 'go', 'java', 'rb', 'php', 'c', 'cpp', 'h',
])

export function isPreviewable(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return PREVIEWABLE.has(ext) || PREVIEWABLE.has(filename.toLowerCase())
}

interface Props {
  open: boolean
  onClose: () => void
  filename: string
  content: string
  onDownload: () => void
}

export function FilePreviewModal({ open, onClose, filename, content, onDownload }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={filename} maxWidth="max-w-3xl">
      <div className="flex flex-col gap-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-vault-muted">
            <FileText size={12} />
            {content.split('\n').length} lines · {content.length.toLocaleString()} chars
          </span>
          <Button variant="ghost" size="sm" onClick={onDownload}>
            <Download size={13} /> Download
          </Button>
        </div>

        {/* Content */}
        <pre className="bg-vault-bg border border-vault-border rounded-xl p-4 text-xs font-mono text-vault-text overflow-auto max-h-[60vh] leading-relaxed whitespace-pre-wrap break-all">
          {content}
        </pre>
      </div>
    </Modal>
  )
}
