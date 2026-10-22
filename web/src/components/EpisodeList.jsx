import { CalendarDays, Lock } from 'lucide-react'
import { navigate } from '../hooks/useRoute'
import { cardSlug, formatDate } from '../utils'

export default function EpisodeList({
  episodes = [],
  activeSlug = '',

  loading = false,
  emptyMessage = 'Belum ada episode untuk judul ini.',
}) {
  if (loading) {
    return (
      <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3.5">
            <span className="h-4 w-10 shrink-0 animate-pulse rounded bg-ink-800" />
            <span className="h-3 flex-1 animate-pulse rounded bg-ink-800" />
            <span className="h-3 w-24 shrink-0 animate-pulse rounded bg-ink-800" />
          </div>
        ))}
      </div>
    )
  }

  if (!episodes.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-ink-850/60 px-5 py-10 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-ink-900/40">
      {episodes.map((episode, index) => {
        const slug = cardSlug(episode)
        const playable = Boolean(episode.embed)
        const isActive = Boolean(activeSlug) && slug === activeSlug
        const href = slug ? `/watch/${slug}` : '#'

        const handleClick = (event) => {
          if (!playable) {
            event.preventDefault()
            return
          }
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          navigate(href)
        }

        return (
          <li key={episode.url || `${episode.number}-${index}`}>
            <a
              href={href}
              onClick={handleClick}
              aria-disabled={!playable}
              aria-current={isActive ? 'true' : undefined}
              className={`flex items-start gap-3 border-l-2 px-4 py-3.5 transition ${
                isActive
                  ? 'border-l-accent bg-accent/10'
                  : 'border-l-transparent hover:bg-white/[0.04]'
              } ${playable ? '' : 'pointer-events-none opacity-45'}`}
            >
              <span
                className={`mt-0.5 shrink-0 font-mono text-xs font-semibold tracking-wider ${
                  isActive ? 'text-accent' : 'text-slate-500'
                }`}
              >
                {episode.number === undefined || episode.number === null
                  ? String(index + 1).padStart(2, '0')
                  : String(episode.number).padStart(2, '0')}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm font-medium ${
                    isActive ? 'text-accent' : 'text-slate-200'
                  }`}
                >
                  {episode.title || `Episode ${episode.number ?? index + 1}`}
                </span>

                <span className="mt-1 flex flex-wrap items-center gap-2">
                  {episode.subtitle ? (
                    <span className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                      {episode.subtitle}
                    </span>
                  ) : null}
                  {!playable ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      <Lock size={11} strokeWidth={2.4} aria-hidden="true" />
                      Belum ada player
                    </span>
                  ) : null}
                </span>
              </span>

              {episode.release_date ? (
                <span className="mt-0.5 hidden shrink-0 items-center gap-1.5 text-[11px] text-slate-500 sm:inline-flex">
                  <CalendarDays size={12} strokeWidth={2} aria-hidden="true" />
                  {formatDate(episode.release_date)}
                </span>
              ) : null}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
