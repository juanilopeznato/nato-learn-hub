/**
 * Markdown render minimal, sin dep externa, sin dangerouslySetInnerHTML.
 *
 * Soporta:
 *  - **bold** y *italic*
 *  - `inline code`
 *  - [texto](url)
 *  - URLs sueltas (auto-link via parseText)
 *  - Listas con `- ` o `* ` (block-level)
 *  - Headings con # ## ###
 *  - Saltos de línea respetados (whitespace-pre-wrap)
 *
 * NO soporta (intencionalmente, para mantenerlo simple y safe):
 *  - HTML embebido
 *  - Tablas
 *  - Imágenes (los instructors usan ImageUpload aparte)
 *  - Bloques de código multilinea
 *
 *   <MarkdownLight>{lesson.body}</MarkdownLight>
 */
import { Fragment } from 'react'
import { parseText } from '@/lib/text-render'

interface Props {
  children: string | null | undefined
  className?: string
}

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; value: string; href: string }

/** Parsea inline: **bold**, *italic*, `code`, [text](url). El resto va a auto-link */
function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []
  // Pattern combinado en orden de prioridad: code > bold > italic > link
  const regex = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) tokens.push({ type: 'text', value: text.slice(lastIndex, m.index) })
    if (m[1]) tokens.push({ type: 'code', value: m[1] })
    else if (m[2]) tokens.push({ type: 'bold', value: m[2] })
    else if (m[3]) tokens.push({ type: 'italic', value: m[3] })
    else if (m[4] && m[5]) tokens.push({ type: 'link', value: m[4], href: m[5] })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) tokens.push({ type: 'text', value: text.slice(lastIndex) })
  return tokens
}

function renderInline(text: string, keyPrefix: string): React.ReactNode {
  const inline = parseInline(text)
  return inline.map((tok, i) => {
    const k = `${keyPrefix}-${i}`
    if (tok.type === 'bold') return <strong key={k}>{tok.value}</strong>
    if (tok.type === 'italic') return <em key={k}>{tok.value}</em>
    if (tok.type === 'code') return <code key={k} className="px-1.5 py-0.5 bg-secondary text-gray-800 rounded text-[0.9em] font-mono">{tok.value}</code>
    if (tok.type === 'link') {
      const safe = /^https?:\/\//.test(tok.href) ? tok.href : `https://${tok.href}`
      return <a key={k} href={safe} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2 hover:opacity-80">{tok.value}</a>
    }
    // text plain → pasar por auto-link de URLs/emails
    const segs = parseText(tok.value)
    return (
      <Fragment key={k}>
        {segs.map((seg, j) => {
          if (seg.type === 'text') return <Fragment key={j}>{seg.value}</Fragment>
          return (
            <a
              key={j}
              href={seg.href}
              target={seg.type === 'url' ? '_blank' : undefined}
              rel={seg.type === 'url' ? 'noopener noreferrer nofollow' : undefined}
              className="text-primary underline underline-offset-2 hover:opacity-80 break-all"
            >
              {seg.value}
            </a>
          )
        })}
      </Fragment>
    )
  })
}

type Block =
  | { type: 'p'; content: string }
  | { type: 'h'; level: 1 | 2 | 3; content: string }
  | { type: 'ul'; items: string[] }
  | { type: 'blank' }

function parseBlocks(md: string): Block[] {
  const lines = md.split('\n')
  const blocks: Block[] = []
  let listBuffer: string[] | null = null

  const flushList = () => {
    if (listBuffer && listBuffer.length > 0) blocks.push({ type: 'ul', items: listBuffer })
    listBuffer = null
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { flushList(); blocks.push({ type: 'blank' }); continue }

    // Heading
    const h = /^(#{1,3})\s+(.+)$/.exec(line)
    if (h) {
      flushList()
      const level = h[1].length as 1 | 2 | 3
      blocks.push({ type: 'h', level, content: h[2] })
      continue
    }

    // List
    const li = /^[\s]*[-*]\s+(.+)$/.exec(line)
    if (li) {
      if (!listBuffer) listBuffer = []
      listBuffer.push(li[1])
      continue
    }

    // Plain paragraph: agrupa líneas seguidas no-listas no-headings
    flushList()
    const prev = blocks[blocks.length - 1]
    if (prev && prev.type === 'p') {
      prev.content += '\n' + line
    } else {
      blocks.push({ type: 'p', content: line })
    }
  }
  flushList()
  return blocks
}

export function MarkdownLight({ children, className }: Props) {
  if (!children) return null
  const blocks = parseBlocks(children)
  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      {blocks.map((b, i) => {
        if (b.type === 'blank') return null
        if (b.type === 'h') {
          const sizes: Record<1 | 2 | 3, string> = {
            1: 'text-2xl font-bold',
            2: 'text-xl font-semibold',
            3: 'text-lg font-semibold',
          }
          const Tag = (b.level === 1 ? 'h2' : b.level === 2 ? 'h3' : 'h4') as keyof JSX.IntrinsicElements
          return <Tag key={i} className={`${sizes[b.level]} text-foreground`}>{renderInline(b.content, `h-${i}`)}</Tag>
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="list-disc list-outside pl-5 space-y-1 text-foreground/85">
              {b.items.map((it, j) => <li key={j}>{renderInline(it, `li-${i}-${j}`)}</li>)}
            </ul>
          )
        }
        return (
          <p key={i} className="text-foreground/85 whitespace-pre-wrap leading-relaxed">
            {renderInline(b.content, `p-${i}`)}
          </p>
        )
      })}
    </div>
  )
}
