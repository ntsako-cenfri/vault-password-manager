/** Admin panel — user management + vault inspection. */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, UserCheck, UserX, ChevronDown, Eye, Trash2, X, Folder, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '@/api/users'
import { grantsApi } from '@/api/grants'
import { useAuthStore } from '@/store/authStore'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import type { User, UserRole, UserVaultResponse } from '@/types'
import { clsx } from 'clsx'

const ROLE_COLORS: Record<UserRole, string> = {
  admin:    'bg-vault-primary/10 text-vault-primary border-vault-primary/20',
  team:     'bg-vault-accent/10 text-vault-accent border-vault-accent/20',
  external: 'bg-vault-muted/10 text-vault-muted border-vault-muted/20',
}

export default function AdminPage() {
  const currentUser = useAuthStore((s) => s.user)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [vaultUser, setVaultUser] = useState<User | null>(null)
  const [vaultData, setVaultData] = useState<UserVaultResponse | null>(null)
  const [vaultLoading, setVaultLoading] = useState(false)

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

                    {/* Shared with this user */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <Users size={13} className="text-vault-accent" />
                        <h3 className="text-xs font-semibold text-vault-muted uppercase tracking-wider">
                          Shared With Them ({vaultData.shared_items.length})
                        </h3>
                      </div>
                      {vaultData.shared_items.length === 0 ? (
                        <p className="text-xs text-vault-muted text-center py-4">Nothing shared with this user</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {vaultData.shared_items.map((gi) => (
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
                          ))}
                        </div>
                      )}
                    </section>
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
