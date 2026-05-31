import { useState, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { useAuthStore } from './store/authStore'
import { authService } from './services/authService'

import LoginPage from './pages/auth/LoginPage'
import TwoFAPage from './pages/auth/TwoFAPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import AcceptInvitePage from './pages/auth/AcceptInvitePage'
import AdminProfilePage from './pages/profile/AdminProfilePage'
import SecurityPage from './pages/profile/SecurityPage'
import AdminDirectoryPage from './pages/admin-users/AdminDirectoryPage'
import VehicleClassesPage from './pages/catalog/VehicleClassesPage'
import ServiceZonesPage from './pages/catalog/ServiceZonesPage'
import AircraftTypesPage from './pages/catalog/AircraftTypesPage'
import AirRoutesPage from './pages/catalog/AirRoutesPage'
import CustomersPage from './pages/customers/CustomersPage'
import CustomerDetailPage from './pages/customers/CustomerDetailPage'
import DriverOnboardingPage from './pages/drivers/DriverOnboardingPage'
import DriverDirectoryPage from './pages/drivers/DriverDirectoryPage'
import DriverDetailPage from './pages/drivers/DriverDetailPage'
import DocumentReviewPage from './pages/drivers/DocumentReviewPage'
import AirBookingsPage from './pages/bookings/AirBookingsPage'
import AirBookingDetailPage from './pages/bookings/AirBookingDetailPage'
import AirBookingQuotePage from './pages/bookings/AirBookingQuotePage'

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
  // On every page load, validate the stored refresh token against the server.
  // If the session was revoked from another device, the refresh call returns 401
  // and the axios interceptor clears localStorage + hard-redirects to /login.
  // This covers pages (like Dashboard) that make no API calls of their own,
  // and tokens that predate the session-ID claim.
  const [sessionChecked, setSessionChecked] = useState(false)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const refreshToken = useAuthStore(s => s.refreshToken)
  const setAuth = useAuthStore(s => s.setAuth)

  useEffect(() => {
    if (!isAuthenticated || !refreshToken) {
      // Not logged in — nothing to validate, render immediately.
      setSessionChecked(true)
      return
    }

    // Exchange the stored refresh token for fresh tokens.
    // Backend checks the session is still active (not revoked).
    authService.refresh(refreshToken)
      .then(res => {
        // Update store with fresh tokens (also embeds new session ID in access token).
        setAuth(res.user, res.access_token, res.refresh_token)
        setSessionChecked(true)
      })
      .catch(() => {
        // 401 → axios interceptor already cleared localStorage and redirected to /login.
        // Any other error (network down) → let the app render; don't force-logout
        // just because the server was temporarily unreachable.
        setSessionChecked(true)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Hold rendering until the session check completes to avoid a flash of
  // protected content on a revoked session before the redirect fires.
  if (!sessionChecked) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--ink-3)',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
      }}>
        Checking session…
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes — redirect to /dashboard if already signed in */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          {/* Invite acceptance — always public, regardless of auth state */}
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          {/* /2fa is mid-login flow — no PublicRoute (partial_token required, checked inside page) */}
          <Route path="/2fa" element={<TwoFAPage />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><AdminProfilePage /></PrivateRoute>} />
          <Route path="/profile/security" element={<PrivateRoute><SecurityPage /></PrivateRoute>} />
          <Route path="/admin-users" element={<PrivateRoute><AdminDirectoryPage /></PrivateRoute>} />

          {/* Catalog */}
          <Route path="/catalog" element={<Navigate to="/catalog/vehicle-classes" replace />} />
          <Route path="/catalog/vehicle-classes" element={<PrivateRoute><VehicleClassesPage /></PrivateRoute>} />
          <Route path="/catalog/zones" element={<PrivateRoute><ServiceZonesPage /></PrivateRoute>} />
          <Route path="/catalog/aircraft-types" element={<PrivateRoute><AircraftTypesPage /></PrivateRoute>} />
          <Route path="/catalog/air-routes" element={<PrivateRoute><AirRoutesPage /></PrivateRoute>} />

          {/* Customers */}
          <Route path="/customers" element={<PrivateRoute><CustomersPage /></PrivateRoute>} />
          <Route path="/customers/:id" element={<PrivateRoute><CustomerDetailPage /></PrivateRoute>} />

          {/* Drivers */}
          <Route path="/drivers" element={<PrivateRoute><DriverDirectoryPage /></PrivateRoute>} />
          <Route path="/drivers/onboarding" element={<PrivateRoute><DriverOnboardingPage /></PrivateRoute>} />
          <Route path="/drivers/:id" element={<PrivateRoute><DriverDetailPage /></PrivateRoute>} />
          <Route path="/drivers/:id/documents/:docId" element={<PrivateRoute><DocumentReviewPage /></PrivateRoute>} />

          {/* Air Bookings — static paths BEFORE dynamic :id */}
          <Route path="/bookings/air/quotes/:bookingId" element={<PrivateRoute><AirBookingQuotePage /></PrivateRoute>} />
          <Route path="/bookings/air/:id" element={<PrivateRoute><AirBookingDetailPage /></PrivateRoute>} />
          <Route path="/bookings/air" element={<PrivateRoute><AirBookingsPage /></PrivateRoute>} />

          {/* Default */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
