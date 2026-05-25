/**
 * Toggle de tema light/dark/system.
 * Compact: 3 botones en una pill (estilo macOS color scheme picker).
 *
 *   <ThemeToggle />
 */
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { getStoredTheme, setStoredTheme, type Theme } from '@/lib/theme'

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'dark', label: 'Oscuro', icon: Moon },
]

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    setTheme(getStoredTheme())
  }, [])

  function change(v: Theme) {
    setTheme(v)
    setStoredTheme(v)
  }

  return (
    <div
      role="group"
      aria-label="Tema de la app"
      className={`inline-flex items-center gap-0.5 rounded-full p-0.5 bg-secondary border border-border/60 ${className ?? ''}`}
    >
      {OPTIONS.map(opt => {
        const active = theme === opt.value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => change(opt.value)}
            aria-pressed={active}
            aria-label={`Tema ${opt.label}`}
            title={opt.label}
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 ease-apple ${
              active
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
