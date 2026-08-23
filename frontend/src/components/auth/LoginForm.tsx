import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Eye, EyeOff, Smartphone, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Props {
  onSwitchToRegister: () => void
}

const PASSWORD_RULES_HINT = 'At least 10 characters, one uppercase letter, one digit'

export function LoginForm({ onSwitchToRegister }: Props) {
  const login = useAuthStore((s) => s.login)
  const verifyMfa = useAuthStore((s) => s.verifyMfa)
  const completePasswordChange = useAuthStore((s) => s.completePasswordChange)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')

  // Forced password change (one-time / rotated login)
  const [pwChangeToken, setPwChangeToken] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result && 'password_change_required' in result) {
        setPwChangeToken(result.password_change_token)
      } else if (result && 'mfa_required' in result) {
        setMfaToken(result.mfa_token)
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mfaToken) return
    setLoading(true)
    try {
      await verifyMfa(mfaToken, totpCode)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid code')
      setTotpCode('')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwChangeToken) return
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await completePasswordChange(pwChangeToken, newPassword)
      toast.success('Password set — welcome')
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      const detail = err.response?.data?.detail
      // Pydantic validation errors come back as a list of {msg, ...} objects
      const msg = Array.isArray(detail) ? detail[0]?.msg : detail
      toast.error(msg || 'Could not set new password')
    } finally {
      setLoading(false)
    }
  }

  if (pwChangeToken) {
    return (
      <motion.form
        onSubmit={handlePasswordChangeSubmit}
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-vault-primary/10 text-vault-primary">
            <KeyRound size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Set a new password</h1>
            <p className="text-xs text-vault-muted">
              You signed in with a temporary password — choose a permanent one to continue
            </p>
          </div>
        </div>

        <div className="relative">
          <Input
            label="New password"
            type={showNewPw ? 'text' : 'password'}
            placeholder="••••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowNewPw((v) => !v)}
            className="absolute right-3 bottom-2 text-vault-muted hover:text-vault-text transition-colors"
          >
            {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <Input
          label="Confirm new password"
          type={showNewPw ? 'text' : 'password'}
          placeholder="••••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <p className="text-[11px] text-vault-muted -mt-1">{PASSWORD_RULES_HINT}</p>

        <Button type="submit" loading={loading} className="mt-1 w-full" size="lg">
          Set password &amp; continue
        </Button>
      </motion.form>
    )
  }

  if (mfaToken) {
    return (
      <motion.form
        onSubmit={handleMfaSubmit}
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-vault-primary/10 text-vault-primary">
            <Smartphone size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Two-Factor Auth</h1>
            <p className="text-xs text-vault-muted">Enter the 6-digit code from your authenticator app</p>
          </div>
        </div>

        <Input
          label="Authenticator code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="000000"
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          autoFocus
          className="text-center text-2xl tracking-[0.5em] font-mono"
        />

        <Button type="submit" loading={loading} className="mt-1 w-full" size="lg">
          Verify
        </Button>

        <button
          type="button"
          onClick={() => { setMfaToken(null); setTotpCode('') }}
          className="text-center text-xs text-vault-muted hover:text-vault-text"
        >
          ← Back to login
        </button>
      </motion.form>
    )
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-vault-primary/10 text-vault-primary">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Sign in to Vault</h1>
          <p className="text-xs text-vault-muted">Secure team credential management</p>
        </div>
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoFocus
      />

      <div className="relative">
        <Input
          label="Password"
          type={showPw ? 'text' : 'password'}
          placeholder="••••••••••"
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
        Sign In
      </Button>

      <p className="text-center text-xs text-vault-muted">
        No account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-vault-primary hover:underline"
        >
          Create one
        </button>
      </p>
    </motion.form>
  )
}
