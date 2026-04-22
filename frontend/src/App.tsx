import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

import SetupPage from '@/pages/SetupPage'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import VaultItemPage from '@/pages/VaultItemPage'
import SharedAccessPage from '@/pages/SharedAccessPage'
import AdminPage from '@/pages/AdminPage'
import SettingsPage from '@/pages/SettingsPage'

/** Redirects unauthenticated users to /login */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-bg flex items-center justify-center">
        <div className="animate-spin w-7 h-7 border-2 border-vault-primary border-t-transparent rounded-full" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

/** Admin-only gate */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { hydrate } = useAuthStore()
  useEffect(() => { hydrate() }, [hydrate])

  return (
    <Routes>
      {/* Public */}
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/share/:token" element={<SharedAccessPage />} />

      {/* Protected */}
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/vault/new" element={<PrivateRoute><VaultItemPage /></PrivateRoute>} />
      <Route path="/vault/:id" element={<PrivateRoute><VaultItemPage /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><AdminRoute><AdminPage /></AdminRoute></PrivateRoute>} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
