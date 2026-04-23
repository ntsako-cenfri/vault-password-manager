import { useState } from 'react'
import { Menu, ShieldCheck } from 'lucide-react'
import { Sidebar } from './Sidebar'

interface Props { children: React.ReactNode }

export function Layout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-vault-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-vault-surface border-b border-vault-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-vault-muted hover:text-vault-text transition-colors p-1"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-vault-primary/15 text-vault-primary">
              <ShieldCheck size={15} />
            </div>
            <span className="font-semibold text-sm tracking-wide">Vault</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
