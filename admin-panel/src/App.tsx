import { useState, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { useAuthStore } from './store/authStore'
import { usePlatformStore } from './store/platformStore'
import { usePermissionStore } from './store/permissionStore'
import { authService } from './services/authService'
import { rbacService } from './services/rbacService'

import DashboardPage from './pages/dashboard/DashboardPage'
import LiveMapPage from './pages/dashboard/LiveMapPage'
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
import PrivacyRequestsPage from './pages/privacy/PrivacyRequestsPage'
import DriverOnboardingPage from './pages/drivers/DriverOnboardingPage'
import DriverDirectoryPage from './pages/drivers/DriverDirectoryPage'
import DriverDetailPage from './pages/drivers/DriverDetailPage'
import DocumentReviewPage from './pages/drivers/DocumentReviewPage'
import RoadBookingsPage from './pages/bookings/RoadBookingsPage'
import BookingDetailPage from './pages/bookings/BookingDetailPage'
import AssistedBookingPage from './pages/bookings/AssistedBookingPage'
import DisputesPage from './pages/bookings/DisputesPage'
import AirBookingsPage from './pages/bookings/AirBookingsPage'
import AirBookingDetailPage from './pages/bookings/AirBookingDetailPage'
import AirBookingQuotePage from './pages/bookings/AirBookingQuotePage'
import AirAssistedBookingPage from './pages/bookings/AirAssistedBookingPage'
import RoadFareRulesPage from './pages/pricing/RoadFareRulesPage'
import AirFareRulesPage from './pages/pricing/AirFareRulesPage'
import TaxesPage from './pages/pricing/TaxesPage'
import FareSimulatorPage from './pages/pricing/FareSimulatorPage'
import OperatorDirectoryPage from './pages/operators/OperatorDirectoryPage'
import OperatorDetailPage from './pages/operators/OperatorDetailPage'
import OperatorOnboardingPage from './pages/operators/OperatorOnboardingPage'
import AircraftDirectoryPage from './pages/aircraft/AircraftDirectoryPage'
import AircraftDetailPage from './pages/aircraft/AircraftDetailPage'
import PilotsCrewPage from './pages/aircraft/PilotsCrewPage'
import VehicleDirectoryPage from './pages/vehicles/VehicleDirectoryPage'
import VehicleDetailPage from './pages/vehicles/VehicleDetailPage'
import VendorDirectoryPage from './pages/vehicles/VendorDirectoryPage'
import VendorNewPage from './pages/vehicles/VendorNewPage'
import KycQueuePage from './pages/kyc/KycQueuePage'
import KycDocumentDetailPage from './pages/kyc/KycDocumentDetailPage'
import KycExpiryPage from './pages/kyc/KycExpiryPage'
import PromotionsPage from './pages/promotions/PromotionsPage'
import ReferralPage from './pages/promotions/ReferralPage'
import RedemptionAnalyticsPage from './pages/promotions/RedemptionAnalyticsPage'
import AuditStreamPage from './pages/audit/AuditStreamPage'
import AuditEventPage from './pages/audit/AuditEventPage'
import SecurityCompliancePage from './pages/audit/SecurityCompliancePage'
import AdminDetailPage from './pages/admin-users/AdminDetailPage'
import InvitesPage from './pages/admin-users/InvitesPage'
import PlatformSettingsPage from './pages/settings/PlatformSettingsPage'
import FeatureFlagsPage from './pages/settings/FeatureFlagsPage'
import MaintenancePage from './pages/settings/MaintenancePage'
import DispatchConsolePage from './pages/dispatch/DispatchConsolePage'
import DispatchExceptionsPage from './pages/dispatch/DispatchExceptionsPage'
import SupplySurgePage from './pages/dispatch/SupplySurgePage'
import TicketQueuePage from './pages/support/TicketQueuePage'
import TicketDetailPage from './pages/support/TicketDetailPage'
import SlaEscalationPage from './pages/support/SlaEscalationPage'
import PaymentsPage from './pages/payments/PaymentsPage'
import TransactionDetailPage from './pages/payments/TransactionDetailPage'
import ReconciliationPage from './pages/payments/ReconciliationPage'
import PayoutRunsPage from './pages/payouts/PayoutRunsPage'
import PayoutRunDetailPage from './pages/payouts/PayoutRunDetailPage'
import DriverStatementPage from './pages/payouts/DriverStatementPage'
import ReportLibraryPage from './pages/reports/ReportLibraryPage'
import RevenueReportPage from './pages/reports/RevenueReportPage'
import ReportBuilderPage from './pages/reports/ReportBuilderPage'
import BrandProfilesPage from './pages/branding/BrandProfilesPage'
import ThemeEditorPage from './pages/branding/ThemeEditorPage'
import TouchpointsPage from './pages/branding/TouchpointsPage'
import RolesListPage from './pages/rbac/RolesListPage'
import RoleEditorPage from './pages/rbac/RoleEditorPage'
import PermissionsCatalogPage from './pages/rbac/PermissionsCatalogPage'
import NotificationTemplatesPage from './pages/notifications/NotificationTemplatesPage'
import TemplateEditorPage from './pages/notifications/TemplateEditorPage'
import DeliveryLogPage from './pages/notifications/DeliveryLogPage'
import NoAccessPage from './pages/auth/NoAccessPage'
import { getFirstPermittedPath } from './lib/getFirstPermittedPath'

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
  const can = usePermissionStore(s => s.can)
  const isSuperAdmin = usePermissionStore(s => s.isSuperAdmin)
  const permissionsLoaded = usePermissionStore(s => s.permissionsLoaded)
  if (isAuthenticated && accessToken) {
    // Wait until permissions are loaded so we redirect to the right place
    if (!permissionsLoaded) return null
    return <Navigate to={getFirstPermittedPath(isSuperAdmin, can)} replace />
  }
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
  const loadPlatform = usePlatformStore(s => s.load)
  const setPermissions = usePermissionStore(s => s.setPermissions)
  const clearPermissions = usePermissionStore(s => s.clearPermissions)

  // Load the current user's effective permissions from the RBAC API.
  // Called once after auth is confirmed (session restore or login).
  async function loadPermissions(role: string) {
    if (role === 'super_admin') {
      setPermissions({}, true)
      return
    }
    try {
      const roleRow = await rbacService.getRoleByName(role)
      const { permissions } = await rbacService.getRolePermissions(roleRow.id)
      const map: Record<string, string> = {}
      permissions.forEach(p => { map[p.permission_key] = p.state })
      setPermissions(map, false)
    } catch {
      // Network/auth error — permissions stay empty (safest default: deny)
      setPermissions({}, false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !refreshToken) {
      // Not logged in — nothing to validate, render immediately.
      clearPermissions()
      setSessionChecked(true)
      return
    }

    // Exchange the stored refresh token for fresh tokens.
    // Backend checks the session is still active (not revoked).
    authService.refresh(refreshToken)
      .then(res => {
        // Update store with fresh tokens (also embeds new session ID in access token).
        setAuth(res.user, res.access_token, res.refresh_token)
        // Load platform settings and permissions concurrently.
        void loadPlatform()
        void loadPermissions(res.user.role)
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
          <Route path="/dashboard/live" element={<PrivateRoute><LiveMapPage /></PrivateRoute>} />
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
          <Route path="/privacy/requests" element={<PrivateRoute><PrivacyRequestsPage /></PrivateRoute>} />

          {/* Drivers */}
          <Route path="/drivers" element={<PrivateRoute><DriverDirectoryPage /></PrivateRoute>} />
          <Route path="/drivers/onboarding" element={<PrivateRoute><DriverOnboardingPage /></PrivateRoute>} />
          <Route path="/drivers/:id" element={<PrivateRoute><DriverDetailPage /></PrivateRoute>} />
          <Route path="/drivers/:id/documents/:docId" element={<PrivateRoute><DocumentReviewPage /></PrivateRoute>} />

          {/* Road Bookings */}
          <Route path="/bookings/road" element={<PrivateRoute><RoadBookingsPage /></PrivateRoute>} />
          <Route path="/bookings/road/new" element={<PrivateRoute><AssistedBookingPage /></PrivateRoute>} />
          <Route path="/bookings/road/:id" element={<PrivateRoute><BookingDetailPage /></PrivateRoute>} />
          <Route path="/bookings/assisted" element={<PrivateRoute><AssistedBookingPage /></PrivateRoute>} />
          <Route path="/bookings/disputes" element={<PrivateRoute><DisputesPage /></PrivateRoute>} />

          {/* Air Bookings — specific paths BEFORE :id wildcard */}
          <Route path="/bookings/air/new" element={<PrivateRoute><AirAssistedBookingPage /></PrivateRoute>} />
          <Route path="/bookings/air/:id/quotes" element={<PrivateRoute><AirBookingQuotePage /></PrivateRoute>} />
          <Route path="/bookings/air/:id" element={<PrivateRoute><AirBookingDetailPage /></PrivateRoute>} />
          <Route path="/bookings/air" element={<PrivateRoute><AirBookingsPage /></PrivateRoute>} />

          {/* Pricing */}
          <Route path="/pricing" element={<Navigate to="/pricing/road" replace />} />
          <Route path="/pricing/road" element={<PrivateRoute><RoadFareRulesPage /></PrivateRoute>} />
          <Route path="/pricing/air" element={<PrivateRoute><AirFareRulesPage /></PrivateRoute>} />
          <Route path="/pricing/taxes" element={<PrivateRoute><TaxesPage /></PrivateRoute>} />
          <Route path="/pricing/simulator" element={<PrivateRoute><FareSimulatorPage /></PrivateRoute>} />

          {/* Operators */}
          <Route path="/operators" element={<PrivateRoute><OperatorDirectoryPage /></PrivateRoute>} />
          <Route path="/operators/new" element={<PrivateRoute><OperatorOnboardingPage /></PrivateRoute>} />
          <Route path="/operators/:id" element={<PrivateRoute><OperatorDetailPage /></PrivateRoute>} />

          {/* Aircraft & Crew */}
          <Route path="/aircraft" element={<PrivateRoute><AircraftDirectoryPage /></PrivateRoute>} />
          <Route path="/aircraft/:id" element={<PrivateRoute><AircraftDetailPage /></PrivateRoute>} />
          <Route path="/aircraft/crew" element={<PrivateRoute><PilotsCrewPage /></PrivateRoute>} />

          {/* Vehicles */}
          <Route path="/vehicles" element={<PrivateRoute><VehicleDirectoryPage /></PrivateRoute>} />
          <Route path="/vehicles/:id" element={<PrivateRoute><VehicleDetailPage /></PrivateRoute>} />
          <Route path="/vendors" element={<PrivateRoute><VendorDirectoryPage /></PrivateRoute>} />
          <Route path="/vendors/new" element={<PrivateRoute><VendorNewPage /></PrivateRoute>} />

          {/* KYC */}
          <Route path="/kyc" element={<PrivateRoute><KycQueuePage /></PrivateRoute>} />
          <Route path="/kyc/expiry" element={<PrivateRoute><KycExpiryPage /></PrivateRoute>} />
          <Route path="/kyc/:entityType/:docId" element={<PrivateRoute><KycDocumentDetailPage /></PrivateRoute>} />

          {/* Promotions */}
          <Route path="/promotions" element={<PrivateRoute><PromotionsPage /></PrivateRoute>} />
          <Route path="/promotions/referrals" element={<PrivateRoute><ReferralPage /></PrivateRoute>} />
          <Route path="/promotions/analytics" element={<PrivateRoute><RedemptionAnalyticsPage /></PrivateRoute>} />

          {/* Audit */}
          <Route path="/audit" element={<PrivateRoute><AuditStreamPage /></PrivateRoute>} />
          <Route path="/audit/events/:id" element={<PrivateRoute><AuditEventPage /></PrivateRoute>} />
          <Route path="/audit/security" element={<PrivateRoute><SecurityCompliancePage /></PrivateRoute>} />

          {/* Admin users (extra pages — static segments must come before :id) */}
          <Route path="/admin-users/invites" element={<PrivateRoute><InvitesPage /></PrivateRoute>} />
          <Route path="/admin-users/access" element={<PrivateRoute><InvitesPage /></PrivateRoute>} />
          <Route path="/admin-users/:id" element={<PrivateRoute><AdminDetailPage /></PrivateRoute>} />

          {/* Dispatch */}
          <Route path="/dispatch" element={<Navigate to="/dispatch/console" replace />} />
          <Route path="/dispatch/console" element={<PrivateRoute><DispatchConsolePage /></PrivateRoute>} />
          <Route path="/dispatch/exceptions" element={<PrivateRoute><DispatchExceptionsPage /></PrivateRoute>} />
          <Route path="/dispatch/supply" element={<PrivateRoute><SupplySurgePage /></PrivateRoute>} />

          {/* Payments — /payments/reconciliation MUST be before /payments/:txnId */}
          <Route path="/payments" element={<PrivateRoute><PaymentsPage /></PrivateRoute>} />
          <Route path="/payments/reconciliation" element={<PrivateRoute><ReconciliationPage /></PrivateRoute>} />
          <Route path="/payments/:txnId" element={<PrivateRoute><TransactionDetailPage /></PrivateRoute>} />

          {/* Branding — /branding/:profileId/touchpoints MUST be before /branding/:profileId */}
          <Route path="/branding" element={<PrivateRoute><BrandProfilesPage /></PrivateRoute>} />
          <Route path="/branding/:profileId/touchpoints" element={<PrivateRoute><TouchpointsPage /></PrivateRoute>} />
          <Route path="/branding/:profileId" element={<PrivateRoute><ThemeEditorPage /></PrivateRoute>} />

          {/* Reports — /reports/builder and /reports/exports MUST be before /reports/:templateId */}
          <Route path="/reports" element={<PrivateRoute><ReportLibraryPage /></PrivateRoute>} />
          <Route path="/reports/exports" element={<PrivateRoute><ReportLibraryPage /></PrivateRoute>} />
          <Route path="/reports/builder" element={<PrivateRoute><ReportBuilderPage /></PrivateRoute>} />
          <Route path="/reports/:templateId" element={<PrivateRoute><RevenueReportPage /></PrivateRoute>} />

          {/* Payouts — /payouts/payees/:id MUST be before /payouts/runs/:runId */}
          <Route path="/payouts" element={<PrivateRoute><PayoutRunsPage /></PrivateRoute>} />
          <Route path="/payouts/runs" element={<PrivateRoute><PayoutRunsPage /></PrivateRoute>} />
          <Route path="/payouts/runs/:runId" element={<PrivateRoute><PayoutRunDetailPage /></PrivateRoute>} />
          <Route path="/payouts/payees/:payeeId" element={<PrivateRoute><DriverStatementPage /></PrivateRoute>} />

          {/* Support — /support/sla MUST be before /support/:ticketId */}
          <Route path="/support" element={<PrivateRoute><TicketQueuePage /></PrivateRoute>} />
          <Route path="/support/sla" element={<PrivateRoute><SlaEscalationPage /></PrivateRoute>} />
          <Route path="/support/:ticketId" element={<PrivateRoute><TicketDetailPage /></PrivateRoute>} />

          {/* Settings */}
          <Route path="/settings" element={<PrivateRoute><PlatformSettingsPage /></PrivateRoute>} />
          <Route path="/settings/flags" element={<PrivateRoute><FeatureFlagsPage /></PrivateRoute>} />
          <Route path="/settings/maintenance" element={<PrivateRoute><MaintenancePage /></PrivateRoute>} />

          {/* RBAC — /rbac/permissions MUST be before /rbac/roles/:id */}
          <Route path="/rbac" element={<PrivateRoute><RolesListPage /></PrivateRoute>} />
          <Route path="/rbac/permissions" element={<PrivateRoute><PermissionsCatalogPage /></PrivateRoute>} />
          <Route path="/rbac/roles/:id" element={<PrivateRoute><RoleEditorPage /></PrivateRoute>} />

          {/* Notifications — /notifications/delivery MUST be before /notifications/:id/edit */}
          <Route path="/notifications" element={<PrivateRoute><NotificationTemplatesPage /></PrivateRoute>} />
          <Route path="/notifications/delivery" element={<PrivateRoute><DeliveryLogPage /></PrivateRoute>} />
          <Route path="/notifications/:id/edit" element={<PrivateRoute><TemplateEditorPage /></PrivateRoute>} />

          {/* No access — shown when user has zero permissions */}
          <Route path="/no-access" element={<NoAccessPage />} />

          {/* Default */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
