import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface Props {
  feature: 'courses' | 'students' | 'email' | 'whitelabel'
  currentPlan: string
  children: React.ReactNode
  exceeded?: boolean
}

const TITLES: Record<Props['feature'], string> = {
  courses: 'Límite de cursos alcanzado',
  students: 'Límite de estudiantes alcanzado',
  email: 'Email marketing — Plan Creador',
  whitelabel: 'White-label — Plan Escuela',
}

export function PlanGate({ feature, currentPlan, children, exceeded }: Props) {
  if (!exceeded) return <>{children}</>

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
        <Lock className="w-6 h-6 text-muted-foreground/80" />
      </div>
      <div className="space-y-1">
        <h3 className="font-heading font-bold text-foreground text-lg">{TITLES[feature]}</h3>
        <p className="text-sm text-muted-foreground">
          Tu plan <span className="font-semibold capitalize">{currentPlan}</span> no incluye esta función. Mejorá para desbloquearla.
        </p>
      </div>
      <Button variant="hero" size="sm" asChild>
        <Link to="/pricing">Ver planes →</Link>
      </Button>
    </div>
  )
}
