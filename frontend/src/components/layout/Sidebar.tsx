import { NavLink, useNavigate } from 'react-router-dom'
import {
  ShieldCheck, LayoutGrid, Users, LogOut, Settings, ChevronRight
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/authStore'

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const links = [
    { to: '/dashboard', label: 'Vault', icon: LayoutGrid },
    ...(user?.role !== 'external' ? [{ to: '/admin', label: 'Users', icon: Users }] : []),
  ]

  return (
    <aside className="w-60 shrink-0 h-screen flex flex-col border-r border-vault-border bg-vault-surface">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-vault-border">
        <div className="p-1.5 rounded-lg bg-vault-primary/15 text-vault-primary">
          <ShieldCheck size={18} />
        </div>
        <span className="font-semibold text-sm tracking-wide">Vault</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group',
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
  )
}
