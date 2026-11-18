/** Admin panel — user management + vault inspection. */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, UserCheck, UserX, ChevronDown, Eye, Trash2, X, Folder, Users, KeyRound, Copy, Check, HardDrive, Wifi, Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '@/api/users'
import { grantsApi } from '@/api/grants'
import { useAuthStore } from '@/store/authStore'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import type { User, UserRole, UserVaultResponse, VpnConfig } from '@/types'
import { clsx } from 'clsx'

const ROLE_COLORS: Record<UserRole, string> = {
  admin:    'bg-vault-primary/10 text-vault-primary border-vault-primary/20',
  team:     'bg-vault-accent/10 text-vault-accent border-vault-accent/20',
  external: 'bg-vault-muted/10 text-vault-muted border-vault-muted/20',
}

// Mirrors the server's default: SFTP login names are lowercase letters/digits/underscore.
function suggestSftpName(email: string): string {
  let base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user'
  if (!/^[a-z]/.test(base)) base = 'u' + base
  if (base.length < 2) base += 'x'
  return base.slice(0, 32)
}

export default function AdminPage() {
  const currentUser = useAuthStore((s) => s.user)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [vaultUser, setVaultUser] = useState<User | null>(null)
  const [vaultData, setVaultData] = useState<UserVaultResponse | null>(null)
  const [vaultLoading, setVaultLoading] = useState(false)
  // Password reset: confirm first, then show the one-time password exactly once
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sftpUser, setSftpUser] = useState<User | null>(null)
  const [sftpName, setSftpName] = useState('')
  const [sftpSaving, setSftpSaving] = useState(false)
  const [vpnUser, setVpnUser] = useState<User | null>(null)
  const [vpnConfig, setVpnConfig] = useState<VpnConfig | null>(null)
  const [vpnLoading, setVpnLoading] = useState(false)
  const [vpnSaving, setVpnSaving] = useState(false)
  const [vpnCopied, setVpnCopied] = useState(false)

  useEffect(() => {
    usersApi.list().then(({ data }) => setUsers(data)).finally(() => setLoading(false))
  }, [])

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const { data } = await usersApi.assignRole(userId, role)
      setUsers((us) => us.map((u) => (u.id === userId ? data : u)))
      toast.success('Role updated')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  const handleToggleActive = async (userId: string) => {
    try {
      const { data } = await usersApi.toggleActive(userId)
      setUsers((us) => us.map((u) => (u.id === userId ? data : u)))
      toast.success(data.is_active ? 'User enabled' : 'User disabled')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  const openSftp = (user: User) => {
    setSftpUser(user)
    setSftpName(user.sftp_username || suggestSftpName(user.email))
  }

  const closeSftp = () => {
    setSftpUser(null)
    setSftpName('')
  }

  const handleSftp = async (enabled: boolean) => {
    if (!sftpUser) return
    setSftpSaving(true)
    try {
      const { data } = await usersApi.setSftp(sftpUser.id, enabled, enabled ? sftpName.trim() : undefined)
      setUsers((us) => us.map((u) => (u.id === sftpUser.id ? data : u)))
      toast.success(enabled ? 'SFTP access allowed - active within a minute' : 'SFTP access stopped - folder and files kept')
      closeSftp()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setSftpSaving(false)
    }
  }

  const loadVpnConfig = async (user: User) => {
    setVpnLoading(true)
    try {
      const { data } = await usersApi.getVpnConfig(user.id)
      setVpnConfig(data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Could not load the VPN setup')
    } finally {
      setVpnLoading(false)
    }
  }

  const openVpn = (user: User) => {
    setVpnUser(user)
    setVpnConfig(null)
    setVpnCopied(false)
    if (user.vpn_enabled) loadVpnConfig(user)
  }

  const closeVpn = () => {
    setVpnUser(null)
    setVpnConfig(null)
  }

  const handleVpn = async (enabled: boolean) => {
    if (!vpnUser) return
    setVpnSaving(true)
    try {
      const { data } = await usersApi.setVpn(vpnUser.id, enabled)
      setUsers((us) => us.map((u) => (u.id === vpnUser.id ? data : u)))
      if (enabled) {
        toast.success('VPN access allowed - the setup is ready within a minute')
        setVpnUser(data)
        setVpnConfig({ ready: false, filename: null, config: null, qr_svg: null })
      } else {
        toast.success('VPN access stopped - can be allowed again at any time')
        closeVpn()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setVpnSaving(false)
    }
  }

  const downloadVpnConfig = () => {
    if (!vpnConfig?.config) return
    const url = URL.createObjectURL(new Blob([vpnConfig.config], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = vpnConfig.filename || 'cenfri-vpn.conf'
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyVpnConfig = async () => {
    if (!vpnConfig?.config) return
    try {
      await navigator.clipboard.writeText(vpnConfig.config)
      setVpnCopied(true)
      setTimeout(() => setVpnCopied(false), 2000)
    } catch {
      toast.error('Copy failed - use Download instead')
    }
  }

  const handleResetPassword = async () => {
    if (!resetUser) return
    setResetting(true)
    try {
      const { data } = await usersApi.resetPassword(resetUser.id)
      setTempPassword(data.temporary_password)
      setUsers((us) => us.map((u) => (u.id === resetUser.id ? { ...u, must_change_password: true } : u)))
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  const copyTempPassword = () => {
    if (!tempPassword) return
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    toast.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const closeReset = () => {
    setResetUser(null)
    setTempPassword(null)
    setCopied(false)
  }

  const openVault = async (user: User) => {
    setVaultUser(user)
    setVaultData(null)
    setVaultLoading(true)
    try {
      const { data } = await usersApi.getUserVault(user.id)
      setVaultData(data)
    } catch {
      toast.error('Failed to load vault')
      setVaultUser(null)
    } finally {
      setVaultLoading(false)
    }
  }

  const closeVault = () => {
    setVaultUser(null)
    setVaultData(null)
  }

  const handleRevokeGrant = async (grantedItem: UserVaultResponse['shared_items'][0]) => {
    try {
      await grantsApi.revokeGrant(grantedItem.item.id, grantedItem.grant_id)
      setVaultData((prev) =>
        prev
          ? { ...prev, shared_items: prev.shared_items.filter((gi) => gi.grant_id !== grantedItem.grant_id) }
          : prev
      )
      toast.success('Access revoked')
    } catch {
      toast.error('Failed to revoke')
    }
  }

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-vault-primary/10 text-vault-primary">
          <Shield size={18} />
        </div>
        <div>
          <h1 className="text-lg font-bold">User Management</h1>
          <p className="text-xs text-vault-muted">{users.length} registered users</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((user) => (
            <motion.div
              key={user.id}
              className="glass rounded-xl px-5 py-4 flex items-center gap-4"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-vault-elevated text-vault-muted flex items-center justify-center text-sm font-medium uppercase shrink-0">
                {user.username[0]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-vault-text">{user.username}</p>
                  {user.id === currentUser?.id && (
                    <span className="text-[10px] bg-vault-success/10 text-vault-success border border-vault-success/20 rounded px-1.5 py-0.5">You</span>
                  )}
                  {!user.is_active && (
                    <span className="text-[10px] bg-vault-danger/10 text-vault-danger border border-vault-danger/20 rounded px-1.5 py-0.5">Disabled</span>
                  )}
                  {user.sftp_enabled && (
                    <span className="text-[10px] bg-vault-primary/10 text-vault-primary border border-vault-primary/20 rounded px-1.5 py-0.5">SFTP: {user.sftp_username}</span>
                  )}
                  {user.vpn_enabled && (
                    <span className="text-[10px] bg-vault-accent/10 text-vault-accent border border-vault-accent/20 rounded px-1.5 py-0.5">VPN{user.vpn_ready ? '' : ' (setting up)'}</span>
                  )}
                  {user.must_change_password && (
                    <span className="text-[10px] bg-vault-accent/10 text-vault-accent border border-vault-accent/20 rounded px-1.5 py-0.5">Reset pending</span>
                  )}
                </div>
                <p className="text-xs text-vault-muted truncate">{user.email}</p>
              </div>

              {/* Role selector */}
              {currentUser?.role === 'admin' && user.id !== currentUser.id ? (
                <div className="relative">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className={clsx(
                      'appearance-none border text-xs rounded-lg px-3 py-1.5 pr-7 outline-none cursor-pointer font-medium',
                      ROLE_COLORS[user.role as UserRole],
                    )}
                  >
                    <option value="admin">Admin</option>
                    <option value="team">Team</option>
                    <option value="external">External</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                </div>
              ) : (
                <span className={clsx('text-xs border rounded-lg px-3 py-1.5 font-medium capitalize', ROLE_COLORS[user.role as UserRole])}>
                  {user.role}
                </span>
              )}

              {/* View vault */}
              {currentUser?.role === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openVault(user)}
                  title="View vault"
                >
                  <Eye size={14} />
                </Button>
              )}

              {/* SFTP access */}
              {currentUser?.role === 'admin' && (
                <Button
                  variant={user.sftp_enabled ? 'outline' : 'ghost'}
                  size="sm"
                  onClick={() => openSftp(user)}
                  title={user.sftp_enabled ? 'SFTP access: allowed' : 'SFTP access: not allowed'}
                >
                  <HardDrive size={14} />
                </Button>
              )}

              {/* VPN access */}
              {currentUser?.role === 'admin' && (
                <Button
                  variant={user.vpn_enabled ? 'outline' : 'ghost'}
                  size="sm"
                  onClick={() => openVpn(user)}
                  title={user.vpn_enabled ? 'VPN access: allowed' : 'VPN access: not allowed'}
                >
                  <Wifi size={14} />
                </Button>
              )}

              {/* Reset password */}
              {currentUser?.role === 'admin' && user.id !== currentUser.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResetUser(user)}
                  title="Reset password"
                >
                  <KeyRound size={14} />
                </Button>
              )}

              {/* Toggle active */}
              {currentUser?.role === 'admin' && user.id !== currentUser.id && (
                <Button
                  variant={user.is_active ? 'ghost' : 'outline'}
                  size="sm"
                  onClick={() => handleToggleActive(user.id)}
                  title={user.is_active ? 'Disable user' : 'Enable user'}
                >
                  {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ── SFTP access modal ─────────────────────────────────────── */}
      <Modal
        open={!!sftpUser}
        onClose={closeSftp}
        title="SFTP access"
        maxWidth="max-w-md"
      >
        {sftpUser && !sftpUser.sftp_enabled && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-vault-text">
              Allow <span className="font-medium">{sftpUser.username}</span>{' '}
              <span className="text-vault-muted">({sftpUser.email})</span> to use the SFTP server?
            </p>
            <Input
              label="SFTP username"
              value={sftpName}
              onChange={(e) => setSftpName(e.target.value.toLowerCase())}
              disabled={!!sftpUser.sftp_username}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-vault-muted">
              They log in on port 3000 with this username and their Vault password. A folder with
              this name is created for them - if it already exists it is used as it is, nothing is
              overwritten. It takes effect within a minute.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeSftp}>Cancel</Button>
              <Button size="sm" onClick={() => handleSftp(true)} loading={sftpSaving} disabled={sftpName.trim().length < 2}>
                Allow SFTP
              </Button>
            </div>
          </div>
        )}
        {sftpUser && sftpUser.sftp_enabled && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-vault-text">
              Stop SFTP access for <span className="font-medium">{sftpUser.username}</span>{' '}
              <span className="text-vault-muted">(login: {sftpUser.sftp_username})</span>?
            </p>
            <p className="text-xs text-vault-muted">
              Their SFTP login is removed within a minute. Their folder and every file in it are
              kept exactly as they are, and you can allow access again at any time.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeSftp}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => handleSftp(false)} loading={sftpSaving}>
                Stop SFTP access
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── VPN access modal (admin only) ──────────────────────────── */}
      <Modal open={!!vpnUser} onClose={closeVpn} title="VPN access" maxWidth="max-w-md">
        {vpnUser && !vpnUser.vpn_enabled && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-vault-text">
              Allow <span className="font-medium">{vpnUser.username}</span>{' '}
              <span className="text-vault-muted">({vpnUser.email})</span> to connect to the VPN?
            </p>
            <p className="text-xs text-vault-muted">
              A WireGuard setup is created for them within a minute. You then send them the QR
              code or the file from this window. It only gives access to the password manager.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeVpn}>Cancel</Button>
              <Button size="sm" onClick={() => handleVpn(true)} loading={vpnSaving}>Allow VPN</Button>
            </div>
          </div>
        )}
        {vpnUser && vpnUser.vpn_enabled && (
          <div className="flex flex-col gap-4">
            {vpnLoading && !vpnConfig && <div className="glass rounded-xl h-40 animate-pulse" />}
            {vpnConfig && !vpnConfig.ready && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-vault-text">
                  Setting up the VPN for <span className="font-medium">{vpnUser.username}</span>. This takes up to a minute.
                </p>
                <div className="flex justify-start">
                  <Button variant="outline" size="sm" onClick={() => loadVpnConfig(vpnUser)} loading={vpnLoading}>
                    <RefreshCw size={13} /> Check again
                  </Button>
                </div>
              </div>
            )}
            {vpnConfig?.ready && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-vault-text">
                  Send this to <span className="font-medium">{vpnUser.username}</span>. They install the free
                  WireGuard app and scan the QR code (phone) or import the file (computer).
                </p>
                {vpnConfig.qr_svg && (
                  <div className="self-center rounded-xl bg-white p-3">
                    <img
                      alt="VPN QR code"
                      className="w-56 h-56"
                      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(vpnConfig.qr_svg)}`}
                    />
                  </div>
                )}
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={downloadVpnConfig}><Download size={13} /> Download file</Button>
                  <Button variant="ghost" size="sm" onClick={copyVpnConfig}>{vpnCopied ? <Check size={13} /> : <Copy size={13} />} Copy</Button>
                </div>
                <p className="text-xs text-vault-muted">
                  This setup is a key to the VPN - send it only to this person, and use one setup per device.
                </p>
              </div>
            )}
            <div className="flex justify-between gap-2 border-t border-vault-border pt-3">
              <Button variant="danger" size="sm" onClick={() => handleVpn(false)} loading={vpnSaving}>Stop VPN access</Button>
              <Button size="sm" onClick={closeVpn}>Done</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Password reset modal ──────────────────────────────────── */}
      <Modal
        open={!!resetUser}
        onClose={closeReset}
        title={tempPassword ? 'Temporary password' : 'Reset password'}
        maxWidth="max-w-md"
      >
        {resetUser && !tempPassword && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-vault-text">
              Reset the password for <span className="font-medium">{resetUser.username}</span>{' '}
              <span className="text-vault-muted">({resetUser.email})</span>?
            </p>
            <p className="text-xs text-vault-muted">
              Their current password stops working immediately. You'll get a one-time password to
              send them — when they log in with it they'll be asked to choose a new one.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeReset}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleResetPassword} loading={resetting}>
                Reset password
              </Button>
            </div>
          </div>
        )}
        {resetUser && tempPassword && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-vault-text">
              Send this to <span className="font-medium">{resetUser.username}</span>. It won't be shown again.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-vault-border bg-vault-elevated px-3 py-2.5">
              <code className="flex-1 font-mono text-sm text-vault-text select-all break-all">{tempPassword}</code>
              <Button variant="ghost" size="sm" onClick={copyTempPassword} title="Copy">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
            <p className="text-xs text-vault-muted">
              On first login with this password they'll be taken straight to a screen to set their own.
            </p>
            <div className="flex justify-end">
              <Button size="sm" onClick={closeReset}>Done</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Vault inspector panel ─────────────────────────────────── */}
      <AnimatePresence>
        {vaultUser && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={closeVault} />

            {/* Panel */}
            <motion.div
              className="relative z-10 w-full max-w-lg h-full bg-vault-surface border-l border-vault-border flex flex-col overflow-hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {/* Panel header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-vault-border shrink-0">
                <div className="w-8 h-8 rounded-full bg-vault-elevated text-vault-muted flex items-center justify-center text-sm font-medium uppercase">
                  {vaultUser.username[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-vault-text">{vaultUser.username}'s Vault</p>
                  <p className="text-xs text-vault-muted truncate">{vaultUser.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={closeVault}>
                  <X size={16} />
                </Button>
              </div>

              {/* Panel body */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
                {vaultLoading ? (
                  <div className="flex flex-col gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-12 rounded-lg bg-vault-elevated animate-pulse" />
                    ))}
                  </div>
                ) : vaultData ? (
                  <>
                    {/* Own items */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <Folder size={13} className="text-vault-primary" />
                        <h3 className="text-xs font-semibold text-vault-muted uppercase tracking-wider">
                          Own Items ({vaultData.own_items.length})
                        </h3>
                      </div>
                      {vaultData.own_items.length === 0 ? (
                        <p className="text-xs text-vault-muted text-center py-4">No vault items</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {vaultData.own_items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-vault-border bg-vault-elevated"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-vault-text truncate">{item.title}</p>
                                {item.description && (
                                  <p className="text-xs text-vault-muted truncate">{item.description}</p>
                                )}
                                <p className="text-[10px] text-vault-muted">{item.fields.length} field{item.fields.length !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Shared with this user — split so it directly answers
                        "what am I sharing to them" instead of burying it in
                        everyone else's shares too. */}
                    {(() => {
                      const sharedByYou = vaultData.shared_items.filter((gi) => gi.granted_by === currentUser?.id)
                      const sharedByOthers = vaultData.shared_items.filter((gi) => gi.granted_by !== currentUser?.id)
                      const renderGrant = (gi: typeof vaultData.shared_items[0]) => (
                        <div
                          key={gi.grant_id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-vault-border bg-vault-elevated"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-vault-text truncate">{gi.item.title}</p>
                            <p className="text-[10px] text-vault-muted">
                              Shared by {gi.granted_by_username} · {gi.item.fields.length} field{gi.item.fields.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRevokeGrant(gi)}
                            title="Revoke access"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      )
                      return (
                        <>
                          <section>
                            <div className="flex items-center gap-2 mb-3">
                              <Users size={13} className="text-vault-primary" />
                              <h3 className="text-xs font-semibold text-vault-muted uppercase tracking-wider">
                                Shared By You ({sharedByYou.length})
                              </h3>
                            </div>
                            {sharedByYou.length === 0 ? (
                              <p className="text-xs text-vault-muted text-center py-4">You haven't shared anything with this user</p>
                            ) : (
                              <div className="flex flex-col gap-2">{sharedByYou.map(renderGrant)}</div>
                            )}
                          </section>

                          <section>
                            <div className="flex items-center gap-2 mb-3">
                              <Users size={13} className="text-vault-accent" />
                              <h3 className="text-xs font-semibold text-vault-muted uppercase tracking-wider">
                                Shared By Others ({sharedByOthers.length})
                              </h3>
                            </div>
                            {sharedByOthers.length === 0 ? (
                              <p className="text-xs text-vault-muted text-center py-4">Nothing shared by anyone else</p>
                            ) : (
                              <div className="flex flex-col gap-2">{sharedByOthers.map(renderGrant)}</div>
                            )}
                          </section>
                        </>
                      )
                    })()}
                  </>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  )
}
