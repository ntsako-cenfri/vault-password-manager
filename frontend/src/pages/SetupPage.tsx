/** First-run admin setup page — shown when no admin exists yet. */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function SetupPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.setup(email, username, password)
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-vault-bg flex items-center justify-center p-4">
      <motion.div
        className="glass rounded-2xl p-8 w-full max-w-md shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      >
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-vault-primary/20 to-vault-accent/10 text-vault-primary shadow-glow">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-xl font-bold text-center">Welcome to Vault</h1>
          <p className="text-sm text-vault-muted text-center max-w-xs">
            Create your administrator account to get started with your team's password manager.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Admin Email"
            type="email"
            placeholder="admin@yourcompany.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Username"
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <div className="relative">
            <Input
              label="Master Password"
              type={showPw ? 'text' : 'password'}
              placeholder="Min 10 chars, uppercase & number"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 bottom-2 text-vault-muted hover:text-vault-text"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-lg bg-vault-elevated border border-vault-border text-xs text-vault-muted">
            <p className="font-medium text-vault-text mb-1">Password requirements</p>
            <p>• At least 10 characters</p>
            <p>• At least one uppercase letter</p>
            <p>• At least one digit</p>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            Create Admin Account
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
