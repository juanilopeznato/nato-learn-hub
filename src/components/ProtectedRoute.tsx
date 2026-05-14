import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

interface Props {
  children: React.ReactNode
  requiredRole?: 'instructor' | 'admin' | 'nato_owner'
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, profile, tenant, allProfiles, loading } = useAuth()
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

  if (requiredRole && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Defense in depth: el usuario debe pertenecer al tenant del hostname actual.
  // Si AuthContext resolvió tenant pero el profile activo es de otro tenant,
  // y existe otro profile del usuario que sí pertenece a este tenant, switcheamos
  // a ese. Si no pertenece a este tenant en absoluto, fuera.
  //
  // nato_owner está exento (puede inspeccionar cualquier tenant desde su rol global).
  if (tenant && profile && profile.role !== 'nato_owner' && profile.tenant_id !== tenant.id) {
    const otherProfile = allProfiles.find(p => p.tenant_id === tenant.id)
    if (!otherProfile) {
      return <Navigate to="/dashboard" replace />
    }
    // Hay otro profile válido — AuthContext debería switcharlo. Spinner mientras tanto.
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (requiredRole && profile) {
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
