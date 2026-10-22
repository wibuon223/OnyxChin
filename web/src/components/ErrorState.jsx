import { RotateCw, TriangleAlert } from 'lucide-react'

export default function ErrorState({
  title = 'Gagal memuat data',
  message = 'Terjadi kesalahan saat mengambil data dari server.',
  onRetry,
  actionLabel = 'Coba lagi',
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-ember/25 bg-ember/5 px-6 py-12 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-ember/30 bg-ember/10 text-ember">
        <TriangleAlert size={22} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-100">{title}</p>
        <p className="mx-auto max-w-md text-sm text-slate-400">{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20"
        >
          <RotateCw size={16} strokeWidth={2} aria-hidden="true" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
