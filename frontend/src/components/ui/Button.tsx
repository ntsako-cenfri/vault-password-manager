import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-primary disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-vault-primary hover:bg-vault-glow text-white shadow-glow': variant === 'primary',
          'bg-transparent hover:bg-vault-elevated text-vault-muted hover:text-vault-text border border-vault-border': variant === 'ghost',
          'bg-vault-danger/10 hover:bg-vault-danger/20 text-vault-danger border border-vault-danger/30': variant === 'danger',
          'bg-transparent border border-vault-border hover:border-vault-primary text-vault-text': variant === 'outline',
          'px-2.5 py-1.5 text-xs': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className,
      )}
      {...props}
    >
      {loading ? <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : children}
    </button>
  ),
)
Button.displayName = 'Button'
