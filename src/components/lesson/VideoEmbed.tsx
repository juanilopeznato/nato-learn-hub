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
      <div className="aspect-video bg-nato-dark-secondary rounded-xl flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Video no disponible</p>
      </div>
    )
  }

  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-black">
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
