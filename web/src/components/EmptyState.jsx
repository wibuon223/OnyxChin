import { SearchX } from 'lucide-react'

export default function EmptyState({
  title = 'Belum ada data',
  message = 'Tidak ada item untuk ditampilkan saat ini.',
  icon: Icon = SearchX,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-ink-850/60 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-ink-800 text-slate-400">
        <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-200">{title}</p>
        <p className="mx-auto max-w-md text-sm text-slate-500">{message}</p>
      </div>
    </div>
  )
}
