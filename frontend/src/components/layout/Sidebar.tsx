import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck, LayoutGrid, Users, LogOut, Settings, ChevronRight, ChevronDown, X, UserPlus
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/authStore'
import { useVaultStore } from '@/store/vaultStore'
import { groupNames } from '@/utils/groups'
import { InviteModal } from '@/components/ui/InviteModal'

interface Props {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: Props) {
  const { user, logout } = useAuthStore()
  const { items, fetch } = useVaultStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [vaultExpanded, setVaultExpanded] = useState(true)

  // The sidebar needs the item list too (to know what groups exist) — this
  // mounts on every authenticated page, so it doubles as an early prefetch
  // for the dashboard. Cheap and idempotent.
  useEffect(() => { fetch() }, [fetch])

  const handleLogout = () => { logout(); navigate('/login') }
  const handleNav = () => { onClose?.() }

  const groups = groupNames(items)
  const onDashboard = location.pathname === '/dashboard'
  const activeGroup = onDashboard ? searchParams.get('group') : null

  const otherLinks = [
    ...(user?.role !== 'external' ? [{ to: '/admin', label: 'Users', icon: Users }] : []),
  ]

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
              {groups.length > 0 && (
                <button
                  onClick={() => setVaultExpanded((v) => !v)}
                  className="px-2 py-2.5 text-vault-muted hover:text-vault-text transition-colors"
                  aria-label={vaultExpanded ? 'Collapse groups' : 'Expand groups'}
                >
                  {vaultExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
            </div>

            {vaultExpanded && groups.length > 0 && (
              <div className="ml-4 pl-3 border-l border-vault-border flex flex-col gap-0.5 mt-1 mb-1">
                {groups.map((g) => (
                  <Link
                    key={g}
                    to={`/dashboard?group=${encodeURIComponent(g)}`}
                    onClick={handleNav}
                    className={clsx(
                      'px-2.5 py-1.5 rounded-md text-xs font-medium truncate transition-colors',
                      activeGroup === g
                        ? 'bg-vault-primary/10 text-vault-primary'
                        : 'text-vault-muted hover:bg-vault-elevated hover:text-vault-text',
                    )}
                  >
                    {g}
                  </Link>
                ))}
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
