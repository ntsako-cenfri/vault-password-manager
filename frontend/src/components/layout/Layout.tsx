import { Sidebar } from './Sidebar'

interface Props { children: React.ReactNode }

export function Layout({ children }: Props) {
  return (
    <div className="flex min-h-screen bg-vault-bg">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
