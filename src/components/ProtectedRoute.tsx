import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

interface Props {
  children: React.ReactNode
  requiredRole?: 'instructor' | 'admin' | 'nato_owner'
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && profile) {
    // nato_owner is a separate top-level role, not part of the instructor hierarchy
    if (requiredRole === 'nato_owner') {
      if (profile.role !== 'nato_owner') return <Navigate to="/dashboard" replace />
    } else {
      const roleHierarchy = ['student', 'instructor', 'admin', 'nato_owner']
      const userLevel = roleHierarchy.indexOf(profile.role)
      const requiredLevel = roleHierarchy.indexOf(requiredRole)
      if (userLevel < requiredLevel) return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}
