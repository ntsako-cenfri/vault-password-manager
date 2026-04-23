import { NavLink, useNavigate } from 'react-router-dom'
import {
  ShieldCheck, LayoutGrid, Users, LogOut, Settings, ChevronRight, X
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/authStore'

interface Props {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: Props) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const handleNav = () => { onClose?.() }

  const links = [
    { to: '/dashboard', label: 'Vault', icon: LayoutGrid },
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
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
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
    </>
  )
}
