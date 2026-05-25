interface Props {
  videoUrl: string
  videoProvider: string
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] ?? null
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return match?.[1] ?? null
}

export function VideoEmbed({ videoUrl, videoProvider }: Props) {
  let src: string | null = null

  if (videoProvider === 'youtube') {
    const id = extractYouTubeId(videoUrl)
    if (id) src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`
  } else if (videoProvider === 'vimeo') {
    const id = extractVimeoId(videoUrl)
    if (id) src = `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`
  }

  if (!src) {
    return (
      <div className="aspect-video bg-secondary/40 rounded-2xl border border-border/60 flex flex-col items-center justify-center gap-2">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-muted-foreground text-sm">Video no disponible</p>
      </div>
    )
  }

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
