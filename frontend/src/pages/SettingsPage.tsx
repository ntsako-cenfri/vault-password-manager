import { useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Eye, EyeOff, Smartphone, ShieldCheck, ShieldOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import type { TotpSetupResponse } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Layout } from '@/components/layout/Layout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const hydrate = useAuthStore((s) => s.hydrate)
  const [current, setCurrent] = useState('')
  const [newPw, setNewPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)

  // 2FA state
  const [totpSetup, setTotpSetup] = useState<TotpSetupResponse | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpLoading, setTotpLoading] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [showDisable, setShowDisable] = useState(false)

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

  const handleSetupTotp = async () => {
    setTotpLoading(true)
    try {
      const { data } = await authApi.totpSetup()
      setTotpSetup(data)
      setTotpCode('')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start 2FA setup')
    } finally {
      setTotpLoading(false)
    }
  }

  const handleEnableTotp = async (e: React.FormEvent) => {
    e.preventDefault()
    setTotpLoading(true)
    try {
      await authApi.totpEnable(totpCode)
      toast.success('Two-factor authentication enabled!')
      setTotpSetup(null)
      setTotpCode('')
      await hydrate()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid code')
      setTotpCode('')
    } finally {
      setTotpLoading(false)
    }
  }

  const handleDisableTotp = async (e: React.FormEvent) => {
    e.preventDefault()
    setTotpLoading(true)
    try {
      await authApi.totpDisable(disableCode)
      toast.success('Two-factor authentication disabled')
      setShowDisable(false)
      setDisableCode('')
      await hydrate()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid code')
      setDisableCode('')
    } finally {
      setTotpLoading(false)
    }
  }

  // Build QR code image URL using a free public chart API (no external package needed)
  const qrUrl = totpSetup
    ? `https://quickchart.io/qr?text=${encodeURIComponent(totpSetup.otpauth_uri)}&size=200&margin=1`
    : null

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
          <div className="pb-4 border-b border-vault-border">
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

          {/* Two-Factor Authentication */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Smartphone size={15} className="text-vault-primary" />
              <p className="text-sm font-medium">Two-Factor Authentication</p>
              {user?.totp_enabled && (
                <span className="ml-auto text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck size={11} /> Enabled
                </span>
              )}
            </div>
            <p className="text-xs text-vault-muted mb-4">
              Use Google Authenticator, Microsoft Authenticator, or Authy to generate login codes.
            </p>

            {/* 2FA is OFF — show setup flow */}
            {!user?.totp_enabled && !totpSetup && (
              <Button variant="outline" onClick={handleSetupTotp} loading={totpLoading}>
                Set up 2FA
              </Button>
            )}

            {/* QR code setup step */}
            {!user?.totp_enabled && totpSetup && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl">
                  <img src={qrUrl!} alt="Scan with authenticator app" className="w-48 h-48" />
                  <p className="text-[10px] text-gray-500 text-center">Scan with your authenticator app</p>
                </div>
                <div className="bg-vault-border/30 rounded-lg p-3">
                  <p className="text-xs text-vault-muted mb-1">Or enter this key manually:</p>
                  <code className="text-xs font-mono text-vault-text break-all select-all">{totpSetup.secret}</code>
                </div>
                <form onSubmit={handleEnableTotp} className="flex flex-col gap-3">
                  <Input
                    label="Enter the 6-digit code to confirm"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="submit" loading={totpLoading}>Enable 2FA</Button>
                    <Button type="button" variant="outline" onClick={() => setTotpSetup(null)}>Cancel</Button>
                  </div>
                </form>
              </div>
            )}

            {/* 2FA is ON — show disable option */}
            {user?.totp_enabled && !showDisable && (
              <Button
                variant="outline"
                onClick={() => setShowDisable(true)}
                className="flex items-center gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
              >
                <ShieldOff size={14} /> Disable 2FA
              </Button>
            )}

            {user?.totp_enabled && showDisable && (
              <form onSubmit={handleDisableTotp} className="flex flex-col gap-3">
                <Input
                  label="Enter your current authenticator code to disable 2FA"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="submit" loading={totpLoading} className="bg-red-500/80 hover:bg-red-500">
                    Confirm Disable
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowDisable(false); setDisableCode('') }}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
