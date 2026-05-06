// Wrapper único de analítica. Usa Plausible (cargado en index.html).
// Mantenelo agnóstico: si mañana cambiamos de proveedor, solo se toca acá.

type EventProps = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: EventProps; callback?: () => void }) => void
  }
}

export function track(event: string, props?: EventProps) {
  try {
    if (typeof window === 'undefined') return
    const cleaned: EventProps = {}
    if (props) {
      Object.entries(props).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') cleaned[k] = v
      })
    }
    window.plausible?.(event, Object.keys(cleaned).length ? { props: cleaned } : undefined)
  } catch {
    // Nunca romper UX por analytics.
  }
}

export const events = {
  signupStarted: (props?: EventProps) => track('signup_started', props),
  signupCompleted: (props?: EventProps) => track('signup_completed', props),
  loginCompleted: (props?: EventProps) => track('login_completed', props),
  schoolCreated: (props?: EventProps) => track('school_created', props),
  checkoutStarted: (props?: EventProps) => track('checkout_started', props),
  purchaseCompleted: (props?: EventProps) => track('purchase_completed', props),
  subscriptionStarted: (props?: EventProps) => track('subscription_started', props),
  lessonStarted: (props?: EventProps) => track('lesson_started', props),
  lessonCompleted: (props?: EventProps) => track('lesson_completed', props),
  courseCompleted: (props?: EventProps) => track('course_completed', props),
  certificateShared: (props?: EventProps) => track('certificate_shared', props),
}
