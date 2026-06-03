import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  videoUrl: string
  videoProvider: string
  /** Sólo necesario para video_provider='supabase' — la edge function pide auth y enrollment */
  lessonId?: string
  /** Texto del watermark sutil sobre el video (ej. email del alumno). Solo aplica a provider='supabase'. */
  watermarkText?: string
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] ?? null
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return match?.[1] ?? null
}

function FallbackPlaceholder({ message = 'Video no disponible' }: { message?: string }) {
  return (
    <div className="aspect-video bg-secondary/40 rounded-2xl border border-border/60 flex flex-col items-center justify-center gap-2">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}

/**
 * Player de video con tres providers:
 *   - 'youtube' / 'vimeo' → iframe con embed estándar
 *   - 'supabase' → HTML5 native con signed URL desde edge function sign-lesson-video.
 *     Incluye protecciones contra descarga, watermark con email del alumno, sin
 *     PictureInPicture ni AirPlay, sin menú contextual.
 *
 * IMPORTANTE: ninguna de estas protecciones detiene screen recording — solo
 * dificultan compartir URLs y desincentivan por watermark trazable.
 */
export function VideoEmbed({ videoUrl, videoProvider, lessonId, watermarkText }: Props) {
  // ─── Supabase (signed URL) ───────────────────────────────────────────
  if (videoProvider === 'supabase') {
    return <SupabaseVideoPlayer lessonId={lessonId} watermarkText={watermarkText} />
  }

  // ─── YouTube / Vimeo (iframe) ────────────────────────────────────────
  let src: string | null = null
  if (videoProvider === 'youtube') {
    const id = extractYouTubeId(videoUrl)
    if (id) src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`
  } else if (videoProvider === 'vimeo') {
    const id = extractVimeoId(videoUrl)
    if (id) src = `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`
  }

  if (!src) return <FallbackPlaceholder />

  return (
    <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-lg ring-1 ring-border/30">
      <iframe
        src={src}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        title="Lección"
      />
    </div>
  )
}

interface SupabaseProps {
  lessonId?: string
  watermarkText?: string
}

function SupabaseVideoPlayer({ lessonId, watermarkText }: SupabaseProps) {
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'ready'; url: string; expiresAt: string }
    | { kind: 'error'; message: string }
  >({ kind: 'loading' })
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!lessonId) {
        setState({ kind: 'error', message: 'Lección sin ID — no se puede firmar URL' })
        return
      }
      setState({ kind: 'loading' })
      const { data, error } = await supabase.functions.invoke<{ url?: string; expiresAt?: string; error?: string }>(
        'sign-lesson-video',
        { body: { lessonId } }
      )
      if (cancelled) return
      if (error || !data?.url) {
        const msg = data?.error === 'not_enrolled'
          ? 'Necesitás estar inscripto para ver esta lección.'
          : data?.error === 'lesson_video_not_uploaded'
          ? 'El video todavía no fue cargado por el instructor.'
          : error?.message ?? data?.error ?? 'No pudimos cargar el video.'
        setState({ kind: 'error', message: msg })
        return
      }
      setState({ kind: 'ready', url: data.url, expiresAt: data.expiresAt ?? '' })
    }
    void load()
    return () => { cancelled = true }
  }, [lessonId])

  if (state.kind === 'loading') {
    return (
      <div className="aspect-video bg-black rounded-2xl flex items-center justify-center ring-1 ring-border/30 shadow-lg">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-label="Cargando video" />
      </div>
    )
  }

  if (state.kind === 'error') {
    return <FallbackPlaceholder message={state.message} />
  }

  return (
    <div
      className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-lg ring-1 ring-border/30 select-none"
      onContextMenu={e => e.preventDefault()}
    >
      <video
        ref={videoRef}
        src={state.url}
        className="w-full h-full"
        controls
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        disableRemotePlayback
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
      />
      {/* Watermark sutil con email del alumno — disuasión trazable contra screen recording */}
      {watermarkText && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 mix-blend-difference"
          style={{ textShadow: '0 0 4px rgba(0,0,0,0.4)' }}
        >
          <div className="flex justify-end">
            <span className="text-[10px] font-medium text-white/30 tracking-wide tabular-nums">
              {watermarkText}
            </span>
          </div>
          <div className="flex justify-start">
            <span className="text-[10px] font-medium text-white/25 tracking-wide tabular-nums">
              {watermarkText}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
