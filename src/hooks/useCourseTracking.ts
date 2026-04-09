import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// Generate/retrieve anonymous session ID
function getSessionId(): string {
  let sid = sessionStorage.getItem('nato_sid')
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('nato_sid', sid)
  }
  return sid
}

interface TrackOptions {
  courseId: string
  tenantId: string
  profileId?: string
}

export function useCourseTracking({ courseId, tenantId, profileId }: TrackOptions) {
  const trackedView = useRef(false)

  // Track page view once on mount
  useEffect(() => {
    if (!courseId || !tenantId || trackedView.current) return
    trackedView.current = true

    supabase.from('course_events').insert({
      course_id: courseId,
      tenant_id: tenantId,
      event_type: 'page_view',
      session_id: getSessionId(),
      profile_id: profileId ?? null,
    }).then()
  }, [courseId, tenantId, profileId])

  function trackCtaClick() {
    supabase.from('course_events').insert({
      course_id: courseId,
      tenant_id: tenantId,
      event_type: 'cta_click',
      session_id: getSessionId(),
      profile_id: profileId ?? null,
    }).then()
  }

  function trackCheckoutStart() {
    supabase.from('course_events').insert({
      course_id: courseId,
      tenant_id: tenantId,
      event_type: 'checkout_start',
      session_id: getSessionId(),
      profile_id: profileId ?? null,
    }).then()
  }

  function trackEnrollment() {
    supabase.from('course_events').insert({
      course_id: courseId,
      tenant_id: tenantId,
      event_type: 'enrollment',
      session_id: getSessionId(),
      profile_id: profileId ?? null,
    }).then()
  }

  return { trackCtaClick, trackCheckoutStart, trackEnrollment }
}
