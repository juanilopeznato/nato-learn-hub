/**
 * Renderizador de imágenes que NUNCA pide más de lo necesario.
 *
 *  <SmartImage src={course.cover_image_url} size="thumb" />  // lista de cursos
 *  <SmartImage src={course.cover_image_url} size="lg" />     // hero del curso
 *  <SmartAvatar src={profile.avatar_url} size={40} />        // avatares
 *
 * Usa `getOptimizedUrl` de `@/lib/storage` para decidir entre thumb pre-generado
 * o transform on-the-fly del CDN. Siempre con `loading="lazy"` salvo `eager`.
 */
import { useState } from 'react'
import { getOptimizedUrl } from '@/lib/storage'

type Size = 'thumb' | 'sm' | 'md' | 'lg' | 'full'

interface SmartImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'loading'> {
  src: string | null | undefined
  size?: Size
  /** Por defecto lazy. Solo poner eager en above-the-fold. */
  eager?: boolean
  /** Fallback si no hay src */
  fallback?: string
}

export function SmartImage({
  src,
  size = 'md',
  eager,
  fallback = '/placeholder.svg',
  alt = '',
  ...rest
}: SmartImageProps) {
  const [errored, setErrored] = useState(false)
  const resolved = errored || !src ? fallback : getOptimizedUrl(src, { size })
  return (
    <img
      src={resolved}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setErrored(true)}
      {...rest}
    />
  )
}

interface SmartAvatarProps {
  src: string | null | undefined
  /** Tamaño en px. Decide automáticamente size lógico. */
  size?: number
  alt?: string
  className?: string
  /** Iniciales para mostrar si no hay imagen */
  fallbackInitials?: string
}

export function SmartAvatar({ src, size = 40, alt = '', className, fallbackInitials }: SmartAvatarProps) {
  const [errored, setErrored] = useState(false)
  const logicalSize: Size = size <= 64 ? 'thumb' : size <= 200 ? 'sm' : 'md'
  const show = src && !errored

  if (show) {
    return (
      <img
        src={getOptimizedUrl(src, { size: logicalSize })}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setErrored(true)}
        className={`rounded-full object-cover ${className ?? ''}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-border flex items-center justify-center text-muted-foreground font-medium ${className ?? ''}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-label={alt || 'Avatar'}
      role="img"
    >
      {fallbackInitials ?? '?'}
    </div>
  )
}
