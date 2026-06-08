import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { useOperatorAuthStore } from './stores/authStore'
import PrivateRoute from './components/layout/PrivateRoute'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useOperatorAuthStore(s => s.isAuthenticated)
  const accessToken = useOperatorAuthStore(s => s.accessToken)
  if (isAuthenticated && accessToken) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
