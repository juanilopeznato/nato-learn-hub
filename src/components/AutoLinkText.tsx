/**
 * Renderiza texto de usuario auto-detectando URLs y emails.
 * Sin HTML — solo React elements (XSS-safe).
 *
 *   <AutoLinkText>{post.body}</AutoLinkText>
 */
import { Fragment } from 'react'
import { parseText } from '@/lib/text-render'

interface Props {
  children: string | null | undefined
  className?: string
}

export function AutoLinkText({ children, className }: Props) {
  if (!children) return null
  const segments = parseText(children)
  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <Fragment key={i}>{seg.value}</Fragment>
        return (
          <a
            key={i}
            href={seg.href}
            target={seg.type === 'url' ? '_blank' : undefined}
            rel={seg.type === 'url' ? 'noopener noreferrer nofollow' : undefined}
            className="text-primary underline underline-offset-2 hover:opacity-80 break-all"
          >
            {seg.value}
          </a>
        )
      })}
    </span>
  )
}
