import { Check, Play } from 'lucide-react'
import { navigate } from '../hooks/useRoute'
import { cardSlug, formatDate } from '../utils'

/**
 * Daftar episode bergaya glass. `watched` = array slug episode yang sudah
 * pernah dibuka (dari localStorage), `lastSlug` = episode terakhir.
 */
export default function EpisodeList({
  episodes = [],
  activeSlug = '',
  watched = [],
  lastSlug = '',
  loading = false,
  emptyMessage = 'Belum ada episode untuk judul ini.',
  className = '',
}) {
  const watchedSet = new Set(watched)

  if (loading) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="skeleton h-12 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!episodes.length) {
    return (
      <div className={`glass-soft rounded-2xl px-5 py-10 text-center text-[13px] text-slate-500 ${className}`}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <ul className={`space-y-1 ${className}`}>
      {episodes.map((episode, index) => {
        const slug = cardSlug(episode)
        const isActive = Boolean(activeSlug) && slug === activeSlug
        const seen = watchedSet.has(slug)
        const isLast = Boolean(lastSlug) && slug === lastSlug

        const handleClick = (event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          if (!slug) return
          event.preventDefault()
          navigate(`/watch/${slug}`)
        }

        return (
          <li key={episode.url || `${episode.number}-${index}`}>
            <a
              href={slug ? `/watch/${slug}` : '#'}
              onClick={handleClick}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition duration-300 ease-silk ${
                isActive
                  ? 'border-accent/40 bg-accent/[0.09] text-white'
                  : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.045] hover:text-white'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold tabular-nums ${
                  isActive
                    ? 'border-accent/30 bg-accent/15 text-accent'
                    : 'border-white/10 bg-white/[0.04] text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {episode.number || index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-[12.5px] font-semibold leading-snug">
                  {episode.title || `Episode ${episode.number || index + 1}`}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-slate-500">
                  {episode.release_date ? <span>{formatDate(episode.release_date)}</span> : null}
                  {isLast ? (
                    <>
                      <span className="text-slate-700">·</span>
                      <span className="text-accent/80">terakhir dibuka</span>
                    </>
                  ) : null}
                </span>
              </span>

              {seen && !isActive ? (
                <Check size={13} strokeWidth={2.6} className="shrink-0 text-jade/70" aria-label="sudah ditonton" />
              ) : null}
              <Play
                size={13}
                strokeWidth={2.4}
                className={`shrink-0 transition ${
                  isActive ? 'text-accent' : 'text-slate-600 group-hover:text-accent'
                }`}
                aria-hidden="true"
              />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
