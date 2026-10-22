const EVENT = 'dh:toast'

/**
 * toast('Disalin', { tone: 'success' })
 * tone: info | success | warn | error
 */
export function toast(message, options = {}) {
  if (typeof window === 'undefined' || !message) return
  window.dispatchEvent(
    new CustomEvent(EVENT, {
      detail: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        message: String(message),
        tone: options.tone || 'info',
        duration: options.duration ?? 3200,
      },
    }),
  )
}

export function onToast(handler) {
  window.addEventListener(EVENT, (event) => handler(event.detail))
  return () => window.removeEventListener(EVENT, handler)
}

export default toast
