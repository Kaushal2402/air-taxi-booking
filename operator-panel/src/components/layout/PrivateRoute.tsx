import { Navigate } from 'react-router-dom'
import { useOperatorAuthStore } from '../../stores/authStore'

interface PrivateRouteProps {
  children: React.ReactNode
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = useOperatorAuthStore(s => s.isAuthenticated)
  const accessToken = useOperatorAuthStore(s => s.accessToken)
  if (!isAuthenticated || !accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}
