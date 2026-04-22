/** Admin panel — user list, role assignment, active toggle. */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, UserCheck, UserX, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '@/api/users'
import { useAuthStore } from '@/store/authStore'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import type { User, UserRole } from '@/types'
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
              {/* Avatar placeholder */}
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

              {/* Role selector — admin only */}
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

              {/* Toggle active — admin only, not self */}
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
    </Layout>
  )
}
