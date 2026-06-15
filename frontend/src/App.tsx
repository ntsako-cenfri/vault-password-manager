import { useEffect, useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { SessionTimeoutModal } from '@/components/ui/SessionTimeoutModal'

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

const WARN_SECS   = 2 * 60   // show warning 2 min before logout
const LOGOUT_SECS = 15 * 60  // 15 min total idle → auto logout

function SessionGuard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [warnOpen, setWarnOpen] = useState(false)
  const [secsLeft, setSecsLeft] = useState(WARN_SECS)

  // Start countdown ticker when warning appears
  useEffect(() => {
    if (!warnOpen) return
    setSecsLeft(WARN_SECS)
    const tick = setInterval(() => {
      setSecsLeft((s) => {
        if (s <= 1) { clearInterval(tick); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [warnOpen])

  const handleWarn    = useCallback(() => setWarnOpen(true), [])
  const handleLogout  = useCallback(() => {
    setWarnOpen(false)
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  const { extendSession } = useIdleTimeout({
    warnAfterMs:   (LOGOUT_SECS - WARN_SECS) * 1000,
    logoutAfterMs: LOGOUT_SECS * 1000,
    onWarn:   handleWarn,
    onLogout: handleLogout,
    enabled:  !!user,
  })

  const handleStay = useCallback(() => {
    setWarnOpen(false)
    extendSession()
  }, [extendSession])

  return (
    <SessionTimeoutModal
      open={warnOpen}
      secondsLeft={secsLeft}
      onStayLoggedIn={handleStay}
      onLogoutNow={handleLogout}
    />
  )
}

function AppRoutes() {
  const { hydrate } = useAuthStore()
  useEffect(() => { hydrate() }, [hydrate])

  return (
    <>
    <SessionGuard />
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
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
