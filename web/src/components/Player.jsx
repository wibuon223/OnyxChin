import { MonitorOff } from 'lucide-react'

export default function Player({
  embed = '',
  title = 'Player',
  className = '',
  frameClassName = 'rounded-xl',
}) {
  if (!embed) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-ink-900 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-ink-850 text-slate-500">
          <MonitorOff size={22} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="space-y-1 px-6">
          <p className="text-sm font-semibold text-slate-300">Player tidak tersedia</p>
          <p className="text-xs text-slate-500">
            Episode ini belum memiliki sumber video yang bisa diputar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`aspect-video w-full overflow-hidden bg-black ring-1 ring-white/10 ${frameClassName} ${className}`}
    >
      <iframe
        src={embed}
        title={title}
        className="h-full w-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    </div>
  )
}
