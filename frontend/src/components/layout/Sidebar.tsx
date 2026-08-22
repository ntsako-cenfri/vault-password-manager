import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck, LayoutGrid, Users, LogOut, Settings, ChevronRight, ChevronDown, X, UserPlus, Plus, Trash2
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useGroupsStore } from '@/store/groupsStore'
import { groupsApi } from '@/api/groups'
import { InviteModal } from '@/components/ui/InviteModal'

interface Props {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: Props) {
  const { user, logout } = useAuthStore()
  const { groups, fetch: fetchGroups, add: addGroup, remove: removeGroup } = useGroupsStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [vaultExpanded, setVaultExpanded] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  // Mounts on every authenticated page, so it doubles as an early prefetch
  // for wherever the group list is needed next (dashboard, item form).
  useEffect(() => { fetchGroups() }, [fetchGroups])

  const handleLogout = () => { logout(); navigate('/login') }
  const handleNav = () => { onClose?.() }

  const onDashboard = location.pathname === '/dashboard'
  const activeGroup = onDashboard ? searchParams.get('group') : null

  const otherLinks = [
    ...(user?.role !== 'external' ? [{ to: '/admin', label: 'Users', icon: Users }] : []),
  ]

  const submitNewGroup = async () => {
    const name = newGroupName.trim()
    if (!name) { setCreating(false); return }
    try {
      const { data } = await groupsApi.create(name)
      addGroup(data)
      toast.success(`Group "${data.name}" created`)
    } catch {
      toast.error('Could not create group')
    } finally {
      setCreating(false)
      setNewGroupName('')
    }
  }

  const handleDeleteGroup = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete group "${name}"? Items already filed under it keep their label — this just removes it from this list.`)) return
    try {
      await groupsApi.delete(id)
      removeGroup(id)
      toast.success('Group deleted')
    } catch {
      toast.error('Could not delete group')
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'w-60 shrink-0 h-screen flex flex-col border-r border-vault-border bg-vault-surface',
          // Mobile: fixed drawer, slides in/out
          'fixed inset-y-0 left-0 z-40 transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible, static
          'md:relative md:translate-x-0 md:z-auto',
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between gap-2.5 px-5 py-5 border-b border-vault-border">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-vault-primary/15 text-vault-primary">
              <ShieldCheck size={18} />
            </div>
            <span className="font-semibold text-sm tracking-wide">Vault</span>
          </div>
          {/* Close button — mobile only */}
          <button
            className="md:hidden text-vault-muted hover:text-vault-text transition-colors"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {/* Vault — expandable to show groups underneath */}
          <div>
            <div className="flex items-center gap-0.5">
              <NavLink
                to="/dashboard"
                onClick={handleNav}
                className={() =>
                  clsx(
                    'flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                    onDashboard && !activeGroup
                      ? 'bg-vault-primary/10 text-vault-primary'
                      : 'text-vault-muted hover:bg-vault-elevated hover:text-vault-text',
                  )
                }
              >
                <LayoutGrid size={16} />
                Vault
              </NavLink>
              <button
                onClick={() => setVaultExpanded((v) => !v)}
                className="px-2 py-2.5 text-vault-muted hover:text-vault-text transition-colors"
                aria-label={vaultExpanded ? 'Collapse groups' : 'Expand groups'}
              >
                {vaultExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>

            {vaultExpanded && (
              <div className="ml-4 pl-3 border-l border-vault-border flex flex-col gap-0.5 mt-1 mb-1">
                {groups.map((g) => (
                  <div key={g.id} className="flex items-center group/g">
                    <Link
                      to={`/dashboard?group=${encodeURIComponent(g.name)}`}
                      onClick={handleNav}
                      className={clsx(
                        'flex-1 px-2.5 py-1.5 rounded-md text-xs font-medium truncate transition-colors',
                        activeGroup === g.name
                          ? 'bg-vault-primary/10 text-vault-primary'
                          : 'text-vault-muted hover:bg-vault-elevated hover:text-vault-text',
                      )}
                    >
                      {g.name}
                    </Link>
                    <button
                      onClick={(e) => handleDeleteGroup(e, g.id, g.name)}
                      className="px-1.5 text-vault-muted/0 group-hover/g:text-vault-muted hover:!text-vault-danger transition-colors"
                      title="Delete group"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}

                {creating ? (
                  <input
                    autoFocus
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onBlur={submitNewGroup}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitNewGroup()
                      if (e.key === 'Escape') { setCreating(false); setNewGroupName('') }
                    }}
                    placeholder="Group name…"
                    className="mx-0.5 bg-vault-elevated border border-vault-border rounded-md px-2 py-1 text-xs text-vault-text placeholder:text-vault-muted/50 outline-none focus:border-vault-primary transition-colors"
                  />
                ) : (
                  <button
                    onClick={() => setCreating(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-vault-muted hover:bg-vault-elevated hover:text-vault-text transition-colors"
                  >
                    <Plus size={12} /> New Group
                  </button>
                )}
              </div>
            )}
          </div>

          {otherLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={handleNav}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                  isActive
                    ? 'bg-vault-primary/10 text-vault-primary'
                    : 'text-vault-muted hover:bg-vault-elevated hover:text-vault-text',
                )
              }
            >
              <Icon size={16} />
              {label}
              <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />
            </NavLink>
          ))}

          {/* Invite — admin & team only */}
          {user?.role !== 'external' && (
            <button
              onClick={() => { setInviteOpen(true); onClose?.() }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group text-vault-muted hover:bg-vault-elevated hover:text-vault-text w-full text-left"
            >
              <UserPlus size={16} />
              Invite People
              <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />
            </button>
          )}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-vault-border space-y-1">
          <NavLink
            to="/settings"
            onClick={handleNav}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-vault-muted hover:bg-vault-elevated hover:text-vault-text transition-colors"
          >
            <Settings size={16} />
            Settings
          </NavLink>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-vault-elevated mt-1">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-vault-text truncate">{user?.username}</p>
              <p className="text-[10px] text-vault-muted capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-vault-muted hover:text-vault-danger transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  )
}
