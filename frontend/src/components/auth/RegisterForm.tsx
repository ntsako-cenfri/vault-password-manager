import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserPlus, Eye, EyeOff, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

function parseInviteEmail(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.sub ?? null
  } catch {
    return null
  }
}

interface Props {
  onSwitchToLogin: () => void
  /** Optional: after registering, auto-redirect to a share token */
  shareToken?: string
  /** Optional: signed invite token — pre-fills and locks the email field */
  inviteToken?: string
}

export function RegisterForm({ onSwitchToLogin, shareToken, inviteToken }: Props) {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const inviteEmail = inviteToken ? parseInviteEmail(inviteToken) : null
  const [email, setEmail] = useState(inviteEmail ?? '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.register(email, username, password, inviteToken)
      await login(email, password)
      if (shareToken) {
        navigate(`/share/${shareToken}`, { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-vault-accent/10 text-vault-accent">
          <UserPlus size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Create Account</h1>
          <p className="text-xs text-vault-muted">
            {inviteEmail
              ? `You've been invited to join`
              : shareToken
              ? 'Register to access the shared item'
              : 'Join your team vault'}
          </p>
        </div>
      </div>

      <div className="relative">
        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => !inviteEmail && setEmail(e.target.value)}
          readOnly={!!inviteEmail}
          required
          autoFocus={!inviteEmail}
          className={inviteEmail ? 'pr-8 opacity-75 cursor-not-allowed' : ''}
        />
        {inviteEmail && (
          <Lock size={13} className="absolute right-3 bottom-2.5 text-vault-muted pointer-events-none" />
        )}
      </div>

      <Input
        label="Username"
        placeholder="yourname"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        autoFocus={!!inviteEmail}
      />

      <div className="relative">
        <Input
          label="Password"
          type={showPw ? 'text' : 'password'}
          placeholder="Min 10 chars, uppercase & number"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="absolute right-3 bottom-2 text-vault-muted hover:text-vault-text transition-colors"
        >
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <Button type="submit" loading={loading} className="mt-1 w-full" size="lg">
        Create Account
      </Button>

      <p className="text-center text-xs text-vault-muted">
        Have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-vault-primary hover:underline"
        >
          Sign in
        </button>
      </p>
    </motion.form>
  )
}
