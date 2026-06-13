import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { useOperatorAuthStore } from './stores/authStore'
import PrivateRoute from './components/layout/PrivateRoute'
import LoginPage from './pages/auth/LoginPage'
import TwoFAChallengePage from './pages/auth/TwoFAChallengePage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import AcceptInvitePage from './pages/auth/AcceptInvitePage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ProfilePage from './pages/profile/ProfilePage'
import SecurityPage from './pages/profile/SecurityPage'
import SessionsPage from './pages/profile/SessionsPage'
import NotificationsPage from './pages/profile/NotificationsPage'
import ActivityLogPage from './pages/profile/ActivityLogPage'
import TeamPage from './pages/team/TeamPage'
import RolesPage from './pages/team/RolesPage'
import CompanyProfilePage from './pages/onboarding/CompanyProfilePage'
import FleetPage from './pages/aircraft/FleetPage'
import AircraftDetailPage from './pages/aircraft/AircraftDetailPage'
import CrewRosterPage from './pages/crew/CrewRosterPage'
import CrewDetailPage from './pages/crew/CrewDetailPage'
import RoutesPage from './pages/routes/RoutesPage'
import RouteDetailPage from './pages/routes/RouteDetailPage'
import WeekSchedulePage from './pages/routes/WeekSchedulePage'
import PricingRulesPage from './pages/pricing/PricingRulesPage'
import CorporateAgreementsPage from './pages/pricing/CorporateAgreementsPage'
import QuoteHistoryPage from './pages/pricing/QuoteHistoryPage'
import RequestsQueuePage from './pages/bookings/RequestsQueuePage'
import RequestDetailPage from './pages/bookings/RequestDetailPage'
import AssignmentBoardPage from './pages/dispatch/AssignmentBoardPage'
import CrewAssignmentPage from './pages/dispatch/CrewAssignmentPage'
import ManifestsPage from './pages/manifests/ManifestsPage'
import ManifestDetailPage from './pages/manifests/ManifestDetailPage'
import DayOfFlightPage from './pages/dayOfflight/DayOfFlightPage'
import FlightDetailPage from './pages/dayOfflight/FlightDetailPage'
import CancelReschedulePage from './pages/cancel/CancelReschedulePage'
import PayoutsPage from './pages/payouts/PayoutsPage'
import SettlementDetailPage from './pages/payouts/SettlementDetailPage'
import ReportsPage from './pages/reports/ReportsPage'
import DocumentsPage from './pages/documents/DocumentsPage'
import NotificationCenterPage from './pages/notificationCenter/NotificationCenterPage'
import OperatorSettingsPage from './pages/settings/OperatorSettingsPage'
import CompanionPage from './pages/companion/CompanionPage'
import FlightBriefPage from './pages/companion/FlightBriefPage'

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useOperatorAuthStore(s => s.isAuthenticated)
  const accessToken = useOperatorAuthStore(s => s.accessToken)
  if (isAuthenticated && accessToken) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function App() {
  const language = useOperatorAuthStore(s => s.user?.language)

  useEffect(() => {
    const root = document.documentElement
    const isRTL = language === 'ar'
    root.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
    root.setAttribute('lang', language ?? 'en')
  }, [language])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/2fa" element={<TwoFAChallengePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/accept-invite" element={<AcceptInvitePage />} />

          {/* Authenticated routes */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/security" element={<PrivateRoute><SecurityPage /></PrivateRoute>} />
          <Route path="/sessions" element={<PrivateRoute><SessionsPage /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
          <Route path="/activity" element={<PrivateRoute><ActivityLogPage /></PrivateRoute>} />
          <Route path="/team" element={<PrivateRoute><TeamPage /></PrivateRoute>} />
          <Route path="/team/roles" element={<PrivateRoute><RolesPage /></PrivateRoute>} />
          <Route path="/onboarding" element={<PrivateRoute><CompanyProfilePage /></PrivateRoute>} />

          {/* Module 5 — Aircraft & Fleet */}
          <Route path="/aircraft" element={<PrivateRoute><FleetPage /></PrivateRoute>} />
          <Route path="/aircraft/:id" element={<PrivateRoute><AircraftDetailPage /></PrivateRoute>} />

          {/* Module 6 — Crew Management */}
          <Route path="/crew" element={<PrivateRoute><CrewRosterPage /></PrivateRoute>} />
          <Route path="/crew/:id" element={<PrivateRoute><CrewDetailPage /></PrivateRoute>} />

          {/* Module 7 — Routes & Schedule */}
          <Route path="/routes" element={<PrivateRoute><RoutesPage /></PrivateRoute>} />
          <Route path="/routes/schedule" element={<PrivateRoute><WeekSchedulePage /></PrivateRoute>} />
          <Route path="/routes/:id" element={<PrivateRoute><RouteDetailPage /></PrivateRoute>} />

          {/* Module 8 — Pricing & Quotes */}
          <Route path="/pricing" element={<PrivateRoute><PricingRulesPage /></PrivateRoute>} />
          <Route path="/pricing/corporate" element={<PrivateRoute><CorporateAgreementsPage /></PrivateRoute>} />
          <Route path="/pricing/quotes" element={<PrivateRoute><QuoteHistoryPage /></PrivateRoute>} />

          {/* Module 9 — Booking Requests & Queue */}
          <Route path="/bookings" element={<PrivateRoute><RequestsQueuePage /></PrivateRoute>} />
          <Route path="/bookings/:id" element={<PrivateRoute><RequestDetailPage /></PrivateRoute>} />

          {/* Module 10 — Flight Assignment & Dispatch */}
          <Route path="/dispatch" element={<PrivateRoute><AssignmentBoardPage /></PrivateRoute>} />
          <Route path="/dispatch/:id/assign" element={<PrivateRoute><CrewAssignmentPage /></PrivateRoute>} />

          {/* Module 11 — Passenger Manifest Management */}
          <Route path="/manifests" element={<PrivateRoute><ManifestsPage /></PrivateRoute>} />
          <Route path="/manifests/:id" element={<PrivateRoute><ManifestDetailPage /></PrivateRoute>} />

          {/* Module 12 — Day-of-Flight Operations */}
          <Route path="/day-of-flight" element={<PrivateRoute><DayOfFlightPage /></PrivateRoute>} />
          <Route path="/day-of-flight/:id" element={<PrivateRoute><FlightDetailPage /></PrivateRoute>} />

          {/* Module 13 — Cancellation & Rescheduling */}
          <Route path="/cancel" element={<PrivateRoute><CancelReschedulePage /></PrivateRoute>} />

          {/* Module 14 — Payouts & Settlements */}
          <Route path="/payouts" element={<PrivateRoute><PayoutsPage /></PrivateRoute>} />
          <Route path="/payouts/:id" element={<PrivateRoute><SettlementDetailPage /></PrivateRoute>} />

          {/* Module 15 — Reports & Analytics */}
          <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />

          {/* Module 16 — Documents & Compliance */}
          <Route path="/documents" element={<PrivateRoute><DocumentsPage /></PrivateRoute>} />

          {/* Module 17 — Notification Center */}
          <Route path="/notification-center" element={<PrivateRoute><NotificationCenterPage /></PrivateRoute>} />

          {/* Module 18 — Operator Settings */}
          <Route path="/settings" element={<PrivateRoute><OperatorSettingsPage /></PrivateRoute>} />

          {/* Module 19 — Crew Companion */}
          <Route path="/companion" element={<PrivateRoute><CompanionPage /></PrivateRoute>} />
          <Route path="/companion/:id" element={<PrivateRoute><FlightBriefPage /></PrivateRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
