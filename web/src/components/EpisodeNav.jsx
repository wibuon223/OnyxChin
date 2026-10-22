import { ChevronLeft, ChevronRight, List } from 'lucide-react'
import { navigate } from '../hooks/useRoute'

/**
 * Bar navigasi episode:  < prev | semua episode | next >
 * Semua tombol punya label jelas + shortcut keyboard yang ditampilkan.
 */
export default function EpisodeNav({
  prevSlug = '',
  nextSlug = '',
  label = '',
  position = '',
  onOpenList,
  className = '',
}) {
  const go = (slug) => {
    if (slug) navigate(`/watch/${slug}`)
  }

  return (
    <div className={`glass flex items-stretch gap-1 rounded-2xl p-1.5 ${className}`}>
      <button
        type="button"
        onClick={() => go(prevSlug)}
        disabled={!prevSlug}
        className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition duration-300 ease-silk hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent sm:px-3.5"
        aria-label={prevSlug ? 'Episode sebelumnya' : 'Tidak ada episode sebelumnya'}
      >
        <ChevronLeft
          size={17}
          strokeWidth={2.3}
          className="shrink-0 text-slate-400 transition group-hover:text-accent group-disabled:group-hover:text-slate-400"
          aria-hidden="true"
        />
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Sebelumnya
          </span>
          <span className="line-clamp-1 text-[12.5px] font-semibold text-slate-200">Episode</span>
        </span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-slate-500 lg:block">
          ←
        </kbd>
      </button>

      <div className="w-px shrink-0 self-stretch bg-white/[0.07]" aria-hidden="true" />

      <button
        type="button"
        onClick={onOpenList}
        className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 transition duration-300 hover:bg-white/[0.06] sm:px-5"
        aria-label="Lihat semua episode"
      >
        <List size={16} strokeWidth={2.2} className="text-accent" aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Semua
        </span>
        {position ? (
          <span className="font-mono text-[10px] text-slate-500">{position}</span>
        ) : null}
      </button>

      <div className="w-px shrink-0 self-stretch bg-white/[0.07]" aria-hidden="true" />

      <button
        type="button"
        onClick={() => go(nextSlug)}
        disabled={!nextSlug}
        className="group flex min-w-0 flex-1 items-center justify-end gap-2 rounded-xl px-2.5 py-2 text-right transition duration-300 ease-silk hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent sm:px-3.5"
        aria-label={nextSlug ? 'Episode berikutnya' : 'Ini episode terakhir'}
      >
        <kbd className="mr-auto hidden shrink-0 rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-slate-500 lg:block">
          →
        </kbd>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Berikutnya
          </span>
          <span className="line-clamp-1 text-[12.5px] font-semibold text-slate-200">
            {nextSlug ? label || 'Episode' : 'Terakhir'}
          </span>
        </span>
        <ChevronRight
          size={17}
          strokeWidth={2.3}
          className="shrink-0 text-slate-400 transition group-hover:text-accent group-disabled:group-hover:text-slate-400"
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
