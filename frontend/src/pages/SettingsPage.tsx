import { useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Layout } from '@/components/layout/Layout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const [current, setCurrent] = useState('')
  const [newPw, setNewPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.resetPassword(current, newPw)
      toast.success('Password updated')
      setCurrent('')
      setNewPw('')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-md">
        <h1 className="text-lg font-bold mb-6">Settings</h1>

        <motion.div className="glass rounded-2xl p-6 flex flex-col gap-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {/* Account info */}
          <div className="flex flex-col gap-1 pb-4 border-b border-vault-border">
            <p className="text-xs text-vault-muted uppercase tracking-wider font-medium mb-2">Account</p>
            <p className="text-sm"><span className="text-vault-muted">Username:</span> {user?.username}</p>
            <p className="text-sm"><span className="text-vault-muted">Email:</span> {user?.email}</p>
            <p className="text-sm capitalize"><span className="text-vault-muted">Role:</span> {user?.role}</p>
          </div>

          {/* Password reset */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Key size={15} className="text-vault-primary" />
              <p className="text-sm font-medium">Change Password</p>
            </div>

            <form onSubmit={handleReset} className="flex flex-col gap-3">
              <div className="relative">
                <Input
                  label="Current Password"
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 bottom-2 text-vault-muted hover:text-vault-text">
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="New Password"
                  type={showNew ? 'text' : 'password'}
                  placeholder="Min 10 chars, uppercase & number"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 bottom-2 text-vault-muted hover:text-vault-text">
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <Button type="submit" loading={loading} className="self-start">
                Update Password
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
