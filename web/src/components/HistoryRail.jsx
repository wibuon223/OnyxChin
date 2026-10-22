import { Clock3, Play, X } from 'lucide-react'
import { navigate } from '../hooks/useRoute'
import { removeHistory, relativeTime } from '../hooks/useHistory'

export function historyHref(item) {
  return item?.episodeSlug ? `/watch/${item.episodeSlug}` : '/'
}

export default function HistoryRail({ items = [], title = 'Lanjut nonton', compact = false }) {
  if (!items.length) return null

  return (
    <section className="space-y-4 cv-auto">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="display-2">{title}</h2>
          <p className="prose-muted mt-1 text-[12.5px]">
            Tersimpan di browser ini — lanjut dari episode terakhirmu.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="shrink-0 text-[12px] font-semibold text-slate-400 transition hover:text-accent"
        >
          Lihat semua
        </button>
      </div>

      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {items.map((item) => (
          <article
            key={item.animeSlug}
            className={`group relative shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-ink-850/70 ${
              compact ? 'w-[220px]' : 'w-[260px] sm:w-[300px]'
            }`}
          >
            <button
              type="button"
              onClick={() => navigate(historyHref(item))}
              className="block w-full text-left"
              aria-label={`Lanjut ${item.animeTitle} episode ${item.episodeNumber}`}
            >
              <span className="relative block aspect-[16/9] overflow-hidden bg-ink-800">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="h-full w-full scale-[1.02] object-cover opacity-80 transition duration-700 ease-silk group-hover:scale-[1.06] group-hover:opacity-100"
                  />
                ) : null}
                <span className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-3">
                  <span className="line-clamp-1 block text-[13.5px] font-bold text-white">
                    {item.animeTitle || item.animeSlug}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock3 size={11} strokeWidth={2.2} aria-hidden="true" />
                    Episode {item.episodeNumber || '—'}
                    {item.updatedAt ? <span className="text-slate-600">·</span> : null}
                    {item.updatedAt ? <span>{relativeTime(item.updatedAt)}</span> : null}
                  </span>
                </span>
                <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-ink-950/70 text-accent opacity-0 backdrop-blur-md transition duration-300 group-hover:opacity-100">
                  <Play size={13} strokeWidth={2.5} aria-hidden="true" />
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => removeHistory(item.animeSlug)}
              className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-ink-950/70 text-slate-400 opacity-0 backdrop-blur-md transition duration-300 hover:text-ember group-hover:opacity-100"
              aria-label={`Hapus riwayat ${item.animeTitle}`}
            >
              <X size={13} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
