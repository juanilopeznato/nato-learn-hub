import confetti from 'canvas-confetti'

export function useConfetti() {
  function fireLesson() {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#F59E0B', '#3EC9A7', '#5B21F5', '#FBBF24', '#ffffff'],
      scalar: 0.9,
    })
  }

  function fireCourse() {
    const end = Date.now() + 2000
    const interval = setInterval(() => {
      if (Date.now() > end) { clearInterval(interval); return }
      confetti({ particleCount: 50, angle: 60,  spread: 55, origin: { x: 0 }, colors: ['#F59E0B', '#3EC9A7', '#5B21F5'] })
      confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#FBBF24', '#5B21F5', '#3EC9A7'] })
    }, 200)
  }

  return { fireLesson, fireCourse }
}
