import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Props {
  onSwitchToRegister: () => void
}

export function LoginForm({ onSwitchToRegister }: Props) {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed')
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
