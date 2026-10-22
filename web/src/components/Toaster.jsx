import { useEffect, useState } from 'react'
import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react'
import { onToast } from '../lib/toast'

const TONES = {
  info: { icon: Info, ring: 'border-white/12', text: 'text-slate-200' },
  success: { icon: CheckCircle2, ring: 'border-jade/30', text: 'text-jade' },
  warn: { icon: TriangleAlert, ring: 'border-accent/30', text: 'text-accent' },
  error: { icon: XCircle, ring: 'border-ember/30', text: 'text-ember' },
}

export default function Toaster() {
  const [items, setItems] = useState([])

  useEffect(
    () =>
      onToast((payload) => {
        setItems((prev) => [...prev.slice(-3), payload])
        window.setTimeout(() => {
          setItems((prev) => prev.filter((it) => it.id !== payload.id))
        }, payload.duration)
      }),
    [],
  )

  if (!items.length) return null

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[70] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2 sm:bottom-8 sm:left-auto sm:right-6 sm:translate-x-0">
      {items.map((item) => {
        const tone = TONES[item.tone] || TONES.info
        const Icon = tone.icon
        return (
          <div
            key={item.id}
            role="status"
            className={`glass-strong pointer-events-auto flex animate-dialog-in items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] ${tone.ring}`}
          >
            <Icon size={15} strokeWidth={2.2} className={`mt-0.5 shrink-0 ${tone.text}`} aria-hidden="true" />
            <span className="leading-snug text-slate-200">{item.message}</span>
          </div>
        )
      })}
    </div>
  )
}
