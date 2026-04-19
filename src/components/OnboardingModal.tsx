import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

const GOALS = [
  { value: 'marca_personal', label: 'Hacer crecer mi marca personal' },
  { value: 'marketing_digital', label: 'Aprender marketing digital' },
  { value: 'vender_online', label: 'Empezar a vender online' },
]

interface Props {
  profileId: string
  tenantId: string
  onComplete: () => void
}

export default function OnboardingModal({ profileId, tenantId, onComplete }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const { data: featuredCourse } = useQuery({
    queryKey: ['featured-course-onboarding', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title, slug')
        .eq('tenant_id', tenantId)
        .eq('is_published', true)
        .eq('is_featured', true)
        .limit(1)
        .single()
      return data
    },
  })

  async function handleConfirm() {
    if (!selected) return
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true, onboarding_goal: selected })
      .eq('id', profileId)
    setSaving(false)
    onComplete()
    if (featuredCourse?.slug) {
      navigate(`/courses/${featuredCourse.slug}`)
    }
  }

  return (
    <Dialog open>
      <DialogContent className="max-w-md p-0 overflow-hidden" onInteractOutside={e => e.preventDefault()}>
        <div className="bg-gradient-to-br from-primary/10 to-accent/5 p-8 space-y-6">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <span className="text-2xl">👋</span>
            </div>
            <h2 className="font-heading text-2xl font-bold text-gray-900">
              ¡Bienvenido/a!
            </h2>
            <p className="text-gray-500 text-sm">
              Antes de empezar, contanos qué querés lograr para recomendarte el mejor camino.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">¿Qué querés lograr?</p>
            {GOALS.map(goal => (
              <button
                key={goal.value}
                onClick={() => setSelected(goal.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  selected === goal.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {goal.label}
              </button>
            ))}
          </div>

          <Button
            variant="hero"
            className="w-full"
            disabled={!selected || saving}
            onClick={handleConfirm}
          >
            {saving ? 'Guardando...' : featuredCourse ? `Ver curso recomendado →` : 'Empezar →'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
