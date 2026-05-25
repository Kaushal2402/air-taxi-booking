import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { useAuthStore } from './store/authStore'

import LoginPage from './pages/auth/LoginPage'
import TwoFAPage from './pages/auth/TwoFAPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import AdminProfilePage from './pages/profile/AdminProfilePage'
import SecurityPage from './pages/profile/SecurityPage'
import AdminDirectoryPage from './pages/admin-users/AdminDirectoryPage'

const DashboardPage = () => (
  <div style={{ padding: 40, color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>
    Dashboard — coming in Module 02
  </div>
)

// Blocks access to protected pages when not authenticated.
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const accessToken = useAuthStore(s => s.accessToken)
  if (!isAuthenticated || !accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Redirects already-authenticated users away from auth pages (login, forgot-password, etc.)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const accessToken = useAuthStore(s => s.accessToken)
  if (isAuthenticated && accessToken) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes — redirect to /dashboard if already signed in */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          {/* /2fa is mid-login flow — no PublicRoute (partial_token required, checked inside page) */}
          <Route path="/2fa" element={<TwoFAPage />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><AdminProfilePage /></PrivateRoute>} />
          <Route path="/profile/security" element={<PrivateRoute><SecurityPage /></PrivateRoute>} />
          <Route path="/admin-users" element={<PrivateRoute><AdminDirectoryPage /></PrivateRoute>} />

          {/* Default */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
