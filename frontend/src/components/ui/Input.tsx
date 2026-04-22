import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-vault-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={clsx(
          'w-full bg-vault-elevated border rounded-lg px-3 py-2 text-sm text-vault-text placeholder:text-vault-muted/50 outline-none transition-colors',
          error
            ? 'border-vault-danger focus:border-vault-danger'
            : 'border-vault-border focus:border-vault-primary',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-vault-danger">{error}</p>}
    </div>
  ),
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-vault-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        rows={3}
        className={clsx(
          'w-full bg-vault-elevated border rounded-lg px-3 py-2 text-sm text-vault-text placeholder:text-vault-muted/50 outline-none transition-colors resize-none',
          error
            ? 'border-vault-danger focus:border-vault-danger'
            : 'border-vault-border focus:border-vault-primary',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-vault-danger">{error}</p>}
    </div>
  ),
)
Textarea.displayName = 'Textarea'
