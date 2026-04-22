import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const { user, loading } = useAuthStore()

  // Already authenticated — go straight to the dashboard
  if (!loading && user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-vault-bg flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-vault-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-2/3 right-1/3 w-64 h-64 bg-vault-accent/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="relative glass rounded-2xl p-8 w-full max-w-md shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-7">
          <div className="p-2 rounded-xl bg-vault-primary/10 text-vault-primary">
            <ShieldCheck size={22} />
          </div>
          <span className="text-base font-semibold tracking-wide">Vault</span>
        </div>

        {mode === 'login' ? (
          <LoginForm onSwitchToRegister={() => setMode('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setMode('login')} />
        )}
      </motion.div>
    </div>
  )
}
