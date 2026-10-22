import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Dialog kaca sederhana: portal ke body, tutup dengan ESC / klik backdrop,
 * kunci scroll halaman, fokus pindah ke elemen pertama.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  hideClose = false,
}) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector(
        'input, button, [href], textarea, select, [tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus?.()
    }, 40)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      window.clearTimeout(timer)
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Tutup dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-950/70 backdrop-blur-md animate-fade-in"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        className={`glass-strong relative w-full ${widths[size] || widths.md} animate-dialog-in overflow-hidden rounded-3xl`}
      >
        <div className="flex items-start gap-3 px-5 pb-3 pt-5 sm:px-6">
          <div className="min-w-0 flex-1">
            {title ? <h2 className="display-3">{title}</h2> : null}
            {description ? <p className="prose-muted mt-1">{description}</p> : null}
          </div>
          {hideClose ? null : (
            <button type="button" onClick={onClose} className="btn-icon h-9 w-9" aria-label="Tutup">
              <X size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
