/**
 * Lazy import de canvas-confetti — solo se carga cuando se dispara una
 * animación, no en el bundle inicial. Vino del audit perf may-2026.
 */

let confettiPromise: Promise<typeof import('canvas-confetti').default> | null = null
function loadConfetti() {
  confettiPromise ??= import('canvas-confetti').then(m => m.default)
  return confettiPromise
}

export function useConfetti() {
  async function fireLesson() {
    const confetti = await loadConfetti()
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#F59E0B', '#3EC9A7', '#5B21F5', '#FBBF24', '#ffffff'],
      scalar: 0.9,
    })
  }

  async function fireCourse() {
    const confetti = await loadConfetti()
    const end = Date.now() + 2000
    const interval = setInterval(() => {
      if (Date.now() > end) { clearInterval(interval); return }
      confetti({ particleCount: 50, angle: 60,  spread: 55, origin: { x: 0 }, colors: ['#F59E0B', '#3EC9A7', '#5B21F5'] })
      confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#FBBF24', '#5B21F5', '#3EC9A7'] })
    }, 200)
  }

  return { fireLesson, fireCourse }
}
